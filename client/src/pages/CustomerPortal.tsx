import { useState } from "react";
import { useBatch } from "@/hooks/use-batches";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/StatusBadge";
import { Search, ShieldCheck, CheckCircle2, AlertTriangle, User } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useUser } from "@/hooks/use-auth";

export default function CustomerPortal() {
  const { data: user } = useUser();
  const [searchInput, setSearchInput] = useState("");
  const [queryId, setQueryId] = useState("");
  
  // Only fires when queryId is set
  const { data: batch, isLoading, isError } = useBatch(queryId);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if(searchInput.trim()) setQueryId(searchInput.trim());
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 fade-in-up">
      <div className="flex items-center gap-4 mb-12 justify-center">
        <div className="p-3 bg-white/10 rounded-xl border border-white/20">
          <User className="w-8 h-8 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-display font-bold text-white">Patient Portal</h1>
          <p className="text-muted-foreground">Verify your medication's journey</p>
        </div>
      </div>

      <GlassCard glow="teal" className="mb-8">
        <form onSubmit={handleSearch} className="flex gap-4">
          <Input 
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="flex-1 bg-black/20 border-white/10 text-white h-14 text-lg focus:border-primary rounded-xl"
            placeholder="Enter Medicine Batch ID (e.g. MED-2024-X1)"
          />
          <Button type="submit" className="h-14 px-8 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl">
            <Search className="w-5 h-5 mr-2" /> Verify
          </Button>
        </form>
      </GlassCard>

      {isLoading && (
        <div className="text-center py-12 text-primary animate-pulse font-mono">
          Querying blockchain ledger...
        </div>
      )}

      {isError && (
        <GlassCard className="border-red-500/30 bg-red-500/10 text-center py-8">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">Record Not Found</h3>
          <p className="text-red-200/70">The entered Batch ID does not exist on the network. This product may be counterfeit.</p>
        </GlassCard>
      )}

      {batch && (
        <div className="space-y-6 fade-in-up">
          <GlassCard className="relative overflow-hidden border-teal-500/30">
            <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
              <ShieldCheck className="w-48 h-48 text-primary" />
            </div>
            
            <div className="flex items-start justify-between mb-8 relative z-10">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-3xl font-display font-bold text-white">{batch.name}</h2>
                  <CheckCircle2 className="w-6 h-6 text-primary" />
                </div>
                <div className="text-lg font-mono text-muted-foreground mb-4">ID: {batch.batchId}</div>
                <StatusBadge status={batch.status} />
              </div>
              <div className="bg-white p-2 rounded-xl">
                <QRCodeSVG value={`https://pharmachain.app/verify/${batch.batchId}`} size={80} />
              </div>
            </div>

            <div className="border-t border-white/10 pt-6 mt-6 relative z-10">
              <h3 className="text-lg font-bold text-white mb-4">Supply Chain History</h3>
              
              <div className="space-y-6 border-l-2 border-white/10 ml-3 pl-6">
                <div className="relative">
                  <div className="absolute w-3 h-3 bg-primary rounded-full -left-[31px] top-1.5 shadow-[0_0_10px_#00d4aa]" />
                  <h4 className="font-bold text-white">Genesis: Material Registered</h4>
                  <p className="text-sm text-muted-foreground">Source Ref: {batch.materialBatchId}</p>
                </div>
                
                <div className="relative">
                  <div className="absolute w-3 h-3 bg-accent rounded-full -left-[31px] top-1.5 shadow-[0_0_10px_#7c3aed]" />
                  <h4 className="font-bold text-white">Manufacturing Completed</h4>
                  <p className="text-sm text-muted-foreground">Tx Hash: {batch.blockchainHash?.slice(0,16)}...</p>
                </div>

                {["Shipped", "Received"].includes(batch.status) && (
                  <div className="relative">
                    <div className="absolute w-3 h-3 bg-blue-500 rounded-full -left-[31px] top-1.5 shadow-[0_0_10px_#3b82f6]" />
                    <h4 className="font-bold text-white">Logistics & Transfer</h4>
                    <p className="text-sm text-muted-foreground">Passed via authorized distributor network</p>
                  </div>
                )}

                {batch.status === "Received" && (
                  <div className="relative">
                    <div className="absolute w-3 h-3 bg-green-500 rounded-full -left-[31px] top-1.5 shadow-[0_0_10px_#22c55e]" />
                    <h4 className="font-bold text-white">Pharmacy Stocked</h4>
                    <p className="text-sm text-muted-foreground">Verified and ready for patient distribution</p>
                  </div>
                )}
              </div>
            </div>
          </GlassCard>

          <div className="text-center">
             <Button variant="outline" className="border-red-500/30 text-red-400 hover:bg-red-500/10">
               <AlertTriangle className="w-4 h-4 mr-2" /> Report Suspicious Activity
             </Button>
          </div>
        </div>
      )}
    </div>
  );
}
