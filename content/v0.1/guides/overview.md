---
title: What is LeSysBot?
description: A chat assistant for your own Linux machine, running a model on your own hardware.
section: Start here
---

LeSysBot lets you chat with a Linux machine you own. Ask a question in plain
words — from the terminal, Telegram or Discord — and it answers using tools that
read and control the machine.

```
You: how hot is it running right now?
Bot: CPU 41–47 °C across 16 cores, GPU 38 °C. Nothing to worry about.

You: how much space is left on /?
Bot: 45 GB free out of 200 GB — 78% used.
```

## What you get

- **A local model.** It runs on your hardware with Ollama. No account, no cloud.
- **15 tools, ready to use.** Disk, temperatures, network checks, speed test,
  reboot and power off, and more.
- **Chat from anywhere.** Terminal, Telegram or Discord.
- **A control panel** at `http://127.0.0.1:8700` for settings and tools.
- **Graphs over time** in Grafana — CPU, memory, disk, network and GPU.
- **Easy to extend.** A tool is one small Python file.

## Good to know

- **Linux only.** Any distribution with `systemd` and Python 3.11+.
- **It asks first.** Reboot and power off wait for your yes — and then wait
  another minute, so you can still cancel.
- **Only you can use it.** The bot answers only the chat accounts you list.
- **Nothing needs root**, and nothing is exposed to your network.
- **One machine per install.** It isn't a fleet manager or a hosted service.

## Next

**[Getting started](getting-started.md)** takes about five minutes.
