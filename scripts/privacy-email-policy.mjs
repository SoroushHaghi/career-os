export function isAllowedPublicEmail(value) {
  const email = String(value ?? '').trim().toLowerCase();
  if (!email) return false;

  return (
    /@(example\.(?:com|org|net)|localhost)$/.test(email) ||
    /@users\.noreply\.github\.com$/.test(email)
  );
}
