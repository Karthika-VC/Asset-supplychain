import { useBatches, useUpdateBatchStatus } from "@/hooks/use-batches";
import { useMetaMask } from "@/hooks/use-metamask";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { Store, Download } from "lucide-react";
import { useUser } from "@/hooks/use-auth";

export default function PharmacyDashboard() {
  const { data: user } = useUser();
  const { data: batches } = useBatches();
  const { mutate: updateStatus } = useUpdateBatchStatus();
  const { mockTransaction } = useMetaMask();

  // Pharmacies receive "Shipped" and mark "Received"
  const incomingBatches = batches?.filter(b => ["Shipped", "Received"].includes(b.status)) || [];

  const handleReceive = async (batchId: string) => {
    try {
      await mockTransaction("Acknowledge Receipt");
      updateStatus({ batchId, status: "Received" });
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 fade-in-up">
      <div className="flex items-center gap-4 mb-8">
        <div className="p-3 bg-teal-500/20 rounded-xl border border-teal-500/30">
          <Store className="w-8 h-8 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-display font-bold text-white">Pharmacy Inventory</h1>
          <p className="text-muted-foreground">{user?.organization} Dashboard</p>
        </div>
      </div>

      <GlassCard>
        <h2 className="text-xl font-bold text-white mb-6">Incoming Deliveries</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-muted-foreground">
                <th className="p-4 font-medium">Batch ID</th>
                <th className="p-4 font-medium">Product</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {incomingBatches.map(b => (
                <tr key={b.id} className="border-b border-white/5">
                  <td className="p-4 text-white font-mono">{b.batchId}</td>
                  <td className="p-4 text-white">{b.name}</td>
                  <td className="p-4"><StatusBadge status={b.status} /></td>
                  <td className="p-4 text-right">
                    {b.status === "Shipped" ? (
                      <Button size="sm" onClick={() => handleReceive(b.batchId)} className="bg-primary text-primary-foreground hover:bg-primary/90">
                        <Download className="w-4 h-4 mr-2" /> Receive Goods
                      </Button>
                    ) : (
                      <span className="text-xs text-primary font-medium">In Stock (Ready for Sale)</span>
                    )}
                  </td>
                </tr>
              ))}
              {incomingBatches.length === 0 && (
                <tr><td colSpan={4} className="p-4 text-center text-muted-foreground">No incoming shipments.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
}
