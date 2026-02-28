import type { Guild, GuildMember } from 'discord.js';

/**
 * Returns true if the bot can add/edit/delete permission overwrites for the target member.
 * Discord only allows modifying overwrites for users with roles below the bot's highest role.
 */
export function canEditPermissionOverwrite(
  guild: Guild,
  targetMember: GuildMember | null
): boolean {
  if (!targetMember?.roles.highest) return false;
  const botMember = guild.members.me;
  const botRole = botMember?.roles.highest;
  if (!botRole) return false;
  return botRole.position > targetMember.roles.highest.position;
}
