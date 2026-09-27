import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const pdf = readFileSync(
  'apps/apps-script-runtime/src/modules/50_processors/30_pdf_processor.gs',
  'utf8'
);
const adapter = readFileSync(
  'apps/apps-script-runtime/src/modules/60_providers/30_document_adapter.gs',
  'utf8'
);

test('PDF provider fallback is routed through the vNext document adapter', () => {
  assert.equal(pdf.includes('careerOsVnextDocumentExtract_('), true);
  assert.equal(adapter.includes('callGeminiDocument_('), true);
});

test('PDF deterministic Drive extraction remains first', () => {
  const driveIndex = pdf.indexOf('extractPdfTextViaDriveImport_(');
  const providerIndex = pdf.indexOf('extractPdfTextViaGemini_(');
  assert.equal(driveIndex >= 0, true);
  assert.equal(providerIndex > driveIndex, true);
});
