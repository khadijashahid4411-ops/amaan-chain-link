/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { ethers } from "ethers";
import { toast } from "sonner";

declare global {
  interface Window {
    ethereum?: any;
  }
}

// Sepolia testnet
export const SEPOLIA_CHAIN_ID = 11155111;

export const useWallet = () => {
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [connecting, setConnecting] = useState(false);

  const connect = async (): Promise<{ address: string; signer: ethers.Signer | null; mock?: boolean } | null> => {
    if (!window.ethereum) {
      // Fallback: no MetaMask — use a deterministic mock wallet so demo still works.
      const seed = (localStorage.getItem("amaan.mockWallet") ?? crypto.randomUUID());
      localStorage.setItem("amaan.mockWallet", seed);
      const wallet = ethers.Wallet.createRandom();
      const addr = wallet.address;
      setAddress(addr);
      setChainId(SEPOLIA_CHAIN_ID);
      toast.info("Using demo wallet (MetaMask not detected)");
      return { address: addr, signer: null, mock: true };
    }
    try {
      setConnecting(true);
      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);

      // Switch to Sepolia
      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: "0xaa36a7" }],
        });
      } catch (switchErr: any) {
        if (switchErr?.code === 4902) {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [{
              chainId: "0xaa36a7",
              chainName: "Sepolia",
              nativeCurrency: { name: "SepoliaETH", symbol: "SEP", decimals: 18 },
              rpcUrls: ["https://rpc.sepolia.org"],
              blockExplorerUrls: ["https://sepolia.etherscan.io"],
            }],
          });
        }
      }

      const signer = await provider.getSigner();
      const addr = await signer.getAddress();
      const net = await provider.getNetwork();
      setAddress(addr);
      setChainId(Number(net.chainId));
      return { address: addr, signer };
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to connect wallet");
      return null;
    } finally {
      setConnecting(false);
    }
  };

  /**
   * "Anchor" an evidence hash on-chain by sending a 0-value tx to self with the
   * file hash + alert id encoded in tx data. This proves submitter + timestamp
   * without needing a deployed contract — perfect for an MVP. The returned
   * tx hash is the immutable on-chain proof.
   */
  const anchorEvidence = async (
    signer: ethers.Signer,
    fileHash: string,
    alertId: string
  ): Promise<string> => {
    const addr = await signer.getAddress();
    const payload = JSON.stringify({ kind: "amaanchain.evidence", fileHash, alertId, ts: Date.now() });
    const data = ethers.hexlify(ethers.toUtf8Bytes(payload));
    const tx = await signer.sendTransaction({ to: addr, value: 0n, data });
    return tx.hash;
  };

  return { address, chainId, connecting, connect, anchorEvidence };
};
