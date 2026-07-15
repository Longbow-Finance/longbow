# Longbow CLI

A terminal client for the Longbow protocol on Robinhood Chain. Check token
statistics and positions, read how it works, and — if you choose to connect a
wallet — open and close longs directly from your shell.

```
        )\
       /  \
      /    )
     |     |>=================>
      \    )
       \  /
        )/
```

## Run it

Nothing to install first. If you have [Node.js](https://nodejs.org) 18+:

```bash
npx longbow-cli            # interactive menu
npx longbow-cli stats      # a specific command
```

Prefer not to install Node at all? Download a **standalone binary** for your OS
from the [releases page](https://github.com/Longbow-Protocol/longbow/releases) — a single
executable, no runtime required:

```bash
./longbow-macos-arm64            # macOS (Apple Silicon)
./longbow-linux-x64              # Linux
longbow-windows-x64.exe          # Windows
```

### Run from source (PowerShell)

```powershell
cd cli
./longbow.ps1            # interactive menu
./longbow.ps1 stats      # token statistics
./longbow.ps1 how        # how it works
./longbow.ps1 ethos      # the experiment
```

The launcher installs dependencies on first run. Or with npm directly:

```bash
npm install
npm start                # interactive menu
npm start -- stats       # a specific command
```

## Distribution (maintainers)

Publishing is automated by [`.github/workflows/cli-release.yml`](../.github/workflows/cli-release.yml).
Push a tag and it builds binaries for every OS and (if an `NPM_TOKEN` secret is
set) publishes to npm:

```bash
git tag cli-v0.1.0
git push origin cli-v0.1.0
```

To build locally instead: `npm run build` (npm/npx package) or, with
[Bun](https://bun.sh) installed, `npm run binaries` (standalone executables into
`dist/bin/`).

## Configuration

Copy `.env.example` to `.env` and fill in the deployed contract addresses:

```
LONGBOW_POSITION_MANAGER=0x...
LONGBOW_LONG_TOKEN=0x...
LONGBOW_ORACLE=0x...
LONGBOW_RPC_URL=https://rpc.mainnet.chain.robinhood.com
```

Until addresses are set, read commands report that contracts aren't deployed
yet. The `how`, `jan`, and `ethos` sections work with no configuration at all.

## Security — how your private key is handled

Signing transactions requires a private key. Longbow handles it the safe way:

- The key is entered at a **masked prompt** (or read from `LONGBOW_PRIVATE_KEY`
  if you prefer an env var) and turned into an in-memory account.
- It is **held in memory only** for the session — never written to disk, never
  logged, never transmitted to the RPC or anyone else.
- viem **signs locally**; only the resulting signed transaction is broadcast.

The entire flow is a few lines in [`src/client.ts`](src/client.ts) — read it.
Never paste a key you are not comfortable using, and never commit a real key.

## Commands

| Command | Description |
| --- | --- |
| `longbow` | interactive menu |
| `longbow stats` | token statistics |
| `longbow positions <addr>` | open positions for an address |
| `longbow open <eth> <mult>` | open a long (needs `LONGBOW_PRIVATE_KEY`) |
| `longbow close <id>` | close a position (needs `LONGBOW_PRIVATE_KEY`) |
| `longbow how` | how it works |
| `longbow jan` | about Little Jan |
| `longbow ethos` | the experiment |
