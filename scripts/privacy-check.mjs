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

const secretPatterns = [
  { name: 'Google API key', re: /AIza[0-9A-Za-z_-]{30,}/g },
  { name: 'OpenAI-style secret', re: /\bsk-[A-Za-z0-9_-]{20,}\b/g },
  { name: 'GitHub token', re: /\bgh[pousr]_[A-Za-z0-9]{30,}\b/g },
  { name: 'Private key material', re: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g },
  { name: 'Windows user path', re: /[A-Za-z]:\\Users\\[^\\\s]+\\/g },
];

const allowedPathExceptions = new Set(['.env.example']);
const errors = [];

for (const file of files) {
  if (!allowedPathExceptions.has(file)) {
    for (const re of forbiddenPathPatterns) {
      if (re.test(file)) errors.push(`forbidden tracked path: ${file}`);
    }
  }

  let content;
  try { content = readFileSync(file, 'utf8'); } catch { continue; }

  for (const { name, re } of secretPatterns) {
    re.lastIndex = 0;
    if (re.test(content)) errors.push(`${name} pattern in ${file}`);
  }
}

if (errors.length) {
  console.error('PUBLIC TREE PRIVACY CHECK FAILED');
  for (const err of [...new Set(errors)]) console.error(`- ${err}`);
  process.exit(1);
}

console.log(`PUBLIC TREE PRIVACY CHECK OK (${files.length} tracked files scanned)`);
