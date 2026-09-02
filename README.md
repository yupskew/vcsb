# 🎤 VC Joiner

A multi-token Discord voice channel joiner built with `discord.js-selfbot-v13`. It lets you control multiple selfbot accounts to join or leave a voice channel using simple text commands.

---

## 📋 Before You Start

Make sure you have the following installed on your computer:

- 🟢 **Node.js** (version 16 or higher) — download it from [nodejs.org](https://nodejs.org)
- 📦 **npm** — this comes bundled with Node.js, so no extra install needed

Not sure if you have them? Open your terminal and type:

```bash
node -v
npm -v
```

If both print a version number, you're good to go.

---

## ⚙️ Installation

1. **Clone the repository**

   Open your terminal and run:

   ```bash
   git clone https://github.com/yupskew/vcsb.git
   cd vcsb
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

   This will download the packages the project needs. You'll see a `node_modules` folder appear — that's normal, don't touch it.

---

## 🔧 Configuration

The project uses a `.env` file to store your tokens and settings. Create a file named `.env` in the root of the project folder (next to `index.js`) and add the following:

```env
TOKENS=token1,token2,token3,token4,token5
COMMANDS=join,join,join,join,join
PREFIX=!
OWNER_ID=your-discord-user-id
```

Here's what each field means:

| Field        | Description                                                                                      |
|--------------|--------------------------------------------------------------------------------------------------|
| 🔑 `TOKENS`     | Comma-separated list of your selfbot account tokens. Each token is a separate account.           |
| 🤖 `COMMANDS`   | The command name each token responds to (must match the order of tokens).                        |
| 🏷️ `PREFIX`     | The prefix that triggers a command. Defaults to `!` if not set.                                  |
| 👤 `OWNER_ID`   | Your Discord user ID. Only you will be able to control the bots. Leave empty to disable this.    |

> 💡 **Tip:** To get your Discord user ID, enable Developer Mode in Discord (Settings > Advanced > Developer Mode), then right-click your profile and click "Copy User ID".

---

## 🚀 Usage

Start the bot by running:

```bash
npm start
```

Or if you prefer:

```bash
node index.js
```

You'll see the bot accounts come online. Once they're ready, head into a Discord server and join a voice channel. Then type any of the following commands in a server text channel.

---

## 💬 Commands

| Command    | What it does                                      |
|------------|---------------------------------------------------|
| 🟢 `!join`    | Makes every bot account join your current voice channel. |
| 🔴 `!leave`   | Disconnects every bot account from their voice channel. |

> Each account also responds to its own command name (set in the `COMMANDS` field of your `.env` file). For example, if all commands are set to `join`, then typing `!join` will make all accounts join the voice channel you're in.

---

## 🔍 How It Works (Quick Overview)

1. 📖 When the script starts, it reads your tokens and logs each account into Discord.
2. 👂 Each account listens for messages that start with your prefix (default `!`).
3. 🔒 Only the user with the matching `OWNER_ID` can send commands.
4. 🔗 When a `join` command is triggered, the bots connect to the voice channel you're currently in.
5. 🎙️ They join with audio and microphone enabled (not deafened, not muted).

---

## ❓ Troubleshooting

**🤔 The bot doesn't respond to my commands:**
- Make sure you're using the correct prefix (default is `!`).
- Double-check that your `OWNER_ID` matches your Discord user ID exactly.
- The bots must be online. Check your terminal for any errors.

**🚫 The bots won't join a voice channel:**
- You need to be **inside** a voice channel before typing the command.
- Make sure the bot accounts have permission to connect to that channel.

**⚠️ I'm getting a token error:**
- Tokens can expire or get revoked. Make sure the tokens in your `.env` file are still valid.

---

## ⚠️ Disclaimer

This project uses selfbot accounts, which go against Discord's Terms of Service. Using selfbots can result in your accounts being banned. This is provided for educational purposes only. Use it at your own risk.

---

## 📜 License

This project doesn't have a license yet. If you want to use it, reach out to the repository owner.

---

## 👨‍💻 Author

Built with ❤️ by **[yupskew](https://github.com/yupskew)**
