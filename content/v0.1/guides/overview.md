---
title: What LeSysBot is
description: The shape of the project in five minutes — what it does, what it deliberately does not do, and whether it fits what you want.
section: Introduction
---

LeSysBot is a small assistant that runs on one machine — usually a machine you own and occasionally need to reach when you are not sitting in front of it. You talk to it over a chat app, it talks to a language model running locally, and the model can call tools that do things on that machine: report temperatures, measure the link speed, check what is filling the disk, restart it, or power it off.

```
You: how hot is it running right now?
Bot: CPU 41–47 °C across 16 cores, GPU 38 °C. Nothing to worry about.

You: how much space is left on /?
Bot: 45 GB free out of 200 GB — 78% used.
```

The whole system is three layers that know very little about each other:

| Layer | What it does | Swap it for |
|---|---|---|
| Messaging | Receives your text, sends replies | Terminal, Telegram, Slack, or an adapter you write |
| Agent | Runs the model, decides which tools to call | Any OpenAI-compatible endpoint |
| Tools | Does the actual work on the machine | Any folder with a `README.md` and a `tool.py` |

Because the layers are independent, the interesting question — "can it do X?" — almost always resolves to "write a tool". A tool is a folder. Drop it in, and it is live without a restart.

## The decisions worth knowing up front

**It runs against a local model by default.** The stock configuration points at Ollama on `localhost:11434`. Your messages, and the output of every tool call, stay on your hardware. You can point it at OpenAI instead by changing one URL — but then the machine's temperatures and disk usage travel to someone else's server, and that should be a decision you make deliberately rather than a default you inherit.

**An install leaves three things running.** A background service (systemd, launchd, or Task Scheduler — whichever your OS uses), the [control panel](management-ui.md) it serves at `http://127.0.0.1:8700`, and a [Grafana dashboard](monitoring.md) of the machine's CPU, memory, disk, network, and GPU. All of them bind to localhost only. Chat is the fourth thing, and the only one that reaches off the machine — which is why the allow-list below matters. Running `lesysbot` with no arguments prints the health of all four and exits without starting anything.

**Destructive tools ask first.** Anything that powers the machine down declares a confirmation string, and LeSysBot will not run it until you answer. The power tools go further and schedule the shutdown a minute out, so the reply reaches you before the network drops and you still have a window to cancel it.

**Tools are ordinary Python that you are trusting.** Installing a tool package from GitHub means running that author's code with your user's permissions on your machine. There is no sandbox. The [trust model](installing-tools.md) is exactly the same as `pip install` — read what you install, and prefer refs you have pinned.

**Nothing needs root.** No tool shells out through `sudo` or ships a sudoers rule, and the installer never asks for a password. Where a reading genuinely cannot be had unprivileged, the tool says so rather than elevating.

**The allow-list is the security boundary.** A Telegram bot with no `allowed_user_ids` will answer anyone who finds it, and it can power off your machine. The install wizard refuses to accept a blank list for this reason. See [Security](security.md).

## What it is not

It is not a fleet manager — one install talks to one machine. It is not a general-purpose coding agent; the tools are deliberately small and single-purpose. And it is not a hosted service: there is no account, no server of ours in the path, and nothing to sign up for.

## Where to go next

If you want it running, start with [Getting started](getting-started.md) — the wizard handles the model, the chat app, and the background service in one pass. If you would rather understand the machinery first, read [How it works](architecture.md). If you already have it running and want to extend it, go straight to [Write a tool](writing-tools.md).
