import { useState, useCallback } from "react";
import { ethers } from "ethers";
import { useToast } from "@/hooks/use-toast";

export function useMetaMask() {
  const [address, setAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const { toast } = useToast();

  const connect = useCallback(async () => {
    if (typeof window.ethereum === "undefined") {
      toast({
        title: "MetaMask Not Found",
        description: "Please install the MetaMask browser extension.",
        variant: "destructive",
      });
      return null;
    }

    try {
      setIsConnecting(true);
      const provider = new ethers.BrowserProvider(window.ethereum);
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

  // Simulates a blockchain transaction and returns a mock tx hash
  const mockTransaction = useCallback(async (actionName: string): Promise<string> => {
    if (!address) {
      const newAddress = await connect();
      if (!newAddress) throw new Error("Wallet connection required for blockchain transaction.");
    }

    toast({
      title: "Awaiting Signature...",
      description: `Please sign the transaction for: ${actionName}`,
    });

    // Simulate user reading MetaMask prompt and clicking sign
    await new Promise(r => setTimeout(r, 1500));
    
    toast({
      title: "Transaction Submitted",
      description: "Waiting for blockchain confirmation...",
    });

    // Simulate mining delay
    await new Promise(r => setTimeout(r, 2000));

    const hash = "0x" + Array.from({length: 40}, () => Math.floor(Math.random()*16).toString(16)).join('');
    
    toast({
      title: "Transaction Confirmed! 🔗",
      description: `Hash: ${hash.slice(0, 10)}...${hash.slice(-8)}`,
      className: "bg-teal-950 border-teal-500 text-teal-100",
    });

    return hash;
  }, [address, connect, toast]);

  return { address, isConnecting, connect, mockTransaction };
}
