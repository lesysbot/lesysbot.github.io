---
title: System monitoring
description: The Prometheus + Grafana dashboard every install sets up — CPU, memory, disk, network, temperatures, and GPU as time series, on Linux, macOS, and Windows.
section: Keep it running
source: monitoring/README.md
---

Sometimes you want more than a one-off "what's the temperature?" — you want to
watch a machine over time: the CPU climbing under a build, the GPU heating up,
a disk filling. That is what the monitoring stack is for. It records **CPU,
memory, disk, network (per interface, so Ethernet and Wifi are separate),
temperatures, and NVIDIA GPU** as time series and draws them on a ready-made
Grafana dashboard.

**You probably already have it.** It is a standard part of LeSysBot, not an
add-on: `lesysbot setup` — the wizard the installer runs — copies the stack into
`~/.lesysbot/monitoring`, asks which Grafana login to use, and starts it. A
normal install leaves Grafana on **http://localhost:3000**, and `lesysbot` links
to it from the status screen.

Everything it exposes binds to `127.0.0.1` only — nothing appears on your LAN —
and none of it needs `sudo` or admin rights. It runs as its own containers,
beside LeSysBot rather than inside it.

## What the installer did

The wizard asks two things and handles the rest:

- **How to start it.** On Linux, if Docker is ready it offers to bring the stack
  up right there. If Docker isn't installed or the daemon isn't running, it
  prints the exact commands to fix that — no `sudo` prompts mid-install — and you
  can start the stack later.
- **Which Grafana login LeSysBot should use.** Defaults to `admin` / `admin`; the
  password is typed masked. It is saved to `~/.lesysbot/grafana.env` (readable
  only by you) and applied to the bundled Grafana's first boot, which is how the
  status screen and the `share-dashboard` tool authenticate later.

On **macOS and Windows** the installer deliberately does *not* require Docker
Desktop. If Docker is running it offers the same one-command stack; otherwise it
points you at a native [Grafana download](https://grafana.com/grafana/download)
and explains how to connect it. LeSysBot finds Grafana on `localhost:3000`
either way.

Set `LESYSBOT_SKIP_MONITORING` before running setup to skip the whole step —
useful for unattended installs.

## Starting and stopping it by hand

From `~/.lesysbot/monitoring` (or the `monitoring/` folder of a checkout):

```bash
./scripts/start.sh          # Linux and macOS — up
./scripts/start.sh down     # stop it again
```

```powershell
.\scripts\start.ps1          # Windows (PowerShell)
.\scripts\start.ps1 down
```

One command, either way: it detects your OS and your GPU and does the right
thing. Then open **http://localhost:3000**. The dashboard is in the **LeSysBot**
folder.

The only prerequisite for the bundled stack is **Docker with Compose v2**:

```bash
docker compose version      # should print "v2.x"; if not, install Docker first
```

Install it if missing — Docker Desktop on
[Windows](https://docs.docker.com/desktop/install/windows-install/) or
[macOS](https://docs.docker.com/desktop/install/mac-install/), or
[Docker Engine](https://docs.docker.com/engine/install/) on Linux. Prometheus,
Grafana, and the metric exporters all download and configure themselves the
first time you start the stack — there is nothing else to install or wire up.

## What you get

A single **System Overview** dashboard — the one that matches the OS you started,
so you never see an empty dashboard meant for another platform. It shows:

- **CPU** — busy percentage, per-mode usage, load average, core count
- **Memory** — used, cached, available (and swap on Linux)
- **Disk** — space used per filesystem, read/write throughput
- **Network** — receive and transmit per interface; the interface name tells
  Ethernet from Wifi
- **Temperatures** — CPU, disk, GPU, and other sensors (see coverage below)
- **GPU** — NVIDIA utilization, memory, temperature, and power draw

## It adapts to your OS

The point of this stack is that the *same* one command works everywhere, so a
few things decide themselves at runtime:

- **Linux** runs everything on the host network, bound to localhost — which lets
  it read the real network interfaces and sidesteps the firewall rule that
  otherwise blocks a container from reaching the host. GPU metrics run as a
  container when the NVIDIA container toolkit is present, and as a small native
  exporter when it isn't. Either way you get GPU graphs; you don't choose.
- **macOS and Windows** run Prometheus and Grafana in Docker Desktop and the
  host exporter natively (Docker Desktop can't see the real host from inside its
  VM), reached over `host.docker.internal`.

Temperature coverage follows what each OS actually exposes, with no `sudo`:
Linux is the richest (CPU package and cores, NVMe/SATA disks, chipset and Wifi
radio); macOS surfaces only the GPU through `nvidia-smi`; Windows shows ACPI
thermal zones when the firmware provides them (common on laptops, rare on
desktops). Panels for sensors your hardware doesn't have simply stay empty.

## Sharing a snapshot from chat

You can hand the dashboard to someone with a text message. The bundled
`share-dashboard` tool turns **"share me the dashboard"** into a public link: it
publishes a point-in-time *snapshot* — the current graphs baked in as data —
*through Grafana* to its public snapshot server, so the recipient sees a
live-looking dashboard without any access to your machine or your Grafana.

```
You:  share me the dashboard for a day
Bot:  📊 Dashboard shared — expires in 1d:
      https://snapshots.raintank.io/dashboard/snapshot/…
```

You choose how long the link lives (an hour up to a month, or never), you can
list everything you've shared, and you can delete any of them again — *"list my
shared dashboards"*, *"delete snapshot 1"*. Since each link is a **public** copy
of your metrics, share deliberately and delete what you no longer need. Two things
to expect: a link you just deleted may keep loading for up to an hour while the
snapshot server clears its cache, and a snapshot you publish from Grafana's own
browser button (rather than through the bot) can't be deleted by the bot — so
share through the bot to keep it removable.

The tool **finds Grafana by itself** — it checks the port your stack actually
uses, then the usual `3000`/`3001`, and verifies that Grafana really answers
there. So a stack that landed on 3001 because something else owned 3000 still
works. Set `LESYSBOT_GRAFANA_URL` only if Grafana runs somewhere unusual; even
then it is verified before use.

## Where it sits with the rest of LeSysBot

The [security](security.md) boundaries are unchanged — this stack is a separate
process family, not a listener bolted onto LeSysBot. Because it binds only to
`127.0.0.1`, the exposure is the same as anything else you run locally. If you
deliberately publish Grafana, put it behind a reverse proxy with TLS rather than
moving the bind off loopback. And change the Grafana password from `admin` before
you do — the wizard is the easy place to set it, or `GRAFANA_ADMIN_PASSWORD` in
`~/.lesysbot/monitoring/.env`.

The full reference — every port, the `.env` overrides, how the dashboards are
generated, and a troubleshooting list — lives in
[`monitoring/README.md`](https://github.com/lesysbot/lesysbot/blob/main/monitoring/README.md)
in the core repo.
