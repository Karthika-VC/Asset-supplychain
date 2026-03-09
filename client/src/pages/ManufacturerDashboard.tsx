import { useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/StatusBadge";
import { useUser } from "@/hooks/use-auth";
import { useMetaMask } from "@/hooks/use-metamask";
import { useMaterials, useCreateMaterial } from "@/hooks/use-materials";
import { useBatches, useCreateBatch } from "@/hooks/use-batches";
import { useTransfers, useCreateTransfer, useUpdateTransferStatus } from "@/hooks/use-transfers";
import { FlaskConical, PackageOpen, Boxes, ClipboardList, Factory, ArrowRightLeft, History } from "lucide-react";

export default function ManufacturerDashboard() {
  const { data: user } = useUser();
  const { sendTransaction } = useMetaMask();

  const { data: materials = [] } = useMaterials();
  const { mutate: createMaterial, isPending: isCreatingMaterial } = useCreateMaterial();

  const { data: batches = [] } = useBatches();
  const { mutate: createBatch, isPending: isCreatingBatch } = useCreateBatch();

  const { data: transfers = [] } = useTransfers();
  const { mutate: createTransfer, isPending: isCreatingTransfer } = useCreateTransfer();
  const { mutate: updateTransferStatus, isPending: isUpdatingTransfer } = useUpdateTransferStatus();

  const [materialBatchId, setMaterialBatchId] = useState("");
  const [materialName, setMaterialName] = useState("");

  const [medicineBatchId, setMedicineBatchId] = useState("");
  const [medicineName, setMedicineName] = useState("");
  const [sourceMaterialBatchId, setSourceMaterialBatchId] = useState("");

  const [transferBatchId, setTransferBatchId] = useState("");
  const [distributorUserId, setDistributorUserId] = useState("");

  const [historyBatchId, setHistoryBatchId] = useState("");

  const myMaterials = useMemo(
    () => materials.filter((m) => m.supplierId === user?.id),
    [materials, user?.id],
  );
  const myBatches = useMemo(
    () => batches.filter((b) => b.manufacturerId === user?.id),
    [batches, user?.id],
  );
  const myTransfers = useMemo(
    () => transfers.filter((t) => t.fromId === user?.id || t.toId === user?.id),
    [transfers, user?.id],
  );

  const incomingDistributorRequests = useMemo(
    () =>
      transfers.filter(
        (t) =>
          t.toId === user?.id &&
          t.entityType === "medicine" &&
          t.status === "initiated",
      ),
    [transfers, user?.id],
  );

  const inventorySummary = useMemo(() => {
    const readyToShip = myBatches.filter((b) => b.status === "Ready To Ship").length;
    const inProduction = myBatches.filter((b) =>
      ["Requested", "Processing", "Preparing", "Packed"].includes(b.status),
    ).length;
    const shipped = myBatches.filter((b) => b.status === "Shipped").length;
    return {
      materialCount: myMaterials.length,
      batchCount: myBatches.length,
      readyToShip,
      inProduction,
      shipped,
    };
  }, [myMaterials.length, myBatches]);

  const selectedBatchHistory = useMemo(() => {
    const batch = myBatches.find((b) => b.batchId === historyBatchId);
    const relatedTransfers = myTransfers
      .filter((t) => t.entityBatchId === historyBatchId)
      .sort((a, b) => {
        const at = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return at - bt;
      });

    if (!batch) return [];

    const createdTime = batch.createdAt ? new Date(batch.createdAt).toLocaleString() : "N/A";
    return [
      {
        title: "Batch Initialized",
        detail: `Status: ${batch.status}`,
        meta: createdTime,
      },
      ...relatedTransfers.map((t) => ({
        title: `Transfer ${t.status.toUpperCase()}`,
        detail: `From ${t.fromId} -> To ${t.toId}`,
        meta: t.createdAt ? new Date(t.createdAt).toLocaleString() : "N/A",
      })),
    ];
  }, [historyBatchId, myBatches, myTransfers]);

  const handleRegisterMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      const tx = await sendTransaction("Register Raw Material");
      createMaterial({
        batchId: materialBatchId,
        name: materialName,
        supplierId: user.id,
        status: "registered",
        blockchainHash: tx.txHash,
        txHash: tx.txHash,
        chainId: tx.chainId,
        blockNumber: tx.blockNumber,
        contractAddress: tx.contractAddress,
      });
      setMaterialBatchId("");
      setMaterialName("");
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      const tx = await sendTransaction("Create Medicine Batch");
      createBatch({
        batchId: medicineBatchId,
        name: medicineName,
        manufacturerId: user.id,
        materialBatchId: sourceMaterialBatchId,
        status: "Processing",
        blockchainHash: tx.txHash,
        txHash: tx.txHash,
        chainId: tx.chainId,
        blockNumber: tx.blockNumber,
        contractAddress: tx.contractAddress,
      });
      setMedicineBatchId("");
      setMedicineName("");
      setSourceMaterialBatchId("");
    } catch (err) {
      console.error(err);
    }
  };

  const handleTransferToDistributor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const toId = Number(distributorUserId);
    if (!Number.isInteger(toId) || toId <= 0) return;

    try {
      const tx = await sendTransaction("Transfer to Distributor");
      createTransfer({
        fromId: user.id,
        toId,
        entityType: "medicine",
        entityBatchId: transferBatchId,
        status: "initiated",
        blockchainHash: tx.txHash,
        txHash: tx.txHash,
        chainId: tx.chainId,
        blockNumber: tx.blockNumber,
        contractAddress: tx.contractAddress,
      });
      setTransferBatchId("");
      setDistributorUserId("");
    } catch (err) {
      console.error(err);
    }
  };

  const handleApproveRequest = (transferId: number) => {
    updateTransferStatus({ id: transferId, status: "completed" });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 fade-in-up space-y-8">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-violet-500/20 rounded-xl border border-violet-500/30">
          <Factory className="w-8 h-8 text-accent" />
        </div>
        <div>
          <h1 className="text-3xl font-display font-bold text-white">Manufacturer Control Tower</h1>
          <p className="text-muted-foreground">{user?.organization} Dashboard</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <GlassCard className="p-4"><p className="text-xs text-muted-foreground">Raw Materials</p><p className="text-2xl font-bold text-white">{inventorySummary.materialCount}</p></GlassCard>
        <GlassCard className="p-4"><p className="text-xs text-muted-foreground">Total Batches</p><p className="text-2xl font-bold text-white">{inventorySummary.batchCount}</p></GlassCard>
        <GlassCard className="p-4"><p className="text-xs text-muted-foreground">In Production</p><p className="text-2xl font-bold text-white">{inventorySummary.inProduction}</p></GlassCard>
        <GlassCard className="p-4"><p className="text-xs text-muted-foreground">Ready To Ship</p><p className="text-2xl font-bold text-primary">{inventorySummary.readyToShip}</p></GlassCard>
        <GlassCard className="p-4"><p className="text-xs text-muted-foreground">Shipped</p><p className="text-2xl font-bold text-blue-300">{inventorySummary.shipped}</p></GlassCard>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <GlassCard glow="teal">
          <div className="flex items-center gap-2 mb-5"><PackageOpen className="w-5 h-5 text-primary" /><h2 className="text-xl font-bold text-white">Raw Material Registration</h2></div>
          <form onSubmit={handleRegisterMaterial} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-white/80">Material Batch ID</Label>
              <Input required value={materialBatchId} onChange={(e) => setMaterialBatchId(e.target.value)} className="bg-black/20 border-white/10 text-white" placeholder="MAT-2026-001" />
            </div>
            <div className="space-y-2">
              <Label className="text-white/80">Material Name</Label>
              <Input required value={materialName} onChange={(e) => setMaterialName(e.target.value)} className="bg-black/20 border-white/10 text-white" placeholder="API Compound" />
            </div>
            <Button type="submit" disabled={isCreatingMaterial} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
              Register Material
            </Button>
          </form>
        </GlassCard>

        <GlassCard glow="violet">
          <div className="flex items-center gap-2 mb-5"><FlaskConical className="w-5 h-5 text-accent" /><h2 className="text-xl font-bold text-white">Medicine Batch Creation</h2></div>
          <form onSubmit={handleCreateBatch} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-white/80">Medicine Batch ID</Label>
              <Input required value={medicineBatchId} onChange={(e) => setMedicineBatchId(e.target.value)} className="bg-black/20 border-white/10 text-white" placeholder="MED-2026-X1" />
            </div>
            <div className="space-y-2">
              <Label className="text-white/80">Medicine Name</Label>
              <Input required value={medicineName} onChange={(e) => setMedicineName(e.target.value)} className="bg-black/20 border-white/10 text-white" placeholder="Paracetamol 500mg" />
            </div>
            <div className="space-y-2">
              <Label className="text-white/80">Source Material Batch</Label>
              <Input required value={sourceMaterialBatchId} onChange={(e) => setSourceMaterialBatchId(e.target.value)} className="bg-black/20 border-white/10 text-white" placeholder="MAT-2026-001" />
            </div>
            <Button type="submit" disabled={isCreatingBatch} className="w-full bg-accent text-white hover:bg-accent/90">
              Create Batch
            </Button>
          </form>
        </GlassCard>
      </div>

      <GlassCard>
        <div className="flex items-center gap-2 mb-5"><ArrowRightLeft className="w-5 h-5 text-blue-300" /><h2 className="text-xl font-bold text-white">Transfer to Distributor</h2></div>
        <form onSubmit={handleTransferToDistributor} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2 md:col-span-2">
            <Label className="text-white/80">Batch ID</Label>
            <Input required value={transferBatchId} onChange={(e) => setTransferBatchId(e.target.value)} className="bg-black/20 border-white/10 text-white" placeholder="MED-2026-X1" />
          </div>
          <div className="space-y-2">
            <Label className="text-white/80">Distributor User ID</Label>
            <Input required value={distributorUserId} onChange={(e) => setDistributorUserId(e.target.value)} className="bg-black/20 border-white/10 text-white" placeholder="42" />
          </div>
          <div className="flex items-end">
            <Button type="submit" disabled={isCreatingTransfer} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
              Initiate Transfer
            </Button>
          </div>
        </form>
      </GlassCard>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <GlassCard>
          <div className="flex items-center gap-2 mb-5"><Boxes className="w-5 h-5 text-primary" /><h2 className="text-xl font-bold text-white">Batch Inventory + QR</h2></div>
          <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1">
            {myBatches.length === 0 && <p className="text-sm text-muted-foreground">No batches created yet.</p>}
            {myBatches.map((batch) => (
              <div key={batch.id} className="p-4 rounded-xl bg-white/5 border border-white/10 flex justify-between gap-4">
                <div>
                  <p className="text-white font-semibold">{batch.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">{batch.batchId}</p>
                  <div className="mt-2"><StatusBadge status={batch.status} /></div>
                </div>
                <div className="bg-white p-2 rounded-lg h-fit">
                  <QRCodeSVG value={`${window.location.origin}/portal?batch=${batch.batchId}`} size={72} />
                </div>
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard>
          <div className="flex items-center gap-2 mb-5"><History className="w-5 h-5 text-violet-300" /><h2 className="text-xl font-bold text-white">Batch History</h2></div>
          <div className="space-y-3">
            <Label className="text-white/80">Track Batch ID</Label>
            <Input value={historyBatchId} onChange={(e) => setHistoryBatchId(e.target.value)} className="bg-black/20 border-white/10 text-white" placeholder="Enter batch ID to view timeline" />
          </div>
          <div className="mt-5 space-y-4 max-h-[330px] overflow-y-auto">
            {historyBatchId && selectedBatchHistory.length === 0 && (
              <p className="text-sm text-muted-foreground">No history found for this batch.</p>
            )}
            {selectedBatchHistory.map((item, idx) => (
              <div key={`${item.title}-${idx}`} className="pl-4 border-l-2 border-white/15">
                <p className="text-white font-semibold text-sm">{item.title}</p>
                <p className="text-xs text-muted-foreground">{item.detail}</p>
                <p className="text-[11px] text-muted-foreground/80">{item.meta}</p>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      <GlassCard>
        <div className="flex items-center gap-2 mb-5"><ClipboardList className="w-5 h-5 text-amber-300" /><h2 className="text-xl font-bold text-white">Distributor Requests</h2></div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-muted-foreground">
                <th className="p-3 font-medium">Transfer ID</th>
                <th className="p-3 font-medium">Batch</th>
                <th className="p-3 font-medium">From</th>
                <th className="p-3 font-medium">Status</th>
                <th className="p-3 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {incomingDistributorRequests.map((req) => (
                <tr key={req.id} className="border-b border-white/5">
                  <td className="p-3 text-white">#{req.id}</td>
                  <td className="p-3 text-white font-mono">{req.entityBatchId}</td>
                  <td className="p-3 text-white">{req.fromId}</td>
                  <td className="p-3"><StatusBadge status={req.status} /></td>
                  <td className="p-3 text-right">
                    <Button
                      size="sm"
                      onClick={() => handleApproveRequest(req.id)}
                      disabled={isUpdatingTransfer}
                      className="bg-amber-500/20 border border-amber-500/30 text-amber-200 hover:bg-amber-500/30"
                    >
                      Approve
                    </Button>
                  </td>
                </tr>
              ))}
              {incomingDistributorRequests.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-muted-foreground">
                    No pending distributor requests.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
}
