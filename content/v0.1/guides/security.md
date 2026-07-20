---
title: Security
description: Who can talk to your bot, what a tool is allowed to do, and where the secrets live.
section: Everyday use
---

SysBot is an assistant that can power off your computer, and it listens on a chat network. That combination deserves a few minutes of thought before you leave it running unattended.

There are four boundaries worth understanding, roughly in order of how badly they go wrong when you get them right or wrong.

## 1. Who is allowed to talk to the bot

This is the one that matters most.

A Telegram bot token is a public endpoint. Anyone who learns your bot's username can message it. The only thing standing between a stranger and your `power_off` tool is `allowed_user_ids`:

```yaml
messaging:
  provider: telegram
  telegram:
    token: ${TELEGRAM_TOKEN}
    allowed_user_ids: [5368827402]
```

**An empty list means everyone is allowed.** The runtime treats a blank allow-list as "no filter configured" and warns loudly at startup, but it still starts. Do not rely on that warning — it scrolls past in a log you are not reading.

The install wizards (`install.sh` and `install.ps1`) will not accept a blank list; they re-prompt until you give at least one numeric ID. If you are writing `config.yaml` by hand you are on your own, so check it.

To find your own numeric ID, message `@userinfobot` on Telegram.

Slack's model is different — the bot only sees channels it has been invited to — but the same principle applies: the set of people who can reach the bot is the set of people who can run every tool you have installed.

## 2. What a tool is allowed to do

A tool package is Python that SysBot imports and calls. It runs as your user, with your permissions, unsandboxed. Installing one from GitHub is the same act of trust as `pip install` from an unfamiliar author.

Three things reduce the blast radius, and none of them are a sandbox:

- **Confirmation.** Tools that do something irreversible declare a confirmation string. SysBot refuses to run them until you answer in the chat. This protects you against the *model* misfiring, not against a hostile tool author — a malicious tool simply would not declare one.
- **Pinning.** `sysbot tools install owner/repo@v1.0.0` pins to a git ref. The installed package's version and exact commit SHA land in `tools.lock.json`, so you can always tell what is actually running.
- **Reading the code.** Every package is a `README.md` and a `tool.py`, usually under two hundred lines. That is a realistic amount to read before you install it, which is the point of the format.

Prefer pinned refs over `main` for anything you did not write, and re-read the diff when you update.

## 3. Where the secrets live

Your bot token should not sit in a file you might paste into an issue.

`config.yaml` interpolates environment variables, so keep the token in the environment and reference it:

```yaml
messaging:
  telegram:
    token: ${TELEGRAM_TOKEN}
```

Every setting can also be overridden with a `SYSBOT_`-prefixed environment variable, which is the cleaner path for systemd units and containers. Environment variables win over config files.

The traces log at `logs/traces.jsonl` records tool calls and their results. That is genuinely useful when debugging and it is also a plain-text record of everything your tools returned — treat it as sensitive, and do not attach it to a bug report without reading it first.

## 4. The dashboards

There are two, and they have very different exposure:

**The built-in dashboard** (`sysbot.dashboard`) binds to `127.0.0.1:8765` and is disabled by default. It has no authentication of its own. That is fine while it stays on loopback; it stops being fine the moment you change `host` to `0.0.0.0` or put it behind a tunnel. If you need it remotely, front it with something that authenticates — do not expose it directly.

**The `remote-dashboard` tool** is the opposite by design: it creates a public `*.gradio.live` URL, gated by a generated passcode, reachable from anywhere. That is the whole point of it, and it means a live share link is an internet-facing door into your machine protected by one short secret. Start it when you need it, and run `stop_dashboard` when you are done rather than leaving the link alive.

## A reasonable default posture

For a personal machine reachable over Telegram:

- Set `allowed_user_ids` to exactly your own ID.
- Keep the token in the environment, not in `config.yaml`.
- Install the official tool collections and read anything else before installing it.
- Leave the built-in dashboard disabled, or on loopback.
- Stop `remote-dashboard` when you finish with it.

That covers the realistic failure modes. The remaining risk is that a model with tool access does something you did not intend — which is what the confirmation prompts are for, and why the shutdown tools give you a minute to change your mind.
