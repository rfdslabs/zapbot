# 🤖 ZapBot v2.0.10 (devel)

> 🇧🇷 **The bot speaks Brazilian Portuguese.** Command names, replies and the detailed docs in
> [`docs/`](docs/index.md) are in pt_BR; this README is in English.

A WhatsApp bot written in Node.js that runs on top of a real WhatsApp Web session. It recovers
deleted and edited messages (and statuses), downloads videos from social networks, makes stickers,
watches messages by text/regex and alerts you privately, brings news, weather and CVEs, talks to
ChatGPT and has a few toys, all through commands typed in the chat itself (`/help`, `/get`,
`/news`, `/gpt`...).

Persistent aliases store commands with arguments and an optional description: create one with
`/alias dimdim -desc "Shows the dollar price" /cotacao USD`, run `/dimdim` and check
`/help alias`. The bot shows the command it ran before the result. An alias can also combine
several commands in one text, like `/cron` does:
`/alias carteira Orca {/defi orca}\n Prjx {/defi prjx}`.

The idea comes from the old IRC days: ZapBot is inspired by the classic
[eggdrops](https://www.eggheads.org/), the bots that sat in channels answering commands, logging
what happened and keeping the place in order. Here the channel is a WhatsApp group, and commands
start with `/`.

**Main features:**

- 👀 Monitors up to 5 contacts, with a configurable interval, a bounded history of observed
  last-seen times and online alerts: [`/monitor`](docs/comandos/monitor.md)
- Downloads videos with yt-dlp and ffmpeg: [`/get`](docs/comandos/get.md)
- Makes stickers: [`/sticker`](docs/comandos/sticker.md)
- Shows the profile picture of a contact or group: [`/profile`](docs/comandos/profile.md)
- Writes text in big ASCII letters: [`/ascii`](docs/comandos/ascii.md)
- Draws images and animated GIFs with GPT Image: [`/desenhe`](docs/comandos/desenhe.md)
- Watches messages by text or regex: [`/watch`](docs/comandos/watch.md)
- Schedules messages: [`/cron`](docs/comandos/cron.md)
- Shows exchange rates and price alerts: [`/cotacao`](docs/comandos/cotacao.md),
  [`/crypto`](docs/comandos/crypto.md)
- Tracks DeFi positions (Orca, Project X, Liquidswap, Morpho, Aave V3): [`/defi`](docs/comandos/defi.md)
- ChatGPT integration: [`/gpt`](docs/comandos/gpt.md), [`/tldr`](docs/comandos/tldr.md)
- Looks up CVEs, news and the weather: [`/cve`](docs/comandos/cve.md), [`/news`](docs/comandos/news.md),
  [`/tempo`](docs/comandos/tempo.md)
- Backs up the database: [`/backup`](docs/comandos/backup.md)
- Per-user and per-group permissions, with flood protection: [`/bot`](docs/comandos/bot.md)

📖 **Full documentation (pt_BR):** [`docs/`](docs/index.md).

## How it works

```text
 ┌────────────── zapbot container (node:24-trixie-slim) ──────────────┐
 │                                                                    │
 │   app.js ──► whatsapp-web.js ──► Puppeteer ──► Chromium            │──► WhatsApp Web
 │     │                                          (headless)          │
 │     ├──► SQLite  (cache/bot_database.db)  messages, settings       │
 │     ├──► cache/media   media to recover deleted messages           │
 │     ├──► yt-dlp + ffmpeg   /get command                            │
 │     ├──► HTTP APIs (axios)  /gpt /tempo /cve /news /giphy...       │
 │     └──► SMTP (nodemailer)  QR Code and e-mail alerts              │
 │                                                                    │
 │  volumes:  wwebjs_auth  → WhatsApp session (.wwebjs_auth)          │
 │            app_cache    → SQLite database + media (cache/)         │
 └────────────────────────────────────────────────────────────────────┘
```

The bot acts as your own account (a *linked device*), stores messages in SQLite and reacts to
commands typed in any chat.

## Installation

You only need Docker with Compose v2, Git and a phone with WhatsApp:

```bash
git clone https://github.com/rfdslabs/zapbot.git
cd zapbot

cp config/.env.example config/.env   # fill in PHONE_NUMBER and the e-mail settings (see below)

docker compose -f docker/docker-compose.yml build zapbot
docker compose -f docker/docker-compose.yml up -d zapbot
docker logs -f zapbot
```

On the first boot (or when the session expires), WhatsApp asks you to scan a QR Code in **WhatsApp
› Linked devices › Link a device**. Without e-mail, it is drawn in the logs
(`docker logs -f zapbot`).

### QR Code by e-mail (recommended)

Getting the QR Code by e-mail is recommended, especially on a server: it lands in your inbox, you
open it on your computer and scan it with your phone, without logging into the server to read the
logs. The same e-mail address gets the bot's disconnect, reconnect and crash alerts. In
`config/.env`:

```bash
QRCODE_EMAIL_ENABLE="true"
QRCODE_EMAIL_SMTP_HOST="smtp.gmail.com"                # your provider's SMTP server
QRCODE_EMAIL_SMTP_PORT="465"                           # SSL (port 587 does not work)
QRCODE_EMAIL_SMTP_USER="myaccount@gmail.com"           # the sending account
QRCODE_EMAIL_SMTP_PASS="abcd efgh ijkl mnop"           # an app password, not the account password
QRCODE_EMAIL_SMTP_FROM="ZapBot <myaccount@gmail.com>"  # same address as the account
QRCODE_EMAIL_SMTP_TO="You <you@example.com>"           # who receives the QR Code
QRCODE_EMAIL_SMTP_ANTIPHISHING="APhraseOnlyYouKnow"    # included in every e-mail from the bot
```

- **Host, user and password** belong to the SMTP account that **sends** (Gmail, Yahoo, other
  providers with SMTP over SSL). Use the SMTP credential your provider requires; for accounts with
  app passwords, use that password.
- **`QRCODE_EMAIL_SMTP_TO`** is the address that **receives** the QR Code (and the alerts). It can
  be the same as the sending account.
- WhatsApp renews the QR from time to time: each one arrives in a numbered e-mail (`#1`, `#2`...),
  and only the latest one is valid.
- `config/.env` stays out of git (it is in `.gitignore`), so the password never reaches the
  repository. Change the anti-phishing code to a phrase of your own: it lets you tell that the
  e-mail really came from your bot.

If something goes wrong, set `QRCODE_EMAIL_ENABLE="false"` again and scan the QR from the logs.

### Updating

`git pull`, then build and start the container again (the two `docker compose` commands above). The
volumes keep the WhatsApp session and the database. The `config/.env` variables are described in
[`docs/configuracao.md`](docs/configuracao.md).

## Commands

Type them in the chat. `/help` lists the commands you can use; `/<command> -h` shows the help for
one. Commands marked **Admin** only answer your account (and extra admins: `/bot +o <person>`). By
default only you can use commands: allow the regular ones for someone with
`/bot +v <person|group>` (or for everyone, with `/set bot.users true`); `/whois` tells you your
level.

| Command | Aliases | Admin | Description |
|---|---|:-:|---|
| [`/alias`](docs/comandos/alias.md) | | ✅ | Creates, lists and removes shortcuts for commands with arguments or texts with several `{/command}` |
| [`/ascii`](docs/comandos/ascii.md) | | | The text in big ASCII letters, in a block that fits a phone screen |
| [`/backup`](docs/comandos/backup.md) | `/bkp` | ✅ | Daily local backup and delivery via `backup.to`; lists, details, restores and sends the database |
| [`/block`](docs/comandos/block.md) | `/bloquear` | ✅ | Blocks one or more people on your WhatsApp account (replying to a message, its author); with nothing, lists the blocked ones; `-mask` hides phone numbers |
| [`/boletos`](docs/comandos/boletos.md) | | | Picks 2 members at random to "pay a bill" |
| [`/bot`](docs/comandos/bot.md) |  | ✅ | Bot status (24 h report and users); turns commands on/off (`-on`/`-off`) and sets who uses them: admins (`+o`/`-o`) and users (`+v`/`-v`, in any chat or only in one group, and each one's commands with `+cmd`/`-cmd`); `-reset` restores the defaults; `-status` (`-s`): last 24 h report, and `-s 06h` sends it daily; `-info` (`-i`): versions and system |
| [`/cache`](docs/comandos/cache.md) |  | ✅ | Cache tree with sizes, message counts and cleanup |
| [`/cotacao`](docs/comandos/cotacao.md) | `/cambio` | | EUR and USDT (and USD, GBP) against the Brazilian real: current, open, close and change; price alerts |
| [`/cron`](docs/comandos/cron.md) | `/agenda`, `/lembrete` | ✅ | At the set time (`30m`, `às 18h`, `sexta 9h`...): sends a message (here or with `-to`, to one or more chats) or, as `/lembrete`, a ⏰ reminder; can repeat, be edited and paused, and run commands in the text (`{/crypto}`) |
| [`/crypto`](docs/comandos/crypto.md) | `/bitcoio`, `/creptomoeda` | | Prices of the enabled cryptos (default: BTC, ETH, SOL and HYPE) or only the requested ones (`BTC ETH`); price alerts |
| [`/cve`](docs/comandos/cve.md) | | | Latest published CVEs (NVD), one CVE by id or a text search; `-highscore` only the critical ones |
| [`/debug`](docs/comandos/debug.md) | `/d`, `/dbg` | ✅ | Debug logs with levels, filters and copies to chats |
| [`/defi`](docs/comandos/defi.md) | | ✅ | Orca and Project X liquidity positions: balance, range, price and uncollected fees, read on-chain; `-alerta` warns when a position leaves and re-enters its range and when fees pass a value. `liquidswap`: LP positions on Aptos. `morpho` and `aave`: position, loans and risk on Morpho and Aave V3 |
| [`/desenhe`](docs/comandos/desenhe.md) | `/desenha`, `/draw`, `/img` | ✅ | Draws an image with GPT Image (OpenAI); `-gif` makes an animated GIF, also from a photo |
| [`/enquete`](docs/comandos/enquete.md) | `/quiz` | ✅ | Creates a native WhatsApp poll in the chat; `-r` shows the result |
| [`/get`](docs/comandos/get.md) | `/download` | | Downloads video/audio from social networks or the replied media |
| [`/giphy`](docs/comandos/giphy.md) | `/gif` | | A GIPHY GIF by tag, URL or ID, sent looping |
| [`/gpt`](docs/comandos/gpt.md) | `/ai` | ✅ | Asks ChatGPT (OpenAI) |
| [`/haha`](docs/comandos/haha.md) | `/kkk`, `/rs` | | A random laugh in one of four styles; when replying, it goes on top of the message |
| [`/help`](docs/comandos/help.md) | `/h` | | Help menu, with only the commands the requester can use |
| [`/joke`](docs/comandos/joke.md) | `/piada`, `/humor` | | A random joke in Portuguese |
| [`/kernel`](docs/comandos/kernel.md) | | | Current Linux kernel versions (kernel.org) |
| [`/listageral`](docs/comandos/listageral.md) | `/list` | ✅ | Lists the group members |
| [`/me`](docs/comandos/me.md) | | | Sends the typed message; `{/command}` runs and its reply takes its place, `\n` breaks the line |
| [`/meme`](docs/comandos/meme.md) | | | A random meme template (imgflip) |
| [`/monitor`](docs/comandos/monitor.md) | | ✅ | 👀 Up to 5 contacts, bounded history, per-contact filter and online alerts |
| [`/mute`](docs/comandos/mute.md) | `/mudo` | ✅ | Silences deleted, edited, status and reaction alerts (and the `/watch` ones) from a person, group or community; replying to an alert, from where it came |
| [`/news`](docs/comandos/news.md) | | | RSS feed headlines: `-hack`, `-g1`, `-gazeta`, `-brasil` |
| [`/noffa`](docs/comandos/noffa.md) | `/🌈`, `/🏳️‍🌈` | | Decorates the text with a rainbow |
| [`/ping`](docs/comandos/ping.md) |  | | Checks that the bot is alive |
| [`/pixelart`](docs/comandos/pixelart.md) | `/ansi`, `/px` | | Random ANSI/ASCII art (16colo.rs) |
| [`/profile`](docs/comandos/profile.md) | `/perfil` | ✅ | A contact's profile picture, with the name in your address book and the phone number |
| [`/search`](docs/comandos/search.md) | `/buscar` | ✅ | Searches the WhatsApp Web history, not just the cache: in this chat or, in your private chat, in all of them (`-N` for more); `-mask` hides phone numbers |
| [`/set`](docs/comandos/set.md) | `/config` | ✅ | Lists and changes the settings; `-a`/`-rem` add and remove list items (e.g. `bot.admins` and `bot.users`) |
| [`/show`](docs/comandos/show.md) |  | ✅ | In private, lists the cache; shows deleted messages again, edits (`-e`), statuses (`-s`) and removed or changed reactions (`-r`); `-q` searches (text or regex) and `-mask` hides phone numbers |
| [`/stats`](docs/comandos/stats.md) | | ✅ | Ranking for this chat or another (`/Group/`): who talks, deletes and edits the most, peak hours; `-me` for yours, `-l` lists the chats, `-flush` deletes |
| [`/sticker`](docs/comandos/sticker.md) |  | | A sticker from an image, video or link (the `/get -st`); with `-txt`, an animated text sticker |
| [`/tempo`](docs/comandos/tempo.md) | `/weather` | | Current weather and the day's max/min (Open-Meteo); `/tempo 16d` shows up to 16 days, including today; without a city it uses `tempo.city` |
| [`/tldr`](docs/comandos/tldr.md) | `/resumo` | ✅ | Summarizes the chat conversation with ChatGPT (`2h`, `300`...) |
| [`/todos`](docs/comandos/todos.md) | `/todes` | ✅ | Mentions everyone in the group |
| [`/traduzir`](docs/comandos/traduzir.md) | `/translate` | | Translates the text or the replied message (Google Translate); `-para en` changes the language |
| [`/unblock`](docs/comandos/unblock.md) | | ✅ | Unblocks a person: by name, number, `/block` list number or by replying to a message |
| [`/unmute`](docs/comandos/unmute.md) | | ✅ | Undoes a `/mute`: by name, list number, replying to an alert or all of them (`-all`) |
| [`/uptime`](docs/comandos/uptime.md) |  | | Running and connected time |
| [`/version`](docs/comandos/version.md) |  | | Bot version (same banner as `/uptime`) |
| [`/walissu`](docs/comandos/walissu.md) | `/ualisu` | ✅ | Walissu CVE BOT: tags 2 members with a random CVE |
| [`/watch`](docs/comandos/watch.md) |  | ✅ | Text/regex rules, with an optional source in `-in`; lists hits, searches them with `-q` and alerts the `-to` targets; `-mask` hides phone numbers |
| [`/whois`](docs/comandos/whois.md) | `/who`, `/id` | | Who someone is and what they can do in the bot, in this chat: 🤖 owner, 👑 admin, 🗣️ user or 🚫 no permission; the owner and admins can check others |

## Documentation (pt_BR)

| Page | Contents |
|---|---|
| [Instalação](docs/instalacao.md) | Requirements, installation, updating and the QR Code |
| [Configuração](docs/configuracao.md) | `config/.env`, external services and API keys |
| [E-mails](docs/emails.md) | QR Code by e-mail, anti-phishing code and e-mail alerts |
| [Comandos](docs/comandos/index.md) | One page per command, with options and examples |
| [Settings](docs/settings.md) | Settings you can change with `/set` |
| [Operação](docs/operacao.md) | Day-to-day operation, container health (heartbeat) and troubleshooting |
| [Desenvolvimento](docs/desenvolvimento.md) | Code structure, tests, documentation and releases |

## Development

```bash
make deps         # development dependencies, without downloading Chromium
make test         # tests, no network or WhatsApp needed (Node 22.13+)
make lint         # ESLint
make check        # lint, tests and docs in strict mode
```

The code lives in `src/` (`app.js` only bootstraps). See
[`docs/desenvolvimento.md`](docs/desenvolvimento.md) for the structure, tests and documentation.

---

**Original author:** Jorge Pereira ([@jpereira](https://github.com/jpereira)) ·
upstream: [jpereira/zapbot](https://github.com/jpereira/zapbot)
**License:** [MIT](LICENSE)
