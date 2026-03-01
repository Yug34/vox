import config from '../../config';
import { channelStore } from './channelStore';
import { redisChannelStore } from './redisChannelStore';
import { votekickStore } from './votekickStore';
import { redisVotekickStore } from './redisVotekickStore';

const useRedis = Boolean(config.redisUrl);

export const channelStoreImpl = useRedis ? redisChannelStore : channelStore;
export const votekickStoreImpl = useRedis ? redisVotekickStore : votekickStore;
export { useRedis };
