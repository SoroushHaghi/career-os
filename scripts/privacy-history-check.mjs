import { isAllowedPublicEmail } from './privacy-email-policy.mjs';
import { execFileSync } from 'node:child_process';

const log = execFileSync(
  'git',
  ['log', '--all', '--format=commit:%H', '-p', '--no-ext-diff', '--no-color'],
  { encoding: 'utf8', maxBuffer: 128 * 1024 * 1024 }
);

const forbiddenPathPatterns = [
  /(^|\/)(?:private|runtime-state|private-artifacts|transcripts|sources|data|local)(\/|$)/i,
  /\.(?:pdf|docx?|xlsx?|pptx?|zip|7z|rar|sqlite|db|pem|key|p12|pfx)$/i,
];

const contentPatterns = [
  { name: 'Google API key', re: /AIza[0-9A-Za-z_-]{30,}/g },
  { name: 'OpenAI-style secret', re: /\bsk-[A-Za-z0-9_-]{20,}\b/g },
  { name: 'GitHub token', re: /\bgh[pousr]_[A-Za-z0-9]{30,}\b/g },
  { name: 'Windows user path', re: /[A-Za-z]:\\Users\\[^\\\s]+\\/g },
  { name: 'macOS user path', re: /\/Users\/[^/\s]+\//g },
  { name: 'Linux user home path', re: /\/home\/(?!runner(?:\/|$))[^/\s]+\//g },
  { name: 'Google Drive/Docs URL', re: /https?:\/\/(?:drive|docs)\.google\.com\/[^\s)>"']+/gi },
  { name: 'International phone number', re: /\+\d(?:[\s().-]*\d){7,14}\b/g },
  {
    name: 'Email address',
    re: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
    allow(match) {
      return isAllowedPublicEmail(match);
    },
  },
];

const errors = [];
let commit = 'unknown';

function scan(value, location) {
  for (const { name, re, allow } of contentPatterns) {
    re.lastIndex = 0;
    for (const match of value.matchAll(re)) {
      if (allow?.(match[0])) continue;
      errors.push(`${name} in ${location}`);
    }
  }
}

for (const line of log.split(/\r?\n/)) {
  if (line.startsWith('commit:')) {
    commit = line.slice('commit:'.length).trim() || 'unknown';
    continue;
  }

  if (line.startsWith('diff --git ')) {
    const paths = [...line.matchAll(/ [ab]\/([^ ]+)/g)].map((m) => m[1]);
    for (const path of paths) {
      for (const re of forbiddenPathPatterns) {
        if (re.test(path)) errors.push(`forbidden historical path ${path} @ ${commit}`);
      }
    }
    continue;
  }

  if ((line.startsWith('+') || line.startsWith('-')) &&
      !line.startsWith('+++') &&
      !line.startsWith('---')) {
    const changed = line.slice(1);
    // A PEM delimiter used as a quoted parser constant is not key material.
    // A real PEM block begins with the delimiter as the changed line itself.
    if (/^-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----\s*$/.test(changed)) {
      errors.push(`Private key material in history @ ${commit}`);
    }
    scan(changed, `history @ ${commit}`);
  }
}

const unique = [...new Set(errors)];
if (unique.length) {
  console.error('PUBLIC HISTORY PRIVACY AUDIT FAILED');
  for (const err of unique.slice(0, 200)) console.error(`- ${err}`);
  if (unique.length > 200) {
    console.error(`- ... ${unique.length - 200} additional findings omitted`);
  }
  process.exit(1);
}

console.log('PUBLIC HISTORY PRIVACY AUDIT OK');
