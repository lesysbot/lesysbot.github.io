---
title: Security
description: Who can talk to your bot, what a tool is allowed to do, and where the secrets live.
section: Everyday use
---

LeSysBot is an assistant that can power off your computer, and it listens on a chat network. That combination deserves a few minutes of thought before you leave it running unattended.

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

A tool package is Python that LeSysBot imports and calls. It runs as your user, with your permissions, unsandboxed. Installing one from GitHub is the same act of trust as `pip install` from an unfamiliar author.

Three things reduce the blast radius, and none of them are a sandbox:

- **Confirmation.** Tools that do something irreversible declare a confirmation string. LeSysBot refuses to run them until you answer in the chat. This protects you against the *model* misfiring, not against a hostile tool author — a malicious tool simply would not declare one.
- **Pinning.** `lesysbot tools install owner/repo@v1.0.0` pins to a git ref. The installed package's version and exact commit SHA land in `tools.lock.json`, so you can always tell what is actually running.
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

Every setting can also be overridden with a `LESYSBOT_`-prefixed environment variable, which is the cleaner path for systemd units and containers. Environment variables win over config files.

The traces log at `logs/traces.jsonl` records tool calls and their results. That is genuinely useful when debugging and it is also a plain-text record of everything your tools returned — treat it as sensitive, and do not attach it to a bug report without reading it first.

## 4. What listens, and where

**The bot process opens no port.** It reaches out to your LLM backend and to
Telegram or Slack, but nothing listens for inbound connections to the bot, so
there is no chat-facing web surface to authenticate, firewall, or accidentally
expose on `0.0.0.0`. The only ways to reach the bot are the chat platform you
configured — governed by `allowed_user_ids` above — and the terminal session you
start yourself.

Two **optional** parts of the project do listen, and both are deliberately bound
to `127.0.0.1` only, so neither is reachable from your network:

- The [management UI](management-ui.md) (`lesysbot manage`, or bare `lesysbot` in
  a terminal) — a local web panel for config and tools. It is loopback-only, it
  rejects requests whose `Host` header isn't localhost (blocking DNS-rebinding),
  and it has no login: anyone who can open it *on the machine* can change your
  config, so treat it exactly like shell access. Don't forward its port.
- The [monitoring stack](monitoring.md) — Prometheus, Grafana, and the exporters,
  a separate set of processes you start by hand. Every port binds `127.0.0.1`.
  Grafana ships with an `admin`/`admin` login you should change.

For either, if you ever publish it deliberately, put it behind a reverse proxy
with TLS and auth rather than moving the bind off loopback.

If you add a *tool* that opens a listener, that is your exposure to reason about:
it inherits the bot's privileges, and nothing in LeSysBot will authenticate it
for you.

## A reasonable default posture

For a personal machine reachable over Telegram:

- Set `allowed_user_ids` to exactly your own ID.
- Keep the token in the environment, not in `config.yaml`.
- Install the official tool collections and read anything else before installing it.
- Keep tools unprivileged — nothing in LeSysBot needs `sudo`.

That covers the realistic failure modes. The remaining risk is that a model with tool access does something you did not intend — which is what the confirmation prompts are for, and why the shutdown tools give you a minute to change your mind.
