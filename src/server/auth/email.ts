const STRICT_EMAIL_PATTERN =
  /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@(?=.{4,255}$)(?:(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)\.)+[A-Za-z]{2,63}$/;

export function normalizeEmailAddress(email: string) {
  return email.trim().toLowerCase();
}

export function isValidEmailAddress(email: string) {
  const normalized = normalizeEmailAddress(email);

  if (!STRICT_EMAIL_PATTERN.test(normalized)) {
    return false;
  }

  const [, domain = ''] = normalized.split('@');
  const hostname = domain.replace(/\.[A-Za-z]{2,63}$/, '');

  return /[A-Za-z]/.test(hostname);
}
