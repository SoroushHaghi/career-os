export function createRuntimeVersion({
  gitSha,
  buildVersion,
  schemaVersion,
  processingProfiles = {},
}) {
  const sha = String(gitSha ?? '').trim();
  if (!/^[0-9a-f]{7,40}$/i.test(sha)) throw new TypeError('gitSha must be a Git commit id');
  if (!buildVersion) throw new TypeError('buildVersion is required');
  if (!schemaVersion) throw new TypeError('schemaVersion is required');

  return Object.freeze({
    gitSha: sha,
    buildVersion: String(buildVersion),
    schemaVersion: String(schemaVersion),
    processingProfiles: Object.freeze({ ...processingProfiles }),
  });
}
