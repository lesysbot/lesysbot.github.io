---
title: Management UI
description: A localhost-only web panel to edit config and toggle, install, or remove tools — plus the status screen bare "lesysbot" shows.
section: Everyday use
source: docs/management-ui.md
---

LeSysBot has a small **web control panel** for the two things you tune most —
your **config** and your **tools** — plus an at-a-glance **status** screen. It is
**local only**: the server binds to `127.0.0.1`, so it is never reachable from
your network, and there is no login. The trust boundary is having a shell on the
machine, exactly like editing `config.yaml` by hand.

## Opening it

Run `lesysbot` with no arguments in a terminal:

```bash
lesysbot
```

It prints a status summary and a link, and serves the UI until you press Ctrl-C:

```
LeSysBot v0.1.0
  LLM backend  reachable · 42 ms
     Provider  cli · model llama3.2
        Tools  12/13 enabled
  Bot service  running (PID 12934)
      Grafana  http://localhost:3001 · v11.5.1

  Management UI: http://127.0.0.1:8700   (localhost only · Ctrl-C to stop)
```

Or explicitly, with options:

```bash
lesysbot manage --open        # also open it in your browser
lesysbot manage --port 9000   # different port
```

In a terminal, bare `lesysbot` opens this UI. To **run the bot** in the
foreground use `lesysbot run` (or `lesysbot --provider cli` for a terminal chat);
the background service runs `lesysbot run` for you, so nothing changes there. A
non-interactive `lesysbot` (no terminal) still runs the bot.

## What you can do

- **Status** — LLM backend reachability and latency, the active provider/model,
  how many tools are enabled, whether the background bot service is running, a
  **link to your Grafana** when the [monitoring stack](monitoring.md) is up
  (auto-detected on the usual ports), and where your config and tools live.
- **Tools** — enable/disable each tool (applies **live** — a running bot picks it
  up within a second), install a package from GitHub by pasting
  `owner/repo[/subdir][@ref]`, or remove one.
- **Config** — the full `config.yaml` in an editor. Saving **validates against
  the schema first** and refuses to write an invalid file. Most settings take
  effect on the next bot restart; tool enable/disable is live.

## Security

- **Loopback only.** The server binds `127.0.0.1`; the host is not configurable,
  so it can't be exposed on the LAN. It also rejects any request whose `Host`
  header isn't localhost, which blocks DNS-rebinding from a web page.
- **No authentication** — anyone who can open the URL *on the machine* can use
  it, the same access as editing your files. Don't forward the port.
- **The config editor shows secrets** (tokens, API keys) because it shows your
  real `config.yaml`. Prefer keeping secrets in environment variables referenced
  as `${VAR}` — see [Configuration](configuration.md) and [Security](security.md).

The bot process itself still opens **no** network listener; this UI is a
separate, opt-in server you start on purpose. Only the port is configurable:

```yaml
webui:
  port: 8700
```
