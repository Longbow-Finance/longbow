import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { http } from "wagmi";
import { robinhoodChain } from "./chain";

// A WalletConnect project id is required by RainbowKit's default config. Injected
// wallets still work without a real id; set NEXT_PUBLIC_WC_PROJECT_ID for the rest.
const projectId = process.env.NEXT_PUBLIC_WC_PROJECT_ID || "longbow-dev-placeholder";

export const wagmiConfig = getDefaultConfig({
  appName: "Longbow",
  projectId,
  chains: [robinhoodChain],
  transports: {
    [robinhoodChain.id]: http(),
  },
  ssr: true,
});
