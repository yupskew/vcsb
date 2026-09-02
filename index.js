require('dotenv').config();
const { Client } = require('discord.js-selfbot-v13');

const tokens = process.env.TOKENS.split(',').map(t => t.trim()).filter(Boolean);
const commands = process.env.COMMANDS.split(',').map(c => c.trim().toLowerCase());
const prefix = process.env.PREFIX || '!';
const ownerIds = (process.env.OWNER_ID || '').split(',').map(s => s.trim()).filter(Boolean);

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const instances = [];
let joinLock = false;
let leaveLock = false;
let lastJoinMsgId = null;

for (let i = 0; i < tokens.length; i++) {
  const token = tokens[i];
  const botCommand = commands[i] || `bot${i}`;

  const client = new Client({
    checkUpdate: false,
    captchaCache: { enabled: false },
    restTimeOffset: rand(300, 1500),
    properties: {
      browser: 'Chrome',
      os: 'Windows',
      device: '',
      browserVersion: '120.0.0.0',
      osVersion: '10',
      platform: 'Win32',
    },
  });

  client._botCommand = botCommand;
  client._tokenIndex = i;
  client._lastVcId = null;
  client._manualLeave = false;
  // raw gateway join (no UDP) - makes bot appear in VC and stay
  client._lastGuildId = null;
  client._gatewayJoin = (guildId, channelId) => {
    try {
      const payload = { op: 4, d: { guild_id: guildId, channel_id: channelId, self_mute: true, self_deaf: true } };
      if (client.ws?.send) client.ws.send(payload);
      else if (client._ws?.send) client._ws.send(payload);
      else if (client.ws?.shards?.first()?.send) client.ws.shards.first().send(payload);
    } catch {}
    client._lastVcId = channelId;
    client._lastGuildId = guildId;
    client._manualLeave = false;
    client._lastJoinAt = Date.now();
  };
  client._joinChannelSafe = async (guildId, channelId) => {
    client._lastGuildId = guildId;
    // pure gateway join — stays in VC without UDP (prevents 15s timeout + kick loop)
    client._gatewayJoin(guildId, channelId);
    console.log(`[${client.user?.tag}] gateway joined ${channelId} (guild ${guildId})`);
    return null;
  };

  client.on('ready', async () => {
    console.log(`[${client.user?.tag || `bot${i}`}] READY as ${client.user?.tag} (cmd: ${prefix}${botCommand})`);
  });

  client.on('messageCreate', async (message) => {
    if (!message.content.startsWith(prefix)) return;
    if (ownerIds.length && !ownerIds.includes(message.author.id)) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const cmd = args.shift().toLowerCase();

    if (cmd === 'join') {
      if (message.id === lastJoinMsgId) { console.log(`[${client.user?.tag}] !join dedup ${message.id}`); return; }
      if (joinLock) { console.log(`[${client.user?.tag}] !join ignored (debounce)`); return; }
      lastJoinMsgId = message.id;
      joinLock = true;
      setTimeout(() => (joinLock = false), 10000);
      const guild = message.guild;
      if (!guild) { setTimeout(() => (joinLock = false), 1000); return; }
      const vc = message.member?.voice?.channel;
      if (!vc) {
        console.log(`[${client.user?.tag}] !join failed: you not in VC`);
        setTimeout(() => (joinLock = false), 1000);
        return;
      }
      console.log(`[${client.user?.tag}] !join -> ${vc.id} (${vc.name}) by ${message.author.tag} — joining ${instances.length} bots`);
      for (const inst of instances) {
        if (!inst.user) { console.log(`[${inst._botCommand}] skip (not logged in)`); continue; }
        try {
          await sleep(rand(900, 1400));
          await inst._joinChannelSafe(guild.id, vc.id);
          console.log(`[${inst.user?.tag}] joined ${vc.name} (${vc.id})`);
        } catch (e) {
          const msg = e?.message || String(e);
          if (msg.includes('Connection not established') || msg.includes('UDP timeout')) {
            console.log(`[${inst.user?.tag || inst._botCommand}] UDP timeout, kept gateway`);
          } else {
            console.error(`[${inst.user?.tag || inst._botCommand}] join failed:`, msg);
          }
        }
      }
      return;
    }

    if (cmd === 'leave') {
      if (leaveLock) return;
      leaveLock = true;
      setTimeout(() => (leaveLock = false), 8000);
      console.log(`[${client.user?.tag}] !leave by ${message.author.tag}`);
      for (const inst of instances) {
        try {
          await sleep(rand(300, 600));
          if (!inst.user) continue;
          console.log(`[${inst.user?.tag}] leaving VC`);
          inst._manualLeave = true;
          inst._lastVcId = null;
          try { inst.voice.connection?.destroy(); } catch {}
        } catch (e) {
          console.error(`[${inst.user?.tag || inst._botCommand}] leave failed:`, e?.message || e);
        }
      }
      return;
    }

    if (cmd !== client._botCommand) return;

    const guild = message.guild;
    if (!guild) return;

    const vc = message.member?.voice?.channel;
    if (!vc) return;

    try {
      console.log(`[${client.user?.tag}] !${client._botCommand} -> joining ${vc.name} (${vc.id})`);
      await sleep(rand(50, 200));
      await client._joinChannelSafe(guild.id, vc.id);
      console.log(`[${client.user?.tag}] joined ${vc.name}`);
    } catch (e) {
      console.error(`[${client.user?.tag}] join failed:`, e?.message || e);
    }
  });

  // keep bots in VC — auto-rejoin only if stable >15s and was kicked (not UDP timeout loop)
  client.on('raw', (packet) => {
    if (packet.t === 'VOICE_STATE_UPDATE' && packet.d?.user_id === client.user?.id) {
      if (!packet.d?.channel_id) {
        const stable = Date.now() - client._lastJoinAt > 15000;
        console.log(`[${client.user?.tag}] VOICE_STATE_UPDATE: left/kicked guild=${packet.d.guild_id} stable=${stable}`);
        if (client._lastVcId && client._lastGuildId && !client._manualLeave && stable) {
          const vcId = client._lastVcId; const gId = client._lastGuildId;
          console.log(`[${client.user?.tag}] auto-rejoining ${vcId} in 3s...`);
          setTimeout(() => {
            if (client._manualLeave) return;
            client._joinChannelSafe(gId, vcId).then(() => console.log(`[${client.user?.tag}] auto-rejoined ${vcId}`)).catch((e) => console.error(`[${client.user?.tag}] auto-rejoin failed:`, e?.message || e));
          }, 3000 + rand(0, 1500));
        } else if (!stable) {
          console.log(`[${client.user?.tag}] skip auto-rejoin (joined <15s ago)`);
        }
      }
    }
    if (packet.t === 'VOICE_SERVER_UPDATE') {
      // console.log(`[${client.user?.tag}] VOICE_SERVER_UPDATE guild=${packet.d.guild_id} endpoint=${packet.d.endpoint}`);
    }
  });

  client.on('voiceStateUpdate', (oldState, newState) => {
    if (newState.member?.id === client.user?.id) {
      if (!newState.channelId && oldState.channelId) {
        const stable = Date.now() - client._lastJoinAt > 15000;
        console.log(`[${client.user?.tag}] voiceStateUpdate: left ${oldState.channelId} -> null manual=${client._manualLeave} stable=${stable}`);
        if (client._lastVcId && client._lastGuildId && !client._manualLeave && stable) {
          const vcId = client._lastVcId; const gId = client._lastGuildId;
          console.log(`[${client.user?.tag}] voiceStateUpdate auto-rejoin ${vcId} in 4s`);
          setTimeout(() => {
            if (client._manualLeave) return;
            client._joinChannelSafe(gId, vcId).then(() => console.log(`[${client.user?.tag}] voiceStateUpdate re-joined ${vcId}`)).catch((e) => console.error(`[${client.user?.tag}] rejoin failed:`, e?.message || e));
          }, 4000);
        }
      } else if (newState.channelId) {
        client._lastVcId = newState.channelId;
        client._lastGuildId = newState.guild?.id || client._lastGuildId;
      }
    }
  });

  client.on('error', (e) => console.error(`[${botCommand}] error:`, e?.message || e));
  client.on('warn', (m) => console.warn(`[${botCommand}] warn:`, m));
  client.on('debug', () => {});

  setTimeout(() => {
    console.log(`[${botCommand}] logging in...`);
    client.login(token)
      .then(() => console.log(`[${botCommand}] login success`))
      .catch((e) => console.error(`[${botCommand}] login failed:`, e?.message || e));
  }, rand(0, 3000) * instances.length);

  instances.push(client);
}

process.on('unhandledRejection', (e) => {
  const msg = e?.message || String(e);
  if (msg.includes('WebSocket was closed before')) return;
  console.error('unhandledRejection:', msg);
});
process.on('uncaughtException', (e) => {
  const msg = e?.message || String(e);
  if (msg.includes('WebSocket was closed before') || msg.includes('Connection not established')) return;
  console.error('uncaughtException:', msg);
});

console.log(`Starting ${tokens.length} bot(s) | prefix=${prefix} | owners=${ownerIds.join(',') || 'none'} | commands=${commands.join(',')}`);
