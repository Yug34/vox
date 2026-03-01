# Vox - Voice channel management bot

A Discord bot that creates temporary voice channels when users join a designated "Create Your Own VC" channel. Channel owners can lock/unlock their VC and selectively permit users to join when locked.

## Features

- **Auto-create channels**: Join the trigger channel to get a personal voice channel named after you
- **Auto-ownership transfer**: When the owner leaves and others remain, ownership transfers to another member and the channel renames
- **Lock/Unlock**: Restrict access so only you and permitted users can join, or open it to everyone
- **Permit/Revoke**: Allow specific users to join your locked channel
- **Votekick**: Start a poll to remove a user from the VC (owner only)
- **Transfer**: Transfer ownership to another user in the VC (owner only)
- **Mute/Unmute**: Mute or unmute users in your VC (owner only)
- **Auto-cleanup**: Empty channels are deleted after 5 seconds

## Requirements

- [Bun](https://bun.sh/) (v1.0+)
- Discord Bot Token

## Setup

1. **Create a Discord Application**
   - Go to [Discord Developer Portal](https://discord.com/developers/applications)
   - Create a new application
   - Under "Bot", create a bot and copy the token
   - Enable **Message Content Intent** (under Bot > Privileged Gateway Intents)
   - Under "OAuth2 > URL Generator", select scopes: `bot`
   - Select bot permissions: `Administrator` (or `Manage Channels`, `Move Members`, `Mute Members`, `View Channels`, `Read Message History` – Administrator is required for lock to work when the channel owner has a role above the bot, e.g. server owner)
   - Use the generated URL to invite the bot to your server

2. **Create the trigger channel**
   - Create a voice channel named "Create Your Own VC" (or configure a different name)

3. **Configure the bot**

   ```bash
   cp .env.example .env
   # Edit .env with your DISCORD_TOKEN and CLIENT_ID
   ```

4. **Install and run**

   ```bash
   bun install
   bun run start
   ```

   For development with auto-restart:

   ```bash
   bun run dev
   ```

## Commands

All commands use the `!!` prefix by default (configurable via `COMMAND_PREFIX`).

| Command            | Description                                                                 |
| ------------------ | --------------------------------------------------------------------------- |
| `!!ping`           | Check if the bot is online                                                  |
| `!!lock`           | Lock your VC so only you and permitted users can join                       |
| `!!unlock`         | Unlock your VC so anyone can join                                           |
| `!!permit @user`   | Allow a user to join when your VC is locked                                 |
| `!!revoke @user`   | Remove a user from the permitted list                                       |
| `!!votekick @user` | Start a poll to votekick a user from the VC (owner only)                    |
| `!!transfer @user` | Transfer ownership to the mentioned user (owner only, target must be in VC) |
| `!!mute @user`     | Mute a user in the VC (owner only)                                          |
| `!!unmute @user`   | Unmute a user in the VC (owner only)                                        |

All VC commands require you to be in your own temporary voice channel (or be the owner for owner-only commands).

## Configuration

| Variable                  | Description                                | Default              |
| ------------------------- | ------------------------------------------ | -------------------- |
| `DISCORD_TOKEN`           | Bot token                                  | Required             |
| `CLIENT_ID`               | Application ID                             | Required             |
| `COMMAND_PREFIX`          | Prefix for text commands                   | "!!"                 |
| `GUILD_ID`                | Guild ID for dev                           | Optional             |
| `TRIGGER_CHANNEL_NAME`    | Name of the channel that triggers creation | "Create Your Own VC" |
| `CLEANUP_DELAY_MS`        | Delay before deleting empty channels (ms)  | 5000                 |
| `VOTEKICK_DURATION_HOURS` | Duration of votekick polls in hours        | 1                    |
| `REDIS_URL`               | Redis connection URL for persistent state  | Optional (in-memory) |
| `SHARD_COUNT`             | Total shards across all processes          | 1                    |
| `SHARD_IDS`               | Comma-separated shard IDs this process runs (e.g. `0,1`) | 0 (single shard) |

Bun loads `.env` automatically from the project root.

### Redis (optional)

Set `REDIS_URL` (e.g. `redis://localhost:6379`) to persist channel ownership and votekick state across restarts. Required for horizontal scaling with multiple shards.

### Sharding (optional)

For horizontal scaling, set `SHARD_COUNT` and `SHARD_IDS` per process. Example with 4 shards across 2 processes:

- Process 1: `SHARD_COUNT=4` `SHARD_IDS=0,1`
- Process 2: `SHARD_COUNT=4` `SHARD_IDS=2,3`

Requires `REDIS_URL` so channel and votekick state is shared across shards.

### Docker

```bash
# Local dev with Redis
docker compose up -d redis
# Set REDIS_URL=redis://localhost:6379 in .env, then:
bun run start

# Or run bot in Docker too
docker compose up -d
```

Ensure `.env` has `DISCORD_TOKEN` and `CLIENT_ID` before running the bot container.

## Bot Permissions

The bot needs:

- **Administrator** – Required for lock/permit/revoke/transfer to work when the channel owner has a role above the bot (e.g. server owner). Without it, these commands fail with 50013 for high-role users. Astro and carl-bot use this same approach.
- **Manage Channels** – Create, delete, and edit channel permissions
- **Move Members** – Move users from the trigger channel to their new VC, votekick disconnect
- **Mute Members** – Mute and unmute users in voice channels
- **View Channel** – See the trigger channel
- **Read Message History** – Required for the Message Content intent (to receive commands)

## License

MIT
