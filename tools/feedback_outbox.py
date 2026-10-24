#!/usr/bin/env python3
"""Process a memory repo's feedback outbox (run by its GitHub Action).
For every OUTBOX/feedback/*.md: require front matter (title, kind, second_check), run privacy_check
(layer 3, blocking), then post to the framework repo's Issues and move the file to OUTBOX/sent/.
Blocked or invalid files stay where they are and are reported through a local issue.
Env: FRAMEWORK_REPO (owner/name), GH_TOKEN (can create issues there), LOCAL_TOKEN (this repo).
"""
import json, os, pathlib, re, subprocess, sys

HERE = pathlib.Path(__file__).resolve().parent
OUT, SENT = pathlib.Path("OUTBOX/feedback"), pathlib.Path("OUTBOX/sent")
DENY = pathlib.Path("SYSTEM/PRIVACY_DENYLIST.txt")

def front_matter(text):
    m = re.match(r"---\n(.*?)\n---\n(.*)", text, re.S)
    if not m:
        return None, text
    meta = dict(re.findall(r"^(\w+):\s*(.*)$", m.group(1), re.M))
    return meta, m.group(2).strip()

def gh(args, token, data=None):
    env = dict(os.environ, GH_TOKEN=token)
    r = subprocess.run(["gh", "api", *args], env=env, input=data, capture_output=True, text=True)
    return r.returncode, r.stdout.strip() or r.stderr.strip()

def local_issue(title, body):
    repo = os.environ["GITHUB_REPOSITORY"]
    gh([f"repos/{repo}/issues", "-f", f"title={title}", "-f", f"body={body}",
        "-f", "labels[]=type: system", "-f", "labels[]=kind: bug", "-f", "labels[]=scope: personal"],
       os.environ["LOCAL_TOKEN"])

def main():
    framework, token = os.environ.get("FRAMEWORK_REPO", ""), os.environ.get("GH_TOKEN", "")
    files = sorted(OUT.glob("*.md")) if OUT.exists() else []
    if not files:
        print("Outbox empty."); return 0
    SENT.mkdir(parents=True, exist_ok=True)
    moved = 0
    for f in files:
        meta, body = front_matter(f.read_text(encoding="utf-8"))
        problems = []
        if not meta or not meta.get("title") or meta.get("kind") not in ("bug", "idea"):
            problems.append("front matter needs title and kind: bug|idea")
        if meta and not meta.get("second_check"):
            problems.append("second_check is empty — layer 2 (independent review) missing")
        check = subprocess.run([sys.executable, str(HERE / "privacy_check.py"), "--denylist", str(DENY), str(f)],
                               capture_output=True, text=True)
        if check.returncode != 0:
            problems.append("privacy check blocked it:\n" + check.stdout)
        if problems:
            local_issue(f"Feedback not sent: {f.name}", "Layer check failed, nothing left this repo.\n\n" + "\n".join(problems))
            print(f"BLOCKED {f.name}"); continue
        if not framework or not token:
            print("No FRAMEWORK_REPO/CAREER_OS_TOKEN secret yet — file kept in the outbox."); return 0
        code, out = gh([f"repos/{framework}/issues", "-f", f"title={meta['title']}",
                        "-f", f"body={body}\n\n_Sent from a memory repo outbox; passed 3-layer privacy check._",
                        "-f", f"labels[]=kind: {meta['kind']}", "-f", "labels[]=scope: general", "-q", ".html_url"], token)
        if code != 0:
            print(f"POST FAILED {f.name}: {out}"); continue
        f.rename(SENT / f.name)
        with open(SENT / f.name, "a", encoding="utf-8") as h:
            h.write(f"\n\nPosted: {out}\n")
        moved += 1
        print(f"SENT {f.name} -> {out}")
    print(f"{moved} sent")
    return 0

if __name__ == "__main__":
    sys.exit(main())
