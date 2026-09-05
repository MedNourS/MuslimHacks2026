const PHONE_REGEX = /^\+?[1-9]\d{7,14}$/;

export function normalizePhoneNumber(raw: string): string {
  return raw.replace(/[^\d+]/g, "");
}

export function isValidPhoneNumber(raw: string): boolean {
  return PHONE_REGEX.test(normalizePhoneNumber(raw));
}
