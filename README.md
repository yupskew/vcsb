<p align="center">
  <img src="https://img.shields.io/badge/Built_with-Discord.js--selfbot--v13-7289DA?style=for-the-badge&logo=discord&logoColor=white" alt="Discord.js Selfbot v13">
  <img src="https://img.shields.io/badge/Node.js-16+-339933?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js 16+">
  <img src="https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge" alt="License">
</p>

<h1 align="center">🎤 VC Joiner</h1>

<p align="center">
  <b>Multi-token Discord voice channel joiner</b><br>
  Control multiple selfbot accounts to join or leave voice channels with simple commands.
</p>

<p align="center">
  <a href="https://github.com/yupskew/vcsb/stargazers"><img src="https://img.shields.io/github/stars/yupskew/vcsb?style=social" alt="Stars"></a>
  <a href="https://github.com/yupskew/vcsb/network/members"><img src="https://img.shields.io/github/forks/yupskew/vcsb?style=social" alt="Forks"></a>
  <a href="https://github.com/yupskew/vcsb/issues"><img src="https://img.shields.io/github/issues/yupskew/vcsb" alt="Issues"></a>
</p>

---

## 📋 Prerequisites

<table>
  <tr>
    <td><img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/nodejs/nodejs-original.svg" width="40" height="40"></td>
    <td>
      <b>Node.js</b> (version 16 or higher)<br>
      Download from <a href="https://nodejs.org">nodejs.org</a>
    </td>
  </tr>
  <tr>
    <td><img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/npm/npm-original-wordmark.svg" width="40" height="40"></td>
    <td>
      <b>npm</b> (comes bundled with Node.js)<br>
      No extra install needed
    </td>
  </tr>
</table>

Not sure if you have them? Run this in your terminal:

```bash
node -v
npm -v
```

---

## ⚙️ Installation

```bash
git clone https://github.com/yupskew/vcsb.git
cd vcsb
npm install
```

---

## 🔧 Configuration

Create a `.env` file in the project root:

```env
TOKENS=token1,token2,token3
COMMANDS=ai,hack,mard,bot4,bot5,bot6
PREFIX=!
OWNER_ID=1269984634771607616,1136528198067298375,1196315552889708645
```

> Supports multiple owners — comma-separate IDs (e.g. `OWNER_ID=id1,id2,id3`) so any listed user can control the bots.

<table>
  <thead>
    <tr>
      <th>Field</th>
      <th>Description</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><img src="https://img.shields.io/badge/-TOKENS-blue?style=flat-square" alt="Tokens"></td>
      <td>Comma-separated list of your selfbot account tokens</td>
    </tr>
    <tr>
      <td><img src="https://img.shields.io/badge/-COMMANDS-green?style=flat-square" alt="Commands"></td>
      <td>The command name each token responds to (must match token order)</td>
    </tr>
    <tr>
      <td><img src="https://img.shields.io/badge/-PREFIX-orange?style=flat-square" alt="Prefix"></td>
      <td>The prefix that triggers a command. Defaults to <code>!</code></td>
    </tr>
    <tr>
      <td><img src="https://img.shields.io/badge/-OWNER_ID-red?style=flat-square" alt="Owner ID"></td>
      <td>Comma-separated Discord user IDs. Every listed user can control the bots.</td>
    </tr>
  </tbody>
</table>

> 💡 **Tip:** Enable Developer Mode in Discord (Settings > Advanced > Developer Mode), then right-click your profile and click "Copy User ID".

---

## 🚀 Usage

```bash
npm start
```

Or:

```bash
node index.js
```

The bot accounts will come online. Join a voice channel in Discord, then type the command in a text channel.

---

## 💬 Commands

<table>
  <thead>
    <tr>
      <th>Command</th>
      <th>Description</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><img src="https://img.shields.io/badge/!join-green?style=for-the-badge" alt="Join"></td>
      <td>Makes every bot account join your current voice channel</td>
    </tr>
    <tr>
      <td><img src="https://img.shields.io/badge/!leave-red?style=for-the-badge" alt="Leave"></td>
      <td>Disconnects every bot account from their voice channel</td>
    </tr>
  </tbody>
</table>

---

## 🔍 How It Works

| Step | Description |
|------|-------------|
| 1 | Reads tokens and logs each account into Discord |
| 2 | Each account listens for messages with your prefix |
| 3 | Only users listed in `OWNER_ID` (supports multiple comma-separated IDs) can send commands |
| 4 | Bots connect to the voice channel you're currently in |
| 5 | Bots join with audio and microphone enabled |

---

## ❓ Troubleshooting

<table>
  <thead>
    <tr>
      <th>Problem</th>
      <th>Solution</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><img src="https://img.shields.io/badge/Bot%20doesn't%20respond-yellow" alt="No Response"></td>
      <td>Check prefix, OWNER_ID, and make sure bots are online</td>
    </tr>
    <tr>
      <td><img src="https://img.shields.io/badge/Bots%20won't%20join-orange" alt="Won't Join"></td>
      <td>You must be inside a voice channel before typing the command</td>
    </tr>
    <tr>
      <td><img src="https://img.shields.io/badge/Token%20error-red" alt="Token Error"></td>
      <td>Tokens can expire. Make sure they're still valid.</td>
    </tr>
  </tbody>
</table>

---

## ⚠️ Disclaimer

This project uses selfbot accounts, which go against Discord's Terms of Service. Using selfbots can result in your accounts being banned. This is provided for educational purposes only. Use it at your own risk.

---

## 👨‍💻 Author

<p align="center">
  Built with ❤️ by <b><a href="https://github.com/yupskew">yupskew</a></b>
</p>
