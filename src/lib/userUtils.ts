/**
 * User profile helpers for StudyBuddy
 */

export function getInitials(name?: string): string {
  if (!name || typeof name !== 'string') return 'SB';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'SB';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export function getFirstName(name?: string): string {
  if (!name || typeof name !== 'string') return '';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts.length > 0 ? parts[0] : '';
}
