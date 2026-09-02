require('dotenv').config();
const { Client } = require('discord.js-selfbot-v13');

const tokens = process.env.TOKENS.split(',').map(t => t.trim()).filter(Boolean);
const commands = process.env.COMMANDS.split(',').map(c => c.trim().toLowerCase());
const prefix = process.env.PREFIX || '!';
const ownerIds = (process.env.OWNER_ID || '').split(',').map(s => s.trim()).filter(Boolean);

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const instances = [];

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

  client.on('ready', async () => {});

  client.on('messageCreate', async (message) => {
    if (!message.content.startsWith(prefix)) return;
    if (ownerIds.length && !ownerIds.includes(message.author.id)) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const cmd = args.shift().toLowerCase();

    if (cmd === 'join') {
      const guild = message.guild;
      if (!guild) return;
      const vc = message.member?.voice?.channel;
      if (!vc) return;

      for (const inst of instances) {
        try {
          await sleep(rand(50, 200));
          await inst.voice.joinChannel(vc.id, { selfDeaf: false, selfMute: false });
        } catch {}
      }
      return;
    }

    if (cmd === 'leave') {
      for (const inst of instances) {
        try {
          await sleep(rand(50, 200));
          inst.voice.connection?.destroy();
        } catch {}
      }
      return;
    }

    if (cmd !== client._botCommand) return;

    const guild = message.guild;
    if (!guild) return;

    const vc = message.member?.voice?.channel;
    if (!vc) return;

    try {
      await sleep(rand(50, 200));
      await client.voice.joinChannel(vc.id, {
        selfDeaf: false,
        selfMute: false,
      });
    } catch {}
  });

  client.on('raw', (packet) => {
    if (packet.t === 'VOICE_STATE_UPDATE' && packet.d?.user_id === client.user?.id) {
      if (!packet.d?.channel_id) {
        client.voice.connection?.destroy();
      }
    }
  });

  client.on('error', () => {});
  client.on('warn', () => {});

  setTimeout(() => {
    client.login(token).catch(() => {});
  }, rand(0, 3000) * instances.length);

  instances.push(client);
}

process.on('unhandledRejection', () => {});
process.on('uncaughtException', () => {});
