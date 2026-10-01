# 10 — UI Projections and Monitoring Surfaces

Status: APPROVED
Updated: 2026-09-27

## Goal

Define a small set of user-facing views that project Career OS state without becoming canonical storage.

UI is a read/write surface over contracts. It does not own truth.

## 1. UI categories

Career OS has two fundamentally different graph/dashboard needs:

```text
Knowledge View
  -> what do I know?
  -> how are concepts/sources/evidence related?

Operations View
  -> what is running?
  -> what failed?
  -> what is stale/pending?
```

Do not merge them into one overloaded graph.

## 2. Public development monitor

The current GitHub Pages monitor remains a lightweight public-safe surface.

It may show:
- vNext design stages;
- commit/branch state;
- CI/test status;
- deployment/build version;
- public-safe component readiness.

It must not fetch `career-memory` or private Drive data client-side.

## 3. Private operations dashboard

Future private view may show:
- processing queues;
- retry waits;
- failed jobs;
- source/context status;
- provider cooldown/quota state;
- last successful processing;
- artifact readiness;
- deployed runtime version.

This view requires an authenticated/private data source before it is enabled.

No private detail should be tunneled through a public GitHub Pages page.

## 4. Knowledge graph projection

Knowledge visualization can project:
- courses/projects;
- modules/sessions;
- concepts;
- evidence;
- prerequisites;
- skills;
- learner-state links.

Obsidian remains an optional local/private projection.

Generated graph files are rebuildable and not canonical storage.

## 5. Obsidian role

Obsidian may receive generated Markdown/YAML/internal links for human exploration.

It must not become a required runtime dependency.

Career OS should work if Obsidian is absent.

## 6. Future Career OS Studio

A custom browser UI may later unify:
- operations status;
- knowledge graph;
- source/context explorer;
- configuration editing for non-secret settings;
- promotion/review queues.

If built, its source code lives in `career-os`.

The UI reads stable APIs/read models rather than direct provider SDKs.

## 7. Configuration UI

Non-secret configuration may eventually be edited through a UI, but changes should map back to version-controlled/public schemas or private config records.

Do not create hidden settings that exist only in browser local storage.

## 8. Review queues

UI should surface only exceptions that need human attention:
- privacy ambiguity;
- low-confidence context resolution;
- unresolved source conflicts;
- failed-final jobs;
- promotion decisions requiring review.

Normal sources should not require manual sorting.

## 9. Mobile/browser requirement

Primary monitoring surfaces should be responsive and usable from phone/tablet/desktop.

Public development monitor requires only a browser.

Private operational views should also avoid requiring a local always-on machine where possible.

## 10. Privacy labels

Every view should make data class explicit when useful:

```text
PUBLIC_SYSTEM
PRIVATE_OPERATIONAL
PRIVATE_PERSONAL
SOURCE_EVIDENCE
INFERRED
```

This helps prevent accidental publication.

## 11. Public/private build separation

Public UI builds must use only public fixtures/public-safe endpoints.

Private UI builds may use authenticated/private backends.

A build-time or CI privacy check should reject known private fixture paths or secret patterns from public bundles.

## 12. URL strategy

Current public monitor:

```text
https://soroushhaghi.github.io/career-os/monitor/
```

Future UI routes should remain stable where practical.

## Stage 10 decision gate

Approve or change:
1. separate knowledge and operations views;
2. keep public monitor public-safe;
3. private operational details require authenticated/private source;
4. Obsidian is optional projection only;
5. future custom UI source lives in career-os;
6. normal flows remain automatic, review UI handles exceptions.

After approval, Stage 11 defines tests, CI/CD, migration and release gates.