const DEFAULT_TTL_SECONDS = 15 * 60;
const MAX_TTL_SECONDS = 30 * 60;

function json(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function bearerToken(request) {
  const header = String(request.headers.get("Authorization") || "");
  return header.startsWith("Bearer ") ? header.slice(7).trim() : "";
}

function mediaHeaders(source, fallbackMime, fileName) {
  const headers = new Headers();

  [
    "content-type",
    "content-length",
    "content-range",
    "accept-ranges",
    "etag",
    "last-modified",
  ].forEach((name) => {
    const value = source.get(name);
    if (value) headers.set(name, value);
  });

  if (!headers.has("content-type")) {
    headers.set("content-type", fallbackMime || "application/octet-stream");
  }

  if (fileName) {
    headers.set(
      "content-disposition",
      'inline; filename="' + String(fileName).replace(/"/g, "") + '"',
    );
  }

  headers.set("cache-control", "private, no-store");
  return headers;
}

export class AudioLease {
  constructor(ctx) {
    this.ctx = ctx;
  }

  async alarm() {
    await this.ctx.storage.deleteAll();
  }

  async fetch(request) {
    const url = new URL(request.url);

    if (request.method === "PUT" && url.pathname === "/lease") {
      const lease = await request.json();
      await this.ctx.storage.put("lease", lease);
      await this.ctx.storage.setAlarm(Number(lease.expiresAt));
      return json({ ok: true });
    }

    if (
      (request.method === "GET" || request.method === "HEAD") &&
      url.pathname === "/media"
    ) {
      const lease = await this.ctx.storage.get("lease");

      if (!lease) return new Response("Lease not found.", { status: 404 });

      if (Number(lease.expiresAt || 0) <= Date.now()) {
        await this.ctx.storage.deleteAll();
        return new Response("Lease expired.", { status: 410 });
      }

      const accessToken = String(lease.accessToken || "").trim();
      if (!accessToken) {
        await this.ctx.storage.deleteAll();
        return new Response("Lease credential missing.", { status: 410 });
      }

      const driveUrl =
        "https://www.googleapis.com/drive/v3/files/" +
        encodeURIComponent(String(lease.fileId)) +
        "?alt=media&supportsAllDrives=true";

      const headers = new Headers({
        Authorization: "Bearer " + accessToken,
      });

      const range = request.headers.get("Range");
      if (range) headers.set("Range", range);

      const driveResponse = await fetch(driveUrl, {
        method: request.method,
        headers,
        redirect: "follow",
      });

      if (!driveResponse.ok && driveResponse.status !== 206) {
        return new Response("Drive media fetch failed.", {
          status: driveResponse.status,
          headers: { "Cache-Control": "no-store" },
        });
      }

      return new Response(
        request.method === "HEAD" ? null : driveResponse.body,
        {
          status: driveResponse.status,
          headers: mediaHeaders(
            driveResponse.headers,
            String(lease.mimeType || ""),
            String(lease.fileName || ""),
          ),
        },
      );
    }

    return new Response("Not found.", { status: 404 });
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/health") {
      return json({ ok: true, service: "career-os-audio-proxy" });
    }

    if (request.method === "POST" && url.pathname === "/v1/lease") {
      const expected = String(env.CAREER_OS_PROXY_SHARED_SECRET || "");
      const supplied = bearerToken(request);

      if (!expected || supplied !== expected) {
        return json({ ok: false, error: "unauthorized" }, 401);
      }

      let body;
      try {
        body = await request.json();
      } catch {
        return json({ ok: false, error: "invalid_json" }, 400);
      }

      const fileId = String(body && body.fileId || "").trim();
      const accessToken = String(body && body.accessToken || "").trim();
      const mimeType = String(body && body.mimeType || "application/octet-stream").trim();
      const fileName = String(body && body.fileName || "audio").trim();
      const requestedTtl = Number(body && body.ttlSeconds || DEFAULT_TTL_SECONDS);
      const ttlSeconds = Math.min(
        MAX_TTL_SECONDS,
        Math.max(60, Number.isFinite(requestedTtl) ? requestedTtl : DEFAULT_TTL_SECONDS),
      );

      if (!fileId) {
        return json({ ok: false, error: "file_id_required" }, 400);
      }

      if (!accessToken) {
        return json({ ok: false, error: "drive_access_token_required" }, 400);
      }

      const leaseId = crypto.randomUUID().replace(/-/g, "");
      const expiresAt = Date.now() + ttlSeconds * 1000;
      const id = env.AUDIO_LEASES.idFromName(leaseId);
      const stub = env.AUDIO_LEASES.get(id);

      await stub.fetch("https://lease.internal/lease", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileId,
          accessToken,
          mimeType,
          fileName,
          expiresAt,
        }),
      });

      return json({
        ok: true,
        mediaUrl: url.origin + "/v1/media/" + leaseId,
        expiresAt,
      });
    }

    const match = url.pathname.match(/^\/v1\/media\/([a-f0-9]{32})$/i);
    if (
      match &&
      (request.method === "GET" || request.method === "HEAD")
    ) {
      const id = env.AUDIO_LEASES.idFromName(match[1].toLowerCase());
      const stub = env.AUDIO_LEASES.get(id);
      const headers = new Headers();
      const range = request.headers.get("Range");
      if (range) headers.set("Range", range);

      return stub.fetch("https://lease.internal/media", {
        method: request.method,
        headers,
      });
    }

    return new Response("Not found.", { status: 404 });
  },
};
