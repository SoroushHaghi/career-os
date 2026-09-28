const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.readonly";

function base64Url(bytes) {
  let binary = "";
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  for (let i = 0; i < view.length; i += 1) binary += String.fromCharCode(view[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlText(value) {
  return base64Url(new TextEncoder().encode(value));
}

function hexToBytes(hex) {
  const clean = String(hex || "").trim().toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(clean)) return null;
  const bytes = new Uint8Array(32);
  for (let i = 0; i < 32; i += 1) bytes[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  return bytes;
}

async function hmacHex(secret, value) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function timingSafeEqualHex(left, right) {
  const a = hexToBytes(left);
  const b = hexToBytes(right);
  if (!a || !b) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a[i] ^ b[i];
  return diff === 0;
}

function pemToArrayBuffer(pem) {
  const normalized = String(pem || "").replace(/\\n/g, "\n");
  const body = normalized
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s+/g, "");
  const binary = atob(body);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

let cachedGoogleToken = null;
let cachedGoogleTokenExpiresAt = 0;

async function getGoogleAccessToken(env) {
  if (cachedGoogleToken && cachedGoogleTokenExpiresAt > Date.now() + 60_000) {
    return cachedGoogleToken;
  }

  const email = String(env.GOOGLE_SERVICE_ACCOUNT_EMAIL || "").trim();
  const privateKey = String(env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || "").trim();

  if (!email || !privateKey) throw new Error("Google service-account configuration is incomplete.");

  const now = Math.floor(Date.now() / 1000);
  const header = base64UrlText(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64UrlText(
    JSON.stringify({
      iss: email,
      scope: GOOGLE_DRIVE_SCOPE,
      aud: GOOGLE_TOKEN_URL,
      iat: now,
      exp: now + 3600,
    }),
  );
  const signingInput = header + "." + payload;

  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(privateKey),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(signingInput),
  );

  const assertion = signingInput + "." + base64Url(signature);
  const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  if (!tokenResponse.ok) {
    throw new Error("Google token exchange failed: " + tokenResponse.status);
  }

  const tokenData = await tokenResponse.json();
  cachedGoogleToken = String(tokenData.access_token || "");
  cachedGoogleTokenExpiresAt = Date.now() + Number(tokenData.expires_in || 3600) * 1000;

  if (!cachedGoogleToken) throw new Error("Google token exchange returned no access token.");
  return cachedGoogleToken;
}

function mediaHeaders(source, fallbackMime) {
  const headers = new Headers();
  ["content-type", "content-length", "content-range", "accept-ranges", "etag", "last-modified"].forEach((name) => {
    const value = source.get(name);
    if (value) headers.set(name, value);
  });
  if (!headers.has("content-type")) headers.set("content-type", fallbackMime || "application/octet-stream");
  headers.set("cache-control", "private, no-store");
  return headers;
}

async function serveDriveMedia(request, env, fileId) {
  const url = new URL(request.url);
  const expires = Number(url.searchParams.get("expires") || 0);
  const signature = String(url.searchParams.get("sig") || "");
  const secret = String(env.CAREER_OS_PROXY_SHARED_SECRET || "");

  if (!secret || !expires || expires < Math.floor(Date.now() / 1000)) {
    return new Response("Expired or invalid lease.", { status: 401 });
  }

  const expected = await hmacHex(secret, fileId + "." + String(expires));
  if (!timingSafeEqualHex(signature, expected)) {
    return new Response("Invalid signature.", { status: 401 });
  }

  const accessToken = await getGoogleAccessToken(env);
  const driveUrl =
    "https://www.googleapis.com/drive/v3/files/" +
    encodeURIComponent(fileId) +
    "?alt=media&supportsAllDrives=true";

  const headers = new Headers({ Authorization: "Bearer " + accessToken });
  const range = request.headers.get("range");
  if (range) headers.set("range", range);

  const driveResponse = await fetch(driveUrl, {
    method: request.method,
    headers,
    redirect: "follow",
  });

  if (!driveResponse.ok && driveResponse.status !== 206) {
    return new Response("Drive media fetch failed.", { status: driveResponse.status });
  }

  return new Response(request.method === "HEAD" ? null : driveResponse.body, {
    status: driveResponse.status,
    headers: mediaHeaders(driveResponse.headers),
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/health") {
      return Response.json({ ok: true, service: "career-os-audio-proxy" });
    }

    const match = url.pathname.match(/^\/v1\/media\/([^/]+)$/);
    if (match && (request.method === "GET" || request.method === "HEAD")) {
      try {
        return await serveDriveMedia(request, env, decodeURIComponent(match[1]));
      } catch (error) {
        return new Response("Proxy error: " + String(error && error.message || error), { status: 500 });
      }
    }

    return new Response("Not found.", { status: 404 });
  },
};
