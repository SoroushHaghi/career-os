#!/usr/bin/env python3
"""Career OS privacy check — one script for every boundary where text leaves a private place
(memory repo -> workshop, workshop -> public repo). Exit 0 = clean, 1 = personal data found, 2 = usage error.

Usage:  privacy_check.py [--denylist FILE] PATH_OR_FILE [...]
        privacy_check.py [--denylist FILE] -            (read text from stdin)
Denylist file (private, lives in the user's memory repo): one term per line, case-insensitive;
'#' starts a comment; a line starting with '!' is an allowed term that is ignored (e.g. a public handle).
Environment variable PRIVACY_DENYLIST may hold the same content instead of a file.
"""
import os, pathlib, re, sys

PATTERNS = [
    ("email address", re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}\b")),
    ("phone number", re.compile(r"(?<![\w.])(?:\+|00|0)\d[\d \t/()-]{7,}\d(?![\w.])")),
    ("Google Drive/Docs link", re.compile(r"(?:drive|docs)\.google\.com/\S+", re.I)),
    ("file/document ID", re.compile(r"(?<![\w/-])(?=[A-Za-z0-9_-]{25,44}(?![\w-]))(?=[^\s]*[A-Z])(?=[^\s]*[a-z])(?=[^\s]*\d)[A-Za-z0-9_-]{25,44}(?![\w-])")),
    ("IBAN", re.compile(r"\b[A-Z]{2}\d{2}(?: ?[A-Z0-9]{4}){3,7}\b")),
    ("secret/token", re.compile(r"ghp_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}|AIza[0-9A-Za-z_\-]{30,}|sk-[A-Za-z0-9]{32,}|-----BEGIN [A-Z ]*PRIVATE KEY-----")),
]
TEXT_SUFFIXES = {".md", ".txt", ".yml", ".yaml", ".json", ".jsonl", ".py", ".csv", ".html", ".toml", ""}

def load_terms(path):
    raw = os.environ.get("PRIVACY_DENYLIST", "")
    if path:
        raw += "\n" + pathlib.Path(path).read_text(encoding="utf-8")
    deny, allow = [], []
    for line in raw.splitlines():
        line = line.split("#", 1)[0].strip()
        if not line:
            continue
        (allow if line.startswith("!") else deny).append(line.lstrip("!").strip())
    return deny, allow

def scan(name, text, deny, allow):
    hits = []
    for term in allow:
        text = re.sub(re.escape(term), " ", text, flags=re.I)
    for no, line in enumerate(text.splitlines(), 1):
        for label, rx in PATTERNS:
            m = rx.search(line)
            if m and not (label == "phone number" and len(re.sub(r"\D", "", m.group(0))) < 9):
                hits.append((name, no, label, m.group(0)))
        for term in deny:
            if re.search(r"(?<!\w)" + re.escape(term) + r"(?!\w)", line, re.I):
                hits.append((name, no, "denylisted term", term))
    return hits

def main(argv):
    deny_file = None
    if argv[:1] == ["--denylist"]:
        if len(argv) < 2:
            print("usage error"); return 2
        deny_file, argv = argv[1], argv[2:]
    if not argv:
        print(__doc__); return 2
    deny, allow = load_terms(deny_file)
    hits = []
    for arg in argv:
        if arg == "-":
            hits += scan("<stdin>", sys.stdin.read(), deny, allow); continue
        p = pathlib.Path(arg)
        files = [f for f in p.rglob("*") if f.is_file() and ".git" not in f.parts] if p.is_dir() else [p]
        for f in files:
            if f.suffix.lower() in TEXT_SUFFIXES:
                hits += scan(str(f), f.read_text(encoding="utf-8", errors="ignore"), deny, allow)
    for name, no, label, value in hits:
        shown = value if label == "denylisted term" else value[:4] + "…"
        print(f"BLOCK {name}:{no}: {label} ({shown})")
    print(f"{len(hits)} finding(s)")
    return 1 if hits else 0

if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
