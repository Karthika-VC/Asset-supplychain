import { useState, useCallback } from "react";
import { ethers } from "ethers";
import { useToast } from "@/hooks/use-toast";

export type ChainTxResult = {
  from: string;
  to: string;
  txHash: string;
  chainId: number;
  blockNumber: number;
  contractAddress: string;
};

export function useMetaMask() {
  const [address, setAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const { toast } = useToast();

  const connect = useCallback(async () => {
    const ethereum = window.ethereum as ethers.Eip1193Provider | undefined;
    if (!ethereum) {
      toast({
        title: "MetaMask Not Found",
        description: "Please install the MetaMask browser extension.",
        variant: "destructive",
      });
      return null;
    }

    try {
      setIsConnecting(true);
      const provider = new ethers.BrowserProvider(ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      if (accounts.length > 0) {
        setAddress(accounts[0]);
        toast({
          title: "Wallet Connected",
          description: `Connected to ${accounts[0].slice(0, 6)}...${accounts[0].slice(-4)}`,
        });
        return accounts[0];
      }
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Connection Failed",
        description: err.message || "Failed to connect to MetaMask.",
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
    return null;
  }, [toast]);

  const sendTransaction = useCallback(
    async (actionName: string): Promise<ChainTxResult> => {
      const ethereum = window.ethereum as ethers.Eip1193Provider | undefined;
      if (!ethereum) {
        throw new Error("MetaMask is required");
      }

      const provider = new ethers.BrowserProvider(ethereum);
      const signer = await provider.getSigner();
      const signerAddress = await signer.getAddress();

      if (!address || address.toLowerCase() !== signerAddress.toLowerCase()) {
        setAddress(signerAddress);
      }

      toast({
        title: "Awaiting Signature...",
        description: `Please sign the transaction for: ${actionName}`,
      });

      const tx = await signer.sendTransaction({
        to: signerAddress,
        value: 0n,
      });

      toast({
        title: "Transaction Submitted",
        description: `Hash: ${tx.hash.slice(0, 12)}...`,
      });

      const receipt = await tx.wait();
      if (!receipt || !receipt.blockNumber) {
        throw new Error("Transaction was not mined");
      }

      const network = await provider.getNetwork();
      const result: ChainTxResult = {
        from: signerAddress,
        to: tx.to ?? signerAddress,
        txHash: tx.hash,
        chainId: Number(network.chainId),
        blockNumber: receipt.blockNumber,
        contractAddress: tx.to ?? signerAddress,
      };

      toast({
        title: "Transaction Confirmed",
        description: `Block #${receipt.blockNumber}`,
        className: "bg-teal-950 border-teal-500 text-teal-100",
      });

      return result;
    },
    [address, toast],
  );

  return { address, isConnecting, connect, sendTransaction };
}
