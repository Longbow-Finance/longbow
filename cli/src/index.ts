#!/usr/bin/env node
import { select, input, password } from "@inquirer/prompts";
import { formatEther, type Address } from "viem";
import { banner } from "./art.js";
import { lime, limeBold, dim, bold, white, gray, red, yellow, green, rule } from "./theme.js";
import { howItWorks, aboutJan, ethos } from "./content.js";
import { printStats, printPositions, openPosition, closePosition } from "./actions.js";
import { publicClient, connect, disconnect, getAccount } from "./client.js";

function safetyNotice(): void {
  console.log(
    "\n" +
      yellow("  SECURITY") +
      "\n" +
      gray("  Your private key is used ONLY on this machine to sign locally.\n") +
      gray("  It is held in memory for this session only. It is never written to\n") +
      gray("  disk, never logged, and never sent to anyone — not the RPC, not us.\n") +
      gray("  Only the signed transaction is broadcast. Verify this yourself: the\n") +
      gray("  source is right here in ") +
      white("cli/src/client.ts") +
      gray(".\n"),
  );
}

async function doConnect(): Promise<void> {
  if (getAccount()) {
    disconnect();
    console.log(gray("\n  Disconnected.\n"));
    return;
  }
  safetyNotice();
  let key = process.env.LONGBOW_PRIVATE_KEY?.trim();
  if (key) {
    console.log(gray("  Using key from LONGBOW_PRIVATE_KEY.\n"));
  } else {
    key = await password({ message: "Private key (input hidden):", mask: "*" });
  }
  try {
    const account = connect(key!);
    const bal = await publicClient.getBalance({ address: account.address });
    console.log(
      "\n  " +
        green("Connected ") +
        white(account.address) +
        gray("  \u00b7  ") +
        limeBold(`${formatEther(bal)} ETH`) +
        "\n",
    );
  } catch (e) {
    console.log(red("\n  " + (e instanceof Error ? e.message : String(e)) + "\n"));
  }
}

async function resolveAddress(): Promise<Address | undefined> {
  const acc = getAccount();
  if (acc) return acc.address;
  const a = (await input({ message: "Address to inspect (0x...):" })).trim();
  if (!/^0x[0-9a-fA-F]{40}$/.test(a)) {
    console.log(red("\n  Not a valid address.\n"));
    return undefined;
  }
  return a as Address;
}

async function doOpen(): Promise<void> {
  if (!getAccount()) {
    console.log(yellow("\n  Connect a wallet first.\n"));
    return;
  }
  const amount = (await input({ message: "Deposit amount (ETH):" })).trim();
  const mult = Number((await input({ message: "Multiplier (e.g. 2.5):", default: "2" })).trim());
  if (!Number.isFinite(mult) || mult < 1) {
    console.log(red("\n  Multiplier must be >= 1.\n"));
    return;
  }
  await openPosition(amount, mult);
}

async function doClose(): Promise<void> {
  if (!getAccount()) {
    console.log(yellow("\n  Connect a wallet first.\n"));
    return;
  }
  const id = Number((await input({ message: "Position id to close:" })).trim());
  if (!Number.isInteger(id) || id < 0) {
    console.log(red("\n  Invalid id.\n"));
    return;
  }
  await closePosition(id);
}

async function pause(): Promise<void> {
  await input({ message: dim("press enter to continue") });
}

function status(): string {
  const acc = getAccount();
  if (acc) return green("connected ") + white(acc.address.slice(0, 6) + "\u2026" + acc.address.slice(-4));
  return dim("not connected");
}

async function menuLoop(): Promise<void> {
  console.log(banner());
  for (;;) {
    console.log(rule());
    console.log("  " + dim("wallet: ") + status());
    let choice: string;
    try {
      choice = await select({
        message: "Select",
        pageSize: 10,
        choices: [
          { name: "Token statistics", value: "stats" },
          { name: "View positions", value: "positions" },
          { name: "Open a long", value: "open" },
          { name: "Close a position", value: "close" },
          { name: "How it works", value: "how" },
          { name: "About Little Jan", value: "jan" },
          { name: "The experiment", value: "ethos" },
          { name: getAccount() ? "Disconnect wallet" : "Connect wallet", value: "connect" },
          { name: "Exit", value: "exit" },
        ],
      });
    } catch {
      // Ctrl+C / non-TTY
      break;
    }

    switch (choice) {
      case "stats":
        await printStats();
        await pause();
        break;
      case "positions": {
        const addr = await resolveAddress();
        if (addr) await printPositions(addr);
        await pause();
        break;
      }
      case "open":
        await doOpen();
        await pause();
        break;
      case "close":
        await doClose();
        await pause();
        break;
      case "how":
        console.log(howItWorks());
        await pause();
        break;
      case "jan":
        console.log(aboutJan());
        await pause();
        break;
      case "ethos":
        console.log(ethos());
        await pause();
        break;
      case "connect":
        await doConnect();
        await pause();
        break;
      case "exit":
      default:
        console.log(gray("\n  Steady aim.\n"));
        disconnect();
        return;
    }
  }
  disconnect();
}

async function runCommand(argv: string[]): Promise<void> {
  const [cmd, ...rest] = argv;
  switch (cmd) {
    case "stats":
      console.log(banner());
      await printStats();
      break;
    case "positions": {
      const a = rest[0];
      if (!a || !/^0x[0-9a-fA-F]{40}$/.test(a)) {
        console.log(red("\n  Usage: longbow positions <0xaddress>\n"));
        break;
      }
      console.log(banner());
      await printPositions(a as Address);
      break;
    }
    case "open": {
      const key = process.env.LONGBOW_PRIVATE_KEY;
      if (!key) return void console.log(red("\n  Set LONGBOW_PRIVATE_KEY to open non-interactively.\n"));
      connect(key);
      await openPosition(rest[0] ?? "0", Number(rest[1] ?? "2"));
      break;
    }
    case "close": {
      const key = process.env.LONGBOW_PRIVATE_KEY;
      if (!key) return void console.log(red("\n  Set LONGBOW_PRIVATE_KEY to close non-interactively.\n"));
      connect(key);
      await closePosition(Number(rest[0] ?? "-1"));
      break;
    }
    case "how":
      console.log(howItWorks());
      break;
    case "jan":
    case "about":
      console.log(aboutJan());
      break;
    case "ethos":
      console.log(ethos());
      break;
    case "help":
    case "--help":
    case "-h":
    default:
      console.log(banner());
      console.log(bold("  Commands\n"));
      console.log("  " + limeBold("longbow") + gray("                 interactive menu"));
      console.log("  " + limeBold("longbow stats") + gray("           token statistics"));
      console.log("  " + limeBold("longbow positions <addr>") + gray("  positions for an address"));
      console.log("  " + limeBold("longbow open <eth> <mult>") + gray("  open a long (needs LONGBOW_PRIVATE_KEY)"));
      console.log("  " + limeBold("longbow close <id>") + gray("      close a position (needs key)"));
      console.log("  " + limeBold("longbow how") + gray("             how it works"));
      console.log("  " + limeBold("longbow jan") + gray("             about Little Jan"));
      console.log("  " + limeBold("longbow ethos") + gray("           the experiment\n"));
      break;
  }
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  if (argv.length > 0) {
    await runCommand(argv);
  } else {
    await menuLoop();
  }
}

main().catch((e) => {
  console.error(red("\n  Fatal: " + (e instanceof Error ? e.message : String(e)) + "\n"));
  process.exit(1);
});
