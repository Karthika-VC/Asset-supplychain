import { useCallback, useEffect, useState } from "react";
import { ethers } from "ethers";
import { useToast } from "@/hooks/use-toast";

export type ChainTxResult = {
  from: string;
  to?: string;
  txHash: string;
  chainId: number;
  blockNumber: number;
  contractAddress?: string;
};

type WalletTxRequest = {
  txRequest: ethers.TransactionRequest;
  contractAddress?: string;
};

function getEthereumProvider(): ethers.Eip1193Provider | undefined {
  return window.ethereum as ethers.Eip1193Provider | undefined;
}

export function useMetaMask() {
  const [address, setAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const ethereum = getEthereumProvider();
    if (!ethereum) return;

    const provider = new ethers.BrowserProvider(ethereum);

    void provider.send("eth_accounts", []).then((accounts: string[]) => {
      setAddress(accounts[0] ?? null);
    }).catch((error) => {
      console.error("Failed to read connected accounts:", error);
    });

    if (!("on" in ethereum) || typeof ethereum.on !== "function") {
      return;
    }

    const handleAccountsChanged = (accounts: string[]) => {
      setAddress(accounts[0] ?? null);
    };

    ethereum.on("accountsChanged", handleAccountsChanged);

    return () => {
      if ("removeListener" in ethereum && typeof ethereum.removeListener === "function") {
        ethereum.removeListener("accountsChanged", handleAccountsChanged);
      }
    };
  }, []);

  const connect = useCallback(async () => {
    const ethereum = getEthereumProvider();

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
      const walletAddress = accounts[0] ?? null;

      setAddress(walletAddress);

      if (walletAddress) {
        toast({
          title: "Wallet Connected",
          description: `Connected to ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`,
        });
      }

      return walletAddress;
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Connection Failed",
        description: err.message || "Failed to connect to MetaMask.",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsConnecting(false);
    }
  }, [toast]);

  const sendTransaction = useCallback(
    async (request: string | WalletTxRequest): Promise<ChainTxResult> => {
      if (typeof request === "string") {
        throw new Error(`No on-chain transaction is configured for "${request}" yet.`);
      }

      const ethereum = getEthereumProvider();
      if (!ethereum) {
        throw new Error("MetaMask is not available");
      }

      const provider = new ethers.BrowserProvider(ethereum);
      const signer = await provider.getSigner();
      const txResponse = await signer.sendTransaction(request.txRequest);
      const receipt = await txResponse.wait();

      if (!receipt) {
        throw new Error("Transaction receipt was not returned");
      }

      const network = await provider.getNetwork();

      return {
        from: signer.address,
        to: txResponse.to ?? undefined,
        txHash: txResponse.hash,
        chainId: Number(network.chainId),
        blockNumber: receipt.blockNumber,
        contractAddress: request.contractAddress ?? txResponse.to ?? undefined,
      };
    },
    [],
  );

  return { address, isConnecting, connect, sendTransaction };
}
