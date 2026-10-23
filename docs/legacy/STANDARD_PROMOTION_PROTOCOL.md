# Career OS Standard Promotion Protocol

Status: ACTIVE / v1
Updated: 2026-10-01

## Purpose

Career OS must not leave successful operating patterns trapped inside individual chats.

When a task session discovers a repeatable rule through user corrections, approved artifacts, repeated successful outputs, QA failures, or explicit preferences, that rule becomes a **standard candidate**. The system must classify and promote it to one canonical owner instead of relying on the chat to remember it.

This protocol applies across domains: CV/cover letters, applications, public profiles, learning artifacts, project workflows, system operations, and future recurring work.

## Principle

A chat may discover a standard, but a chat is never the standard's canonical home.

The user should be able to open a new chat and ask for the same class of work without restating the accumulated workflow.

## Standard-candidate triggers

Treat an item as a candidate when one or more are true:

- the user explicitly says this is the preferred/default way to do the task;
- the user corrects the same kind of output more than once;
- an artifact is explicitly approved and reveals a repeatable structure/QA rule;
- a recurring workflow succeeds and should be reused;
- a failure exposes a durable anti-rule or required QA gate;
- multiple prior outputs converge on the same pattern;
- the user asks to preserve what the system has learned from previous iterations.

One-off content choices remain task-local unless there is evidence that they should recur.

## Promotion flow

```text
task/chat output
    ->
detect standard candidate
    ->
collect supporting examples / corrections
    ->
separate rule from task-specific content
    ->
classify scope and owner
    ->
compare against existing canonical standard
    ->
merge only the durable delta
    ->
record unresolved conflicts
    ->
future tasks load the canonical standard automatically
```

## Scope classification

### Reusable generic rule

A rule that should apply to any Career OS installation or user.

Owner:
- `career-os/docs/<DOMAIN>_STANDARD.md`, or
- another existing reusable framework document if it already owns the rule.

Examples:
- application QA stages;
- evidence-grounding rules;
- versioning conventions;
- source/knowledge boundaries.

### User-specific durable preference

A stable preference that should follow this user across future tasks but should not be public framework policy.

Owner:
- the relevant private `career-memory` module/profile/workspace.

Examples:
- preferred CV visual hierarchy;
- preferred cover-letter tone;
- default section order;
- persistent output-format preference.

### Canonical fact/evidence

A claim about the user's education, experience, skills, projects, evidence state, or opportunity history.

Owner:
- the corresponding canonical `career-memory/MODULES/...` record.

Never store candidate truth inside a style/standard file.

### Task-specific decision

A choice that applies only to one company, role, course, or artifact.

Owner:
- the relevant private workspace/application/session.

Do not promote it to a global standard unless later evidence shows it recurs.

### Raw/source artifact

The actual CV, cover letter, transcript, PDF, image, audio, or other source file.

Owner:
- approved private/source storage according to the storage policy.

Do not copy private raw artifacts into the public framework merely to prove a standard.

## Existing-standard rule

Before creating a new standard file:

1. search for an existing canonical standard for that domain;
2. update it incrementally if its ownership already covers the candidate;
3. preserve prior valid rules unless there is an explicit reason to supersede them;
4. record a conflict instead of creating a parallel competing standard.

Create a new standard file only when:
- no existing owner fits;
- the pattern is recurring enough to justify a durable contract; and
- a clear owner and read path can be defined.

## Evidence requirement

A promoted standard should record enough provenance to explain why it exists without copying private source content.

Acceptable support:
- user-confirmed rule;
- approved artifact/version reference;
- repeated correction pattern;
- QA failure and repair;
- source-safe summary of prior examples.

Do not promote a model's preference merely because it sounds reasonable.

## Application-document routing

For CV and cover-letter work, use this ownership split:

- reusable application/document rules -> `career-os/docs/APPLICATION_STANDARD.md`;
- user-specific CV presentation/QA preferences -> `career-memory/CV/CV_RENDERING_PROFILE.md`;
- approved editable CV representation -> `career-memory/CV/CV_CONTENT.md`;
- user-specific cover-letter preferences -> `career-memory/CV/COVER_LETTER_PROFILE.md` when such preferences are first established;
- underlying candidate truth -> `career-memory/MODULES/CAREER/`;
- opportunity-specific choices/output -> the selected application workspace;
- final private DOCX/PDF artifacts -> approved private/publication storage.

A historical CV or cover letter may be evidence for a presentation pattern, but it is not automatically candidate truth.

## Session closeout behavior

During the normal Session Harvest closeout:

1. ask internally whether this session revealed a repeatable standard;
2. if no, continue normal closeout;
3. if yes, classify it using this protocol;
4. compare it with the existing canonical owner;
5. persist only the durable delta;
6. future sessions should read the canonical standard rather than reconstructing it from old chats.

This should normally happen silently. The user should not have to say "save this rule."

## Retrospective recovery

Older chats may contain useful standards that predate this protocol.

When recovering them:
- request an evidence-oriented **Standard Discovery Packet** rather than a free-form summary;
- extract approved patterns, repeated corrections, rejected patterns, QA rules, examples, and unresolved conflicts;
- treat the packet as evidence for promotion, not as the new canonical standard by itself;
- merge validated deltas into the correct owners.

Use `templates/STANDARD_DISCOVERY_PACKET.md` for this recovery process.
