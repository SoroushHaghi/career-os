import crypto from 'node:crypto';

function base64Url(value) {
  return Buffer.from(value, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function required(name) {
  const value = String(process.env[name] || '').trim();
  if (!value) throw new Error(name + ' is required.');
  return value;
}

const adminUrl = required('CAREER_OS_ADMIN_URL');
const secret = required('CAREER_OS_PROXY_SHARED_SECRET');
const action = String(process.env.CAREER_OS_ADMIN_ACTION || 'health').trim();

let params = {};
const rawParams = String(process.env.CAREER_OS_ADMIN_PARAMS_JSON || '').trim();
if (rawParams) params = JSON.parse(rawParams);

const payload = base64Url(
  JSON.stringify({
    action,
    params,
  }),
);

const ts = Math.floor(Date.now() / 1000);
const nonce = crypto.randomBytes(24).toString('base64url');
const canonical = ['career-os-staging-admin-v1', ts, nonce, payload].join('|');
const sig = crypto
  .createHmac('sha256', secret)
  .update(canonical, 'utf8')
  .digest('hex');

const response = await fetch(adminUrl, {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
  },
  body: JSON.stringify({
    ts,
    nonce,
    payload,
    sig,
  }),
  redirect: 'follow',
});

const text = await response.text();
let parsed;

try {
  parsed = JSON.parse(text);
} catch {
  throw new Error('Remote admin returned non-JSON response: ' + text.slice(0, 500));
}

if (!response.ok || !parsed || parsed.ok !== true) {
  throw new Error(
    'Remote admin request failed: HTTP ' +
      response.status +
      ' ' +
      JSON.stringify(parsed).slice(0, 1200),
  );
}

console.log(JSON.stringify(parsed, null, 2));

if (
  action === 'knowledgeCompile' &&
  parsed?.result?.result?.ok === false
) {
  const code = String(
    parsed.result.result.errorCode || 'KNOWLEDGE_COMPILER_FAILED'
  );
  const httpStatus = Number(
    parsed.result.result.providerHttpStatus || 0
  );
  throw new Error(
    'Knowledge Compiler acceptance failed: ' +
      code +
      (httpStatus ? ' provider_http=' + httpStatus : '')
  );
}
