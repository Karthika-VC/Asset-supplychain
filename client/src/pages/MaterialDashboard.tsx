import { useState } from "react";
import { useMaterials, useCreateMaterial } from "@/hooks/use-materials";
import { useMetaMask } from "@/hooks/use-metamask";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/StatusBadge";
import { Leaf, Plus, Hash } from "lucide-react";
import { useUser } from "@/hooks/use-auth";

export default function MaterialDashboard() {
  const { data: user } = useUser();
  const { data: materials, isLoading } = useMaterials();
  const { mutate: createMaterial, isPending } = useCreateMaterial();
  const { mockTransaction } = useMetaMask();

  const [name, setName] = useState("");
  const [batchId, setBatchId] = useState("");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const hash = await mockTransaction("Register Raw Material");
      createMaterial({
        name,
        batchId,
        supplierId: user!.id,
        status: "registered",
        blockchainHash: hash,
      });
      setName("");
      setBatchId("");
    } catch (e) {
      console.error(e);
    }
  };

  const myMaterials = materials?.filter(m => m.supplierId === user?.id) || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 fade-in-up">
      <div className="flex items-center gap-4 mb-8">
        <div className="p-3 bg-teal-500/20 rounded-xl border border-teal-500/30">
          <Leaf className="w-8 h-8 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-display font-bold text-white">Raw Material Supply</h1>
          <p className="text-muted-foreground">{user?.organization} Dashboard</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <GlassCard glow="teal">
            <h2 className="text-xl font-bold text-white mb-6">Register Material</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-white/80">Batch ID</Label>
                <div className="relative">
                  <Hash className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                  <Input required value={batchId} onChange={e=>setBatchId(e.target.value)} 
                    className="pl-10 bg-black/20 border-white/10 text-white focus:border-primary" placeholder="MAT-2024-001" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-white/80">Material Name</Label>
                <Input required value={name} onChange={e=>setName(e.target.value)}
                  className="bg-black/20 border-white/10 text-white focus:border-primary" placeholder="Active Pharmaceutical Ingredient" />
              </div>
              <Button type="submit" disabled={isPending} className="w-full bg-primary text-primary-foreground hover:bg-primary/90 mt-2">
                <Plus className="w-4 h-4 mr-2" /> {isPending ? "Registering..." : "Commit to Blockchain"}
              </Button>
            </form>
          </GlassCard>
        </div>

        <div className="lg:col-span-2">
          <GlassCard>
            <h2 className="text-xl font-bold text-white mb-6">My Registered Batches</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-muted-foreground">
                    <th className="p-4 font-medium">Batch ID</th>
                    <th className="p-4 font-medium">Material</th>
                    <th className="p-4 font-medium">Status</th>
                    <th className="p-4 font-medium">Tx Hash</th>
                  </tr>
                </thead>
                <tbody>
                  {myMaterials.map(m => (
                    <tr key={m.id} className="border-b border-white/5">
                      <td className="p-4 text-white font-mono">{m.batchId}</td>
                      <td className="p-4 text-white">{m.name}</td>
                      <td className="p-4"><StatusBadge status={m.status} /></td>
                      <td className="p-4 text-xs font-mono text-muted-foreground">
                        {m.blockchainHash?.slice(0, 10)}...
                      </td>
                    </tr>
                  ))}
                  {myMaterials.length === 0 && (
                    <tr><td colSpan={4} className="p-4 text-center text-muted-foreground">No materials registered yet.</td></tr>
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
