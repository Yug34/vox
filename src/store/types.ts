export interface ChannelEntry {
  ownerId: string;
  permittedUserIds: Set<string>;
}

export interface VotekickEntry {
  targetUserId: string;
  channelId: string;
  textChannelId: string;
  messageId: string;
  expiresAt: number;
}
