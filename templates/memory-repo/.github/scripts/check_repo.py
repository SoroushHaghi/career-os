#!/usr/bin/env python3
"""Career OS repository checks. Run: python3 .github/scripts/check_repo.py
Fails (exit 1) on secrets and personal contact data (private-mail domains, German mobile
numbers); warns on oversized state files."""
import pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
SKIP = {".git", "ARCHIVE"}
STATE_LIMIT = 6000  # bytes; target is ~4 KB (one page)

SECRET = [
    (re.compile(r"ghp_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}"), "GitHub token"),
    (re.compile(r"AIza[0-9A-Za-z_\-]{30,}"), "Google API key"),
    (re.compile(r"sk-[A-Za-z0-9]{32,}|gsk_[A-Za-z0-9]{30,}"), "API key"),
    (re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY-----"), "private key"),
]
# Personal contact data only. Public employer contacts (jobs@company, office numbers) are allowed.
EMAIL = re.compile(r"\b[A-Za-z0-9._%+-]+@(gmail|googlemail|outlook|hotmail|live|icloud|yahoo|gmx|web)\.[a-z.]{2,6}\b", re.I)
PHONE = re.compile(r"(?<!\d)(\+49|0049|0)\s?1[5-7]\d[\s\d/-]{6,}\d")  # German mobile numbers

def files():
    for p in ROOT.rglob("*"):
        if p.is_file() and not (SKIP & set(p.relative_to(ROOT).parts)) and p.suffix in {".md", ".csv", ".json", ".yaml", ".yml", ".jsonl", ".txt"}:
            yield p

errors, warnings = [], []
for p in files():
    rel = p.relative_to(ROOT)
    text = p.read_text(errors="ignore")
    for rx, name in SECRET:
        if rx.search(text):
            errors.append(f"{rel}: looks like a {name}")
    for rx, name in ((EMAIL, "email address"), (PHONE, "phone number")):
        m = rx.search(text)
        if m and ".github" not in rel.parts:
            errors.append(f"{rel}: contains a {name} ({m.group(0)[:4]}…)")
    if p.name == "CURRENT_STATE.md" and p.stat().st_size > STATE_LIMIT:
        warnings.append(f"{rel}: {p.stat().st_size // 1024} KB (limit {STATE_LIMIT // 1000} KB) — slim it, move history to SESSIONS/")

for w in warnings: print("WARN ", w)
for e in errors: print("ERROR", e)
print(f"{len(errors)} error(s), {len(warnings)} warning(s)")
sys.exit(1 if errors else 0)
