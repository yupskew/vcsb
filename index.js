require('dotenv').config();
const { Client } = require('discord.js-selfbot-v13');

// config from .env
const tokens = process.env.TOKENS.split(',').map(t => t.trim()).filter(Boolean);
const commands = process.env.COMMANDS.split(',').map(c => c.trim().toLowerCase());
const prefix = process.env.PREFIX || '!';
const owners = (process.env.OWNER_ID || '').split(',').map(s => s.trim()).filter(Boolean);

// all bots join this vc on startup and stay there
const TARGET_CHANNEL = (process.env.TARGET_CHANNEL_ID || '1544011299749498900').trim();
const TARGET_GUILD = (process.env.TARGET_GUILD_ID || '1170745632818987048').trim() || null;

if (!tokens.length) {
  console.error('no TOKENS in .env');
  process.exit(1);
}

const sleep = ms => new Promise(r => setTimeout(r, ms));
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const bots = [];
let joinLock = false;
let leaveLock = false;
let lastJoinId = null;

// quick gateway join without voice udp - just shows bot in vc
function doJoin(client, guildId, channelId) {
  const payload = { op: 4, d: { guild_id: guildId, channel_id: channelId, self_mute: true, self_deaf: false } };
  try {
    if (client.ws?.send) client.ws.send(payload);
    else if (client._ws?.send) client._ws.send(payload);
    else if (client.ws?.shards?.first()?.send) client.ws.shards.first().send(payload);
  } catch {}
  client._lastVc = channelId;
  client._lastGuild = guildId;
  client._manualLeave = false;
  client._lastJoinAt = Date.now();
}

function doLeave(client, guildId) {
  const payload = { op: 4, d: { guild_id: guildId, channel_id: null, self_mute: true, self_deaf: false } };
  try {
    if (client.ws?.send) client.ws.send(payload);
    else if (client._ws?.send) client._ws.send(payload);
    else if (client.ws?.shards?.first()?.send) client.ws.shards.first().send(payload);
  } catch {}
}

// resolve guild id for the target channel if not set in env
async function findGuild(client) {
  if (TARGET_GUILD) return TARGET_GUILD;
  if (client._resolvedGuild) return client._resolvedGuild;
  try {
    const ch = await client.channels.fetch(TARGET_CHANNEL).catch(() => null);
    if (ch?.guild?.id) return ch.guild.id;
    if (ch?.guildId) return ch.guildId;
  } catch {}
  for (const g of client.guilds.cache.values()) {
    if (g.channels?.cache?.has(TARGET_CHANNEL)) return g.id;
  }
  return null;
}

for (let i = 0; i < tokens.length; i++) {
  const token = tokens[i];
  const cmdName = commands[i] || `bot${i}`;

  const client = new Client({
    checkUpdate: false,
    captchaCache: { enabled: false },
    restTimeOffset: rand(300, 1500),
    properties: { browser: 'Chrome', os: 'Windows', device: '', browserVersion: '120.0.0.0', osVersion: '10', platform: 'Win32' },
  });

  client._cmd = cmdName;
  client._idx = i;
  client._lastVc = null;
  client._lastGuild = null;
  client._lastJoinVc = null;
  client._lastJoinGuild = null;
  client._resolvedGuild = null;
  client._manualLeave = false;
  client._lastJoinAt = 0;
  client._rejoinLock = false;
  client._kickCount = 0;
  client._lastKick = 0;
  client._keepalive = null;

  // join wrapper with log
  client.joinSafe = async (guildId, channelId) => {
    client._lastGuild = guildId;
    doJoin(client, guildId, channelId);
    console.log(`[${client.user?.tag}] joined ${channelId} (guild ${guildId})`);
  };

  // ready -> auto join target channel
  client.on('ready', () => {
    console.log(`[${client.user.tag}] READY as ${client.user.tag} (cmd: ${prefix}${cmdName})`);

    if (!TARGET_CHANNEL || client._keepalive) return;

    const runJoin = async () => {
      if (client._manualLeave) return;
      const gid = await findGuild(client);
      if (!gid) {
        console.log(`[${client.user.tag}] cant find guild for ${TARGET_CHANNEL}, set TARGET_GUILD_ID`);
        return;
      }
      client._resolvedGuild = gid;
      const already = client._lastVc === TARGET_CHANNEL;
      await client.joinSafe(gid, TARGET_CHANNEL);
      client._lastJoinGuild = gid;
      client._lastJoinVc = TARGET_CHANNEL;
      if (!already) console.log(`[${client.user.tag}] auto-joined ${TARGET_CHANNEL}`);
    };

    // stagger so we dont get ratelimited
    setTimeout(() => runJoin().catch(e => console.error(`[${client.user.tag}] auto-join fail:`, e.message || e)), 3000 + rand(0, 2000) + i * 900);

    // keepalive every 12s so discord doesnt kick
    client._keepalive = setInterval(() => {
      if (client._manualLeave) return;
      const gid = client._resolvedGuild || TARGET_GUILD;
      if (!gid) return;
      const already = client._lastVc === TARGET_CHANNEL;
      doJoin(client, gid, TARGET_CHANNEL);
      if (!already) console.log(`[${client.user.tag}] keepalive rejoined ${TARGET_CHANNEL}`);
    }, 12000);
  });

  // commands
  client.on('messageCreate', async (msg) => {
    if (!msg.content.startsWith(prefix)) return;
    if (owners.length && !owners.includes(msg.author.id)) return;

    const args = msg.content.slice(prefix.length).trim().split(/ +/);
    const cmd = args.shift().toLowerCase();

    // !join -> all bots join your vc
    if (cmd === 'join') {
      if (msg.id === lastJoinId) {
        console.log(`[${client.user.tag}] !join dedup ${msg.id}`);
        return;
      }
      if (joinLock) {
        console.log(`[${client.user.tag}] !join on cooldown`);
        return;
      }
      lastJoinId = msg.id;
      joinLock = true;
      setTimeout(() => joinLock = false, 10000);

      const guild = msg.guild;
      if (!guild) return setTimeout(() => joinLock = false, 1000);

      const vc = msg.member?.voice?.channel;
      if (!vc) {
        console.log(`[${client.user.tag}] !join fail: you not in vc`);
        return setTimeout(() => joinLock = false, 1000);
      }

      console.log(`[${client.user.tag}] !join ${vc.id} (${vc.name}) by ${msg.author.tag} -> ${bots.length} bots`);
      for (const b of bots) {
        if (!b.user) {
          console.log(`[${b._cmd}] skip not logged in`);
          continue;
        }
        try {
          await sleep(rand(900, 1400));
          await b.joinSafe(guild.id, vc.id);
          b._lastJoinGuild = guild.id;
          b._lastJoinVc = vc.id;
          b._manualLeave = false;
          console.log(`[${b.user.tag}] joined ${vc.name}`);
        } catch (e) {
          const m = e.message || String(e);
          if (m.includes('Connection not established') || m.includes('UDP timeout')) {
            console.log(`[${b.user?.tag || b._cmd}] udp timeout, gateway kept`);
          } else console.error(`[${b.user?.tag || b._cmd}] join fail:`, m);
        }
      }
      return;
    }

    // !leave -> all bots leave
    if (cmd === 'leave') {
      if (leaveLock) return;
      leaveLock = true;
      setTimeout(() => leaveLock = false, 8000);
      console.log(`[${client.user.tag}] !leave by ${msg.author.tag}`);
      for (const b of bots) {
        try {
          await sleep(rand(300, 600));
          if (!b.user) continue;
          console.log(`[${b.user.tag}] leaving`);
          b._manualLeave = true;
          b._lastVc = null;
          b._lastJoinVc = null;
          b._lastJoinGuild = null;
          const gid = b._lastGuild || msg.guild?.id;
          if (gid) doLeave(b, gid);
          try { b.voice?.connection?.destroy(); } catch {}
        } catch (e) {
          console.error(`[${b.user?.tag || b._cmd}] leave fail:`, e.message || e);
        }
      }
      return;
    }

    // per-bot command like !ai -> that one bot joins your vc
    if (cmd !== cmdName) return;
    const guild = msg.guild;
    if (!guild) return;
    const vc = msg.member?.voice?.channel;
    if (!vc) return;

    try {
      console.log(`[${client.user.tag}] !${cmdName} -> ${vc.name}`);
      await sleep(rand(50, 200));
      await client.joinSafe(guild.id, vc.id);
      client._lastJoinGuild = guild.id;
      client._lastJoinVc = vc.id;
      client._manualLeave = false;
    } catch (e) {
      console.error(`[${client.user.tag}] join fail:`, e.message || e);
    }
  });

  // rejoin if kicked / dragged
  client.on('raw', (packet) => {
    if (packet.t !== 'VOICE_STATE_UPDATE') return;
    if (packet.d?.user_id !== client.user?.id) return;

    const newId = packet.d?.channel_id;
    const targetGuild = client._lastJoinGuild || client._lastGuild;
    const targetVc = client._lastJoinVc || client._lastVc;

    // kicked
    if (!newId) {
      if (client._manualLeave) {
        console.log(`[${client.user.tag}] left (manual)`);
        return;
      }
      if (!targetGuild || !targetVc) {
        console.log(`[${client.user.tag}] kicked but no last vc`);
        return;
      }
      if (client._rejoinLock) return;
      const now = Date.now();
      if (now - client._lastKick < 30000) client._kickCount++;
      else client._kickCount = 1;
      client._lastKick = now;

      const wait = client._kickCount > 3 ? 15000 + rand(0, 5000) : 2500 + rand(0, 1000);
      client._rejoinLock = true;
      setTimeout(() => client._rejoinLock = false, wait);
      console.log(`[${client.user.tag}] kicked, rejoining ${targetVc} in ${Math.round(wait/1000)}s (${client._kickCount})`);
      setTimeout(() => {
        if (client._manualLeave) return;
        client.joinSafe(targetGuild, targetVc).then(() => console.log(`[${client.user.tag}] rejoined ${targetVc}`)).catch(e => console.error(`[${client.user.tag}] rejoin fail`, e.message || e));
      }, wait);
      return;
    }

    // dragged to other vc -> go back
    if (newId !== targetVc && targetVc && !client._manualLeave) {
      if (client._rejoinLock) return;
      if (Date.now() - (client._lastJoinAt || 0) < 3000) return;
      console.log(`[${client.user.tag}] dragged to ${newId}, back to ${targetVc}`);
      client._rejoinLock = true;
      setTimeout(() => client._rejoinLock = false, 5000);
      setTimeout(() => {
        if (client._manualLeave) return;
        doJoin(client, targetGuild, targetVc);
        console.log(`[${client.user.tag}] back to ${targetVc}`);
      }, 1500 + rand(0, 500));
    }
  });

  client.on('voiceStateUpdate', (oldS, newS) => {
    if (newS.member?.id !== client.user?.id) return;
    if (newS.channelId) {
      client._lastVc = newS.channelId;
      client._lastGuild = newS.guild?.id || client._lastGuild;
    }
  });

  client.on('error', e => console.error(`[${cmdName}]`, e.message || e));
  client.on('warn', m => console.warn(`[${cmdName}]`, m));

  setTimeout(() => {
    console.log(`[${cmdName}] logging in...`);
    client.login(token).then(() => console.log(`[${cmdName}] login ok`)).catch(e => console.error(`[${cmdName}] login fail:`, e.message || e));
  }, rand(0, 3000) * bots.length);

  bots.push(client);
}

process.on('unhandledRejection', e => {
  const m = e?.message || String(e);
  if (m.includes('WebSocket was closed before')) return;
  console.error('unhandled:', m);
});
process.on('uncaughtException', e => {
  const m = e?.message || String(e);
  if (m.includes('WebSocket was closed before') || m.includes('Connection not established')) return;
  console.error('uncaught:', m);
});

console.log(`starting ${tokens.length} bots | prefix=${prefix} | owners=${owners.join(',') || 'none'} | target=${TARGET_CHANNEL}`);
