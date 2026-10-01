import test from 'node:test';
import assert from 'node:assert/strict';
import { isAllowedPublicEmail } from '../scripts/privacy-email-policy.mjs';

const email = (local, domain) => [local, domain].join('@');

test('privacy email policy allows only synthetic or GitHub noreply identities', () => {
  assert.equal(isAllowedPublicEmail(email('bot', 'example.com')), true);
  assert.equal(
    isAllowedPublicEmail(email('12345+public-handle', 'users.noreply.github.com')),
    true
  );
  assert.equal(
    isAllowedPublicEmail(email('automation', 'users.noreply.github.com')),
    true
  );

  assert.equal(isAllowedPublicEmail(email('person', 'gmail.com')), false);
  assert.equal(isAllowedPublicEmail(email('person', 'company.de')), false);
  assert.equal(isAllowedPublicEmail(''), false);
});
