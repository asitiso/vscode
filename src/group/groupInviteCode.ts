export function extractGroupInviteCode(value: string): string | null {
  const trimmed = value.trim();
  if (/^[A-Z0-9]{6}$/i.test(trimmed)) return trimmed.toUpperCase();

  const match = trimmed.match(/초대코드\s*:\s*([A-Z0-9]{6})(?![A-Z0-9])/i);
  return match ? match[1].toUpperCase() : null;
}
