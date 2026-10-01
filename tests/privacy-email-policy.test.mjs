import test from 'node:test';
import assert from 'node:assert/strict';
import { isAllowedPublicEmail } from '../scripts/privacy-email-policy.mjs';

test('privacy email policy allows only synthetic or GitHub noreply identities', () => {
  assert.equal(isAllowedPublicEmail('bot@example.com'), true);
  assert.equal(isAllowedPublicEmail('12345+public-handle@users.noreply.github.com'), true);
  assert.equal(isAllowedPublicEmail('automation@users.noreply.github.com'), true);

  assert.equal(isAllowedPublicEmail('person@gmail.com'), false);
  assert.equal(isAllowedPublicEmail('person@company.de'), false);
  assert.equal(isAllowedPublicEmail(''), false);
});
