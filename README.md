# vc joiner

multi-token discord vc bot. all bots sit in one vc 24/7, you can move them with `!join` / `!leave`.

built with discord.js-selfbot-v13, gateway join only (no udp).

### setup

```bash
npm install
cp .env.example .env
# edit .env then
npm start
```

### .env

```
TOKENS=token1,token2,token3
COMMANDS=ai,bot2,bot3
PREFIX=!
OWNER_ID=1269984634771607616
TARGET_CHANNEL_ID=1544011299749498900
TARGET_GUILD_ID=1170745632818987048
```

- `TOKENS` - comma separated tokens
- `COMMANDS` - one per token, e.g `!ai` moves first bot. defaults to `bot0`, `bot1`...
- `PREFIX` - default `!`
- `OWNER_ID` - only these users can run commands, comma separated. empty = anyone
- `TARGET_CHANNEL_ID` / `TARGET_GUILD_ID` - where bots sit on startup. guild is auto found if not set.

### commands

- `!join` - all bots join your current vc
- `!leave` - all bots leave
- `!ai` - only that bot joins you (depends on COMMANDS)

### how it works

sends raw `op 4` to stay in vc:

```js
{ op: 4, d: { guild_id, channel_id, self_mute: true, self_deaf: false } }
```

no udp/audio, so no 15s timeout. keepalive every 12s. if kicked or dragged it auto rejoins with backoff.

### notes

- needs node 16+
- `npm run check` to verify syntax
- selfbots are against discord tos, use at your own risk
