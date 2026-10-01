import { isAllowedPublicEmail } from './privacy-email-policy.mjs';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const files = execFileSync('git', ['ls-files'], { encoding: 'utf8' })
  .split(/\r?\n/)
  .filter(Boolean);

const forbiddenPathPatterns = [
  /(^|\/)\.env(?:\.|$)(?!example$)/i,
  /(^|\/)(private|runtime-state|private-artifacts|transcripts|sources|data|local)(\/|$)/i,
  /\.(?:pdf|docx?|xlsx?|pptx?|zip|7z|rar|sqlite|db|pem|key|p12|pfx)$/i,
];

const contentPatterns = [
  { name: 'Google API key', re: /AIza[0-9A-Za-z_-]{30,}/g },
  { name: 'OpenAI-style secret', re: /\bsk-[A-Za-z0-9_-]{20,}\b/g },
  { name: 'GitHub token', re: /\bgh[pousr]_[A-Za-z0-9]{30,}\b/g },
  { name: 'Private key material', re: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g },
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

const allowedPathExceptions = new Set(['.env.example']);
const errors = [];

function scanContent(content, location) {
  for (const { name, re, allow } of contentPatterns) {
    re.lastIndex = 0;
    for (const match of content.matchAll(re)) {
      const value = match[0];
      if (allow?.(value)) continue;
      errors.push(`${name} pattern in ${location}`);
    }
  }
}

for (const file of files) {
  if (!allowedPathExceptions.has(file)) {
    for (const re of forbiddenPathPatterns) {
      if (re.test(file)) errors.push(`forbidden tracked path: ${file}`);
    }
  }

  let fileContent;
  try {
    fileContent = readFileSync(file, 'utf8');
  } catch {
    continue;
  }

  scanContent(fileContent, file);
}

if (errors.length) {
  console.error('PUBLIC TREE PRIVACY CHECK FAILED');
  for (const err of [...new Set(errors)]) console.error(`- ${err}`);
  process.exit(1);
}

console.log(`PUBLIC TREE PRIVACY CHECK OK (${files.length} tracked files scanned)`);
