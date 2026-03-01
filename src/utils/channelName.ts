const LOCK_EMOJI = '🔒';

export function sanitizeChannelName(username: string): string {
  return username
    .replace(/[^\w\s-]/g, '')
    .trim()
    .slice(0, 90) || 'User';
}

/** Capitalize the first letter of each word (e.g. "john_doe" -> "John Doe") */
export function capitalizeName(name: string): string {
  return name
    .split(/[\s_-]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
    .trim() || name;
}

/** Format VC channel name with optional lock indicator */
export function formatVcName(ownerName: string, isLocked: boolean): string {
  const base = `${ownerName}'s VC`;
  return isLocked ? `${LOCK_EMOJI} ${base}` : base;
}

/** Strip lock emoji prefix from channel name if present */
export function stripLockFromName(name: string): string {
  return name.startsWith(`${LOCK_EMOJI} `) ? name.slice(LOCK_EMOJI.length + 1) : name;
}
