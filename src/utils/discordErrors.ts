/** Discord API error code for missing permissions (often due to role hierarchy) */
const MISSING_PERMISSIONS = 50013;

const HIERARCHY_MESSAGE =
  "The bot's role must be above yours in Server Settings → Roles, or the bot needs Administrator permission (like Astro/carl-bot use).";

/**
 * Returns a user-facing error message for permission-overwrite failures.
 * Detects 50013 (role hierarchy) and suggests Administrator as the fix.
 */
export function getPermissionOverwriteErrorMessage(
  error: unknown,
  fallback: string
): string {
  const isHierarchy =
    error instanceof Error &&
    'code' in error &&
    (error as { code?: number }).code === MISSING_PERMISSIONS;
  return isHierarchy ? HIERARCHY_MESSAGE : fallback;
}
