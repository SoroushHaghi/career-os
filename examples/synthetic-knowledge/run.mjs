import {
  consolidateCourseKnowledge,
} from '../../packages/knowledge/src/cross-session.mjs';
import {
  renderCourseKnowledgeMarkdown,
} from '../../packages/knowledge/src/course-renderer.mjs';

const sessions = [
  {
    sessionId: 'session-01',
    synthesisVersion: 'v1',
    synthesis: {
      title: 'Session 01',
      topicBlocks: [
        {
          title: 'Content identity',
          conceptKey: 'content identity',
          explanation: 'A stable source identifier and a content version are separate concepts.',
          definitions: [
            'Source identity answers which source object is being referenced.',
            'Content version answers which observed content state is being processed.',
          ],
          evidenceRefs: ['evidence-01'],
          uncertainties: [],
        },
      ],
      uncertainties: [],
      conflicts: [],
      unresolvedQuestions: [],
      coverage: { summary: 'Synthetic example source.' },
    },
    evidence: [
      {
        evidenceId: 'evidence-01',
        sourceVersionKey: 'synthetic:source-01@v1',
        modality: 'text',
      },
    ],
    verificationStatus: 'UNVERIFIED',
  },
  {
    sessionId: 'session-02',
    synthesisVersion: 'v1',
    synthesis: {
      title: 'Session 02',
      topicBlocks: [
        {
          title: 'Content identity',
          conceptKey: 'content identity',
          explanation: 'Source identity remains stable while content versions may change over time.',
          definitions: [
            'Source identity answers which source object is being referenced.',
          ],
          examples: [
            'A source can keep the same identity while a new fingerprint creates a new content version.',
          ],
          evidenceRefs: ['evidence-02'],
          uncertainties: [
            'The synthetic example does not define a provider-specific fingerprint algorithm.',
          ],
        },
      ],
      uncertainties: [],
      conflicts: [],
      unresolvedQuestions: [],
      coverage: { summary: 'Second synthetic example source.' },
    },
    evidence: [
      {
        evidenceId: 'evidence-02',
        sourceVersionKey: 'synthetic:source-01@v2',
        modality: 'text',
      },
    ],
    verificationStatus: 'UNVERIFIED',
  },
];

const course = consolidateCourseKnowledge({
  course: {
    courseId: 'synthetic-demo',
    title: 'Synthetic Knowledge Consolidation Demo',
  },
  sessions,
});

process.stdout.write(renderCourseKnowledgeMarkdown(course));
