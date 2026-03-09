import { useBatches, useUpdateBatchStatus } from "@/hooks/use-batches";
import { useMetaMask } from "@/hooks/use-metamask";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { Truck, PackageCheck } from "lucide-react";
import { useUser } from "@/hooks/use-auth";

export default function DistributorDashboard() {
  const { data: user } = useUser();
  const { data: batches } = useBatches();
  const { mutate: updateStatus } = useUpdateBatchStatus();
  const { sendTransaction } = useMetaMask();

  // Distributors see "Ready To Ship" or "Shipped"
  const relevantBatches = batches?.filter(b => ["Ready To Ship", "Shipped"].includes(b.status)) || [];

  const handleAction = async (batchId: string, action: string, newStatus: string) => {
    try {
      const tx = await sendTransaction(action);
      updateStatus({
        batchId,
        status: newStatus,
        txHash: tx.txHash,
        chainId: tx.chainId,
        blockNumber: tx.blockNumber,
        contractAddress: tx.contractAddress,
      });
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 fade-in-up">
      <div className="flex items-center gap-4 mb-8">
        <div className="p-3 bg-blue-500/20 rounded-xl border border-blue-500/30">
          <Truck className="w-8 h-8 text-blue-400" />
        </div>
        <div>
          <h1 className="text-3xl font-display font-bold text-white">Logistics & Distribution</h1>
          <p className="text-muted-foreground">{user?.organization} Dashboard</p>
        </div>
      </div>

      <GlassCard>
        <h2 className="text-xl font-bold text-white mb-6">Shipment Management</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-muted-foreground">
                <th className="p-4 font-medium">Batch ID</th>
                <th className="p-4 font-medium">Product</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium text-right">Logistics Action</th>
              </tr>
            </thead>
            <tbody>
              {relevantBatches.map(b => (
                <tr key={b.id} className="border-b border-white/5">
                  <td className="p-4 text-white font-mono">{b.batchId}</td>
                  <td className="p-4 text-white">{b.name}</td>
                  <td className="p-4"><StatusBadge status={b.status} /></td>
                  <td className="p-4 text-right">
                    {b.status === "Ready To Ship" ? (
                      <Button size="sm" onClick={() => handleAction(b.batchId, "Init Shipment", "Shipped")} className="bg-blue-600 hover:bg-blue-700 text-white">
                        <Truck className="w-4 h-4 mr-2" /> Mark Shipped
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">In Transit</span>
                    )}
                  </td>
                </tr>
              ))}
              {relevantBatches.length === 0 && (
                <tr><td colSpan={4} className="p-4 text-center text-muted-foreground">No shipments pending.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
}
