---
title: System monitoring
description: An optional Prometheus + Grafana stack that graphs CPU, memory, disk, network, temperatures, and GPU as time series — on Linux, macOS, and Windows.
section: Keep it running
source: monitoring/README.md
---

Sometimes you want more than a one-off "what's the temperature?" — you want to
watch a machine over time: the CPU climbing under a build, the GPU heating up,
a disk filling. LeSysBot ships an optional monitoring stack for exactly that. It
records **CPU, memory, disk, network (per interface, so Ethernet and Wifi are
separate), temperatures, and NVIDIA GPU** as time series and draws them on a
ready-made Grafana dashboard.

It is deliberately **separate from the bot**. LeSysBot itself still opens no
network listener; this is a companion you start by hand when you want graphs.
Everything it exposes binds to `127.0.0.1` only — nothing appears on your LAN —
and none of it needs `sudo` or admin rights.

## What you need

One thing: **Docker** with Compose v2.

```bash
docker compose version      # should print "v2.x"; if not, install Docker first
```

Install it if missing — Docker Desktop on
[Windows](https://docs.docker.com/desktop/install/windows-install/) or
[macOS](https://docs.docker.com/desktop/install/mac-install/), or
[Docker Engine](https://docs.docker.com/engine/install/) on Linux. Prometheus,
Grafana, and the metric exporters all download and configure themselves the
first time you start the stack — there is nothing else to install or wire up.

The stack lives in the `monitoring/` folder of the
[core repo](https://github.com/lesysbot/lesysbot). If you installed LeSysBot
with `pip` and don't have a checkout, clone it first:

```bash
git clone https://github.com/lesysbot/lesysbot
cd lesysbot/monitoring
```

## Starting it

One command, from the `monitoring/` folder. It detects your OS and your GPU and
does the right thing.

```bash
./scripts/start.sh          # Linux and macOS
```

```powershell
.\scripts\start.ps1          # Windows (PowerShell)
```

Then open **http://localhost:3000** and log in with `admin` / `admin` (change it
before you expose Grafana anywhere). The dashboard is in the **LeSysBot** folder.
Stop the stack again with `./scripts/start.sh down` (or `.\scripts\start.ps1
down`).

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

If you run the bot as well, you can hand the dashboard to someone with a text
message. The bundled `share-dashboard` tool turns **"share me the dashboard"**
into a public link: it publishes a point-in-time *snapshot* — the current graphs
baked in as data — *through Grafana* to its public snapshot server, so the
recipient sees a live-looking dashboard without any access to your machine or
your Grafana.

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
share through the bot to keep it removable. The tool reaches Grafana at
`localhost:3000` by default; point it elsewhere with `LESYSBOT_GRAFANA_URL` if you
changed the port.

## Where it sits with the rest of LeSysBot

The [security](security.md) boundaries for the bot are unchanged — this stack is
a separate process family, not a listener bolted onto LeSysBot. Because it binds
only to `127.0.0.1`, the exposure is the same as anything else you run locally.
If you deliberately publish Grafana, put it behind a reverse proxy with TLS
rather than moving the bind off loopback.

The full reference — every port, the `.env` overrides, how the dashboards are
generated, and a troubleshooting list — lives in
[`monitoring/README.md`](https://github.com/lesysbot/lesysbot/blob/main/monitoring/README.md)
in the core repo.
