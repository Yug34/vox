export interface ChannelEntry {
  ownerId: string;
  permittedUserIds: Set<string>;
  guildId?: string;
}

export interface VotekickEntry {
  targetUserId: string;
  channelId: string;
  textChannelId: string;
  messageId: string;
  guildId?: string;
  expiresAt: number;
}
