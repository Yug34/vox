export function sanitizeChannelName(username: string): string {
  return username
    .replace(/[^\w\s-]/g, '')
    .trim()
    .slice(0, 90) || 'User';
}
