---
title: System monitoring
description: The Prometheus + Grafana dashboard every install sets up — CPU, memory, disk, network, temperatures, and GPU as time series, on Linux, macOS, and Windows.
section: Keep it running
source: dashboard/README.md
---

Sometimes you want more than a one-off "what's the temperature?" — you want to
watch a machine over time: the CPU climbing under a build, the GPU heating up,
a disk filling. That is what the monitoring stack is for. It records **CPU,
memory, disk, network (per interface, so Ethernet and Wifi are separate),
temperatures, and NVIDIA GPU** as time series and draws them on a ready-made
Grafana dashboard.

**You probably already have it.** It is a standard part of LeSysBot, not an
add-on: `lesysbot setup` — the wizard the installer runs — copies the stack into
`~/.lesysbot/dashboard`, asks which Grafana login to use, and starts it. A
normal install leaves Grafana on **http://localhost:3000**, and `lesysbot` links
to it from the status screen.

Everything it exposes binds to `127.0.0.1` only — nothing appears on your LAN —
and none of it needs `sudo` or admin rights. It runs as its own processes beside
LeSysBot rather than inside it: containers on Linux and Windows, Homebrew
services on macOS.

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

Neither **macOS** nor **Windows** requires Docker Desktop. On macOS the installer
uses Homebrew and does the whole thing for you — Grafana, Prometheus and the host
exporter, running under `brew services`. It asks one extra question there:
whether to install a small helper for CPU/GPU die temperature, defaulting to no
(see [Temperatures, honestly](#temperatures-honestly)). On Windows it points you
at a native [Grafana download](https://grafana.com/grafana/download) and explains
how to connect it, mentioning the one-command Docker stack only if Docker happens
to be running. LeSysBot finds Grafana on `localhost:3000` either way.

Set `LESYSBOT_SKIP_DASHBOARD` before running setup to skip the whole step —
useful for unattended installs.

## Starting and stopping it by hand

From `~/.lesysbot/dashboard` (or the `dashboard/` folder of a checkout):

```bash
./scripts/install-macos.sh   # macOS — Homebrew, no Docker needed
./scripts/install-macos.sh down

./scripts/start.sh           # Linux — up
./scripts/start.sh down      # stop it again
```

```powershell
.\scripts\start.ps1          # Windows (PowerShell)
.\scripts\start.ps1 down
```

One command, either way: each script inspects the machine — chip, sensors, GPU —
and does the right thing. Then open **http://localhost:3000**. The dashboard is
in the **LeSysBot** folder.

macOS has its own script because it doesn't need Docker at all: it installs
Grafana, Prometheus and the host exporter with Homebrew and runs them under
`brew services`, so they come back after a reboot. On Linux and Windows the
bundled stack needs **Docker with Compose v2**:

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

A single **System Overview** dashboard, titled for the machine it was built for —
*Linux*, *macOS (Apple Silicon)*, *Windows*. It shows:

- **CPU** — busy percentage, per-mode usage, load average, core count
- **Memory** — used, cached, available, and swap
- **Disk** — space used per filesystem, read/write throughput
- **Network** — receive and transmit per interface; the interface name tells
  Ethernet from Wifi
- **Temperatures** — whichever sensors your machine actually has (see below)
- **GPU** — NVIDIA utilization, memory, temperature and power draw, or Apple GPU
  utilization and memory on a Mac

## It is built for your machine

An empty panel and a broken panel look identical. So rather than shipping one
dashboard with every panel for every platform and letting the misses render
blank, **each start script checks what the host can actually report and leaves
out the rest**. After that, an empty panel means something is genuinely wrong —
which is the whole point.

What gets checked:

| Your OS | Checked | Effect |
|---|---|---|
| **Linux** | which sensor chips the kernel has bound (`/sys/class/hwmon`), ACPI thermal zones, `nvidia-smi` | CPU, disk and AMD-GPU temperature panels appear only when a chip can answer them |
| **macOS** | Apple Silicon or Intel, `nvidia-smi` | Intel adds CPU throttling panels; the NVIDIA row is left out, since no macOS NVIDIA driver has existed since Mojave |
| **Windows** | whether the running exporter *actually serves* ACPI thermal zones, `nvidia-smi` | the temperature row appears only if your firmware publishes anything — common on laptops, rare on desktops |

GPU metrics key on **`nvidia-smi`, never on the card**: the exporter works by
shelling out to it, so a GPU without a driver can't be read by anything. When the
hardware is there but the tool isn't, the script says so and names what to
install rather than quietly dropping the row.

Each script also prints **optional add-ons** at the end — things that would fill
in more panels, like the exact `modprobe` for a missing Linux sensor driver, or a
temperature helper on macOS. They are suggestions, never errors, and never run
for you.

Some things still decide themselves at runtime, as before: Linux runs everything
on the host network bound to localhost (so it reads the real network interfaces,
and sidesteps the firewall rule that blocks a container from reaching the host),
and picks a containerised GPU exporter when the NVIDIA container toolkit is
present or a native one when it isn't. Windows runs Prometheus and Grafana in
Docker Desktop with the host exporter native, reached over
`host.docker.internal`, because Docker Desktop's VM can't see the real host.

### Temperatures, honestly

Coverage follows what each OS exposes without `sudo`, and that varies a lot:

- **Linux** is the richest — CPU package and per-core, NVMe/SATA disks, chipset
  and Wifi radio, AMD GPU. If a driver simply isn't loaded, the start script
  prints the `modprobe` that would fix it.
- **macOS** gives you battery temperature and full Apple GPU utilization and
  memory out of the box. **CPU and GPU die temperature need a small helper** —
  Apple publishes those only through a private framework or root-only
  `powermetrics`, and LeSysBot never uses `sudo`. The macOS installer offers to
  install one (defaulting to no); or run
  `brew install vladkens/tap/macmon` yourself and the tiles fill within 15
  seconds.
- **Windows** shows ACPI thermal zones when the firmware provides them. There is
  no per-component CPU or disk sensor on Windows without a tool like
  LibreHardwareMonitor.

### Keeping it current

Re-running setup (`lesysbot setup`, or the installer) refreshes the
stack's scripts and dashboards in `~/.lesysbot/dashboard`, while never touching
the two things you own: `.env` (ports and Grafana login) and `prometheus/` (any
scrape targets you added). Re-run your OS's start script afterwards so the
dashboard is rebuilt for the current hardware.

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
`~/.lesysbot/dashboard/.env`.

The full reference — every port, the `.env` overrides, how the dashboards are
generated, and a troubleshooting list — lives in
[`dashboard/README.md`](https://github.com/lesysbot/lesysbot/blob/main/dashboard/README.md)
in the core repo.
