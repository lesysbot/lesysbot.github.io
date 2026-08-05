---
title: Security
description: Who can talk to your bot, what a tool is allowed to do, and where the secrets live.
section: Everyday use
---

LeSysBot is an assistant that can power off your computer, and it listens on a chat network. That combination deserves a few minutes of thought before you leave it running unattended.

There are five boundaries worth understanding, roughly in order of how badly they go wrong when you get them right or wrong.

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

The setup wizard will not accept a blank list; it re-prompts until you give at least one numeric ID. If you are writing `config.yaml` by hand you are on your own, so check it.

To find your own numeric ID, message `@userinfobot` on Telegram.

Slack is different: there is no per-user allow-list, because the workspace itself is the boundary — anyone in the workspace you installed the app into can DM the bot. Only install it into a workspace whose every member you would trust with a shell on that machine. Either way the principle is the same — the set of people who can reach the bot is the set of people who can run every tool you have installed.

## 2. What a tool is allowed to do

A tool package is Python that LeSysBot imports and calls. It runs as your user, with your permissions, unsandboxed. Installing one from GitHub is the same act of trust as `pip install` from an unfamiliar author.

Three things reduce the blast radius, and none of them are a sandbox:

- **Confirmation.** Tools that do something irreversible declare a confirmation string. LeSysBot refuses to run them until you answer in the chat. This protects you against the *model* misfiring, not against a hostile tool author — a malicious tool simply would not declare one.
- **Pinning.** `lesysbot install owner/repo@v1.0.0` pins to a git ref. The installed package's version and exact commit SHA land in `lesysbot.lock.json`, so you can always tell what is actually running.
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

Tokens are stripped from the application log before it is written, so `logs/lesysbot.log` is safe to share. The traces log at `logs/traces.jsonl` is different: it records tool calls and their results, which is genuinely useful when debugging and is also a plain-text record of everything your tools returned. Treat it as sensitive, and read it before attaching it to a bug report.

## 4. What you publish on purpose

One bundled tool deliberately makes something public: `share_dashboard` uploads a snapshot of your Grafana dashboard to `snapshots.raintank.io` and returns a link that **anyone who has it can open**. That is the point of the feature, but the snapshot contains your machine's metrics for the window it captured.

Snapshots expire (an hour by default), `/list_snapshots` shows what is still live, and `/delete_snapshot` takes one down — though a CDN may serve a cached copy for up to an hour after deletion. Do not share one from a machine whose metrics you would not post publicly.

## 5. What listens, and where

**Nothing listens for the bot itself.** The agent reaches out to your LLM backend
and to Telegram or Slack, but no inbound connection reaches it, so there is no
chat-facing web surface to authenticate, firewall, or accidentally expose on
`0.0.0.0`. The only ways to reach the bot are the chat platform you configured —
governed by `allowed_user_ids` above — and the terminal session you start
yourself.

Two things do listen, and both are deliberately bound to `127.0.0.1` only, so
neither is reachable from your network:

- The [control panel](management-ui.md) at `http://127.0.0.1:8700` — a local web
  page for config, tools, and health. The background service keeps it up, so
  unlike everything else here it is **always on**. It is loopback-only by
  construction (the host is not configurable, only the port), it rejects requests
  whose `Host` header isn't localhost (blocking DNS-rebinding), and it has no
  login: anyone who can open it *on the machine* can change your config, so treat
  it exactly like shell access. It also displays your real `config.yaml`, secrets
  included — keep tokens in environment variables if that matters to you. Don't
  forward its port.
- The [monitoring stack](monitoring.md) — Prometheus, Grafana, and the exporters,
  a separate set of containers the installer sets up. Every port binds
  `127.0.0.1`. Grafana starts with the login you chose during setup, which
  defaults to `admin`/`admin` — change it if you haven't.

For either, if you ever publish it deliberately, put it behind a reverse proxy
with TLS and auth rather than moving the bind off loopback.

If you add a *tool* that opens a listener, that is your exposure to reason about:
it inherits the bot's privileges, and nothing in LeSysBot will authenticate it
for you.

## A reasonable default posture

For a personal machine reachable over Telegram:

- Set `allowed_user_ids` to exactly your own ID.
- Keep the token in the environment, not in `config.yaml`.
- Install the official package collection and read anything else before installing it.
- Keep tools unprivileged — nothing in LeSysBot needs `sudo`.

That covers the realistic failure modes. The remaining risk is that a model with tool access does something you did not intend — which is what the confirmation prompts are for, and why the shutdown tools give you a minute to change your mind.
