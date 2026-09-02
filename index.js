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
  client._joinChannelSafe = async (channelId) => {
    client._manualLeave = false;
    client._lastVcId = channelId;
    const conn = await client.voice.joinChannel(channelId, { selfDeaf: false, selfMute: true });
    // attach once per connection
    if (conn && !conn._logged) {
      conn._logged = true;
      conn.on('error', (e) => console.error(`[${client.user?.tag}] voice error:`, e?.message || e));
      // discord.js-selfbot voice emits 'stateChange' / 'disconnect' via debug; log via polling
    }
    return conn;
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
      if (joinLock) return;
      joinLock = true;
      setTimeout(() => (joinLock = false), 5000);
      // only first ready instance handles it to avoid 9x spam
      if (instances[0] !== client && instances.find(c => c.user)?.user?.id !== client.user?.id) {
        // allow first bot that received it, but debounce via lock covers it
      }
      const guild = message.guild;
      if (!guild) { joinLock = false; return; }
      const vc = message.member?.voice?.channel;
      if (!vc) {
        console.log(`[${client.user?.tag}] !join failed: you not in VC`);
        joinLock = false;
        return;
      }
      console.log(`[${client.user?.tag}] !join -> ${vc.id} (${vc.name}) by ${message.author.tag} — joining ${instances.length} bots`);
      for (const inst of instances) {
        if (!inst.user) { console.log(`[${inst._botCommand}] skip (not logged in)`); continue; }
        try {
          await sleep(rand(350, 900));
          await inst._joinChannelSafe(vc.id);
          console.log(`[${inst.user?.tag}] joined ${vc.name} (${vc.id})`);
        } catch (e) {
          console.error(`[${inst.user?.tag || inst._botCommand}] join failed:`, e?.message || e);
        }
      }
      setTimeout(() => (joinLock = false), 2000);
      return;
    }

    if (cmd === 'leave') {
      if (leaveLock) return;
      leaveLock = true;
      setTimeout(() => (leaveLock = false), 5000);
      console.log(`[${client.user?.tag}] !leave by ${message.author.tag}`);
      for (const inst of instances) {
        try {
          await sleep(rand(150, 400));
          if (!inst.user) continue;
          console.log(`[${inst.user?.tag}] leaving VC`);
          inst._manualLeave = true;
          inst._lastVcId = null;
          inst.voice.connection?.destroy();
        } catch (e) {
          console.error(`[${inst.user?.tag || inst._botCommand}] leave failed:`, e?.message || e);
        }
      }
      setTimeout(() => (leaveLock = false), 2000);
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
      await client._joinChannelSafe(vc.id);
      console.log(`[${client.user?.tag}] joined ${vc.name}`);
    } catch (e) {
      console.error(`[${client.user?.tag}] join failed:`, e?.message || e);
    }
  });

  // keep bots in VC — auto-rejoin if not manual leave
  client.on('raw', (packet) => {
    if (packet.t === 'VOICE_STATE_UPDATE' && packet.d?.user_id === client.user?.id) {
      if (!packet.d?.channel_id) {
        console.log(`[${client.user?.tag}] VOICE_STATE_UPDATE: left/kicked from VC (channel_id null) guild=${packet.d.guild_id}`);
        if (client._lastVcId && !client._manualLeave) {
          const vcId = client._lastVcId;
          console.log(`[${client.user?.tag}] auto-rejoining ${vcId} in 2s...`);
          setTimeout(() => {
            if (client._manualLeave) return;
            client._joinChannelSafe(vcId).then(() => console.log(`[${client.user?.tag}] auto-rejoined ${vcId}`)).catch((e) => console.error(`[${client.user?.tag}] auto-rejoin failed:`, e?.message || e));
          }, 2000 + rand(0, 1500));
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
        console.log(`[${client.user?.tag}] voiceStateUpdate: left ${oldState.channelId} -> null (manual=${client._manualLeave})`);
        if (client._lastVcId && !client._manualLeave) {
          const vcId = client._lastVcId;
          console.log(`[${client.user?.tag}] voiceStateUpdate auto-rejoin ${vcId} in 3s`);
          setTimeout(() => {
            if (client._manualLeave) return;
            client._joinChannelSafe(vcId).then(() => console.log(`[${client.user?.tag}] voiceStateUpdate re-joined ${vcId}`)).catch((e) => console.error(`[${client.user?.tag}] rejoin failed:`, e?.message || e));
          }, 3000);
        }
      } else if (newState.channelId) {
        client._lastVcId = newState.channelId;
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
