import { useState } from "react";
import { useBatches, useCreateBatch, useUpdateBatchStatus } from "@/hooks/use-batches";
import { useMetaMask } from "@/hooks/use-metamask";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/StatusBadge";
import { FlaskConical, Play, ArrowRightCircle } from "lucide-react";
import { useUser } from "@/hooks/use-auth";

const STATUS_WORKFLOW = ["Requested", "Processing", "Preparing", "Packed", "Ready To Ship"];

export default function ManufacturerDashboard() {
  const { data: user } = useUser();
  const { data: batches } = useBatches();
  const { mutate: createBatch, isPending: isCreating } = useCreateBatch();
  const { mutate: updateStatus } = useUpdateBatchStatus();
  const { mockTransaction } = useMetaMask();

  const [name, setName] = useState("");
  const [batchId, setBatchId] = useState("");
  const [matId, setMatId] = useState("");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const hash = await mockTransaction("Initialize Medicine Batch");
      createBatch({
        name,
        batchId,
        manufacturerId: user!.id,
        materialBatchId: matId,
        status: "Processing",
        blockchainHash: hash,
      });
      setName(""); setBatchId(""); setMatId("");
    } catch (e) {
      console.error(e);
    }
  };

  const handleAdvanceStatus = async (bId: string, currentStatus: string) => {
    const idx = STATUS_WORKFLOW.indexOf(currentStatus);
    if (idx < 0 || idx >= STATUS_WORKFLOW.length - 1) return;
    const nextStatus = STATUS_WORKFLOW[idx + 1];
    
    try {
      await mockTransaction(`Update status to ${nextStatus}`);
      updateStatus({ batchId: bId, status: nextStatus });
    } catch (e) {
      console.error(e);
    }
  };

  const myBatches = batches?.filter(b => b.manufacturerId === user?.id) || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 fade-in-up">
      <div className="flex items-center gap-4 mb-8">
        <div className="p-3 bg-violet-500/20 rounded-xl border border-violet-500/30">
          <FlaskConical className="w-8 h-8 text-accent" />
        </div>
        <div>
          <h1 className="text-3xl font-display font-bold text-white">Manufacturing Plant</h1>
          <p className="text-muted-foreground">{user?.organization} Dashboard</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <GlassCard glow="violet">
            <h2 className="text-xl font-bold text-white mb-6">Create Batch</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-white/80">Medicine Batch ID</Label>
                <Input required value={batchId} onChange={e=>setBatchId(e.target.value)} 
                  className="bg-black/20 border-white/10 text-white focus:border-accent" placeholder="MED-2024-X1" />
              </div>
              <div className="space-y-2">
                <Label className="text-white/80">Medicine Name</Label>
                <Input required value={name} onChange={e=>setName(e.target.value)}
                  className="bg-black/20 border-white/10 text-white focus:border-accent" placeholder="Paracetamol 500mg" />
              </div>
              <div className="space-y-2">
                <Label className="text-white/80">Source Material ID (Ref)</Label>
                <Input required value={matId} onChange={e=>setMatId(e.target.value)}
                  className="bg-black/20 border-white/10 text-white focus:border-accent" placeholder="MAT-2024-..." />
              </div>
              <Button type="submit" disabled={isCreating} className="w-full bg-accent text-white hover:bg-accent/90 mt-2">
                <Play className="w-4 h-4 mr-2" /> Initialize
              </Button>
            </form>
          </GlassCard>
        </div>

        <div className="lg:col-span-2">
          <GlassCard>
            <h2 className="text-xl font-bold text-white mb-6">Active Production</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-muted-foreground">
                    <th className="p-4 font-medium">Batch ID</th>
                    <th className="p-4 font-medium">Medicine</th>
                    <th className="p-4 font-medium">Status</th>
                    <th className="p-4 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {myBatches.map(b => (
                    <tr key={b.id} className="border-b border-white/5">
                      <td className="p-4 text-white font-mono">{b.batchId}</td>
                      <td className="p-4 text-white">
                        {b.name}
                        <div className="text-xs text-muted-foreground mt-1">Src: {b.materialBatchId}</div>
                      </td>
                      <td className="p-4"><StatusBadge status={b.status} /></td>
                      <td className="p-4 text-right">
                        {STATUS_WORKFLOW.includes(b.status) && b.status !== "Ready To Ship" && (
                           <Button size="sm" onClick={() => handleAdvanceStatus(b.batchId, b.status)} variant="outline" className="bg-white/5 border-white/10 text-white hover:bg-white/10">
                             Advance <ArrowRightCircle className="w-4 h-4 ml-2" />
                           </Button>
                        )}
                        {b.status === "Ready To Ship" && <span className="text-xs text-primary font-medium">Awaiting Transfer</span>}
                      </td>
                    </tr>
                  ))}
                  {myBatches.length === 0 && (
                    <tr><td colSpan={4} className="p-4 text-center text-muted-foreground">No active production batches.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
