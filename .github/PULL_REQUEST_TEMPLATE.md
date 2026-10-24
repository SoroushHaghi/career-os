## What changes in RULES.md
<one paragraph, plain language>

## Why (evidence)
Issues: #<n> (label `rules-change`) — where the problem was observed

## Checklist
- [ ] Version line bumped (major = memory repos or project instructions must change; minor = new rule; patch = wording/fix)
- [ ] `CHANGELOG.md` entry for that version (moved from `[Unreleased]`)
- [ ] Project instructions unchanged (or: major version + migration note)
- [ ] Tested in a real project — how:
- [ ] `RULES.md` stays short: what was removed or moved to a skill to make room?
- [ ] Second-agent review done by: <agent>
- [ ] `python3 tools/privacy_check.py` clean
