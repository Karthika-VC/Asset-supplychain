import { useMemo, useState } from "react";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/StatusBadge";
import { useUser } from "@/hooks/use-auth";
import { useTransfers, useCreateTransfer, useUpdateTransferStatus } from "@/hooks/use-transfers";
import { useBatches, useUpdateBatchStatus } from "@/hooks/use-batches";
import { useMetaMask } from "@/hooks/use-metamask";
import { Truck, Inbox, Send, Boxes, ScanLine, History, ClipboardPlus } from "lucide-react";

function parseBatchIdFromQrInput(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "";
  try {
    const url = new URL(trimmed);
    const fromQuery = url.searchParams.get("batch");
    if (fromQuery) return fromQuery.trim();
    const segments = url.pathname.split("/").filter(Boolean);
    return segments[segments.length - 1] || "";
  } catch {
    return trimmed;
  }
}

export default function DistributorDashboard() {
  const { data: user } = useUser();
  const { data: transfers = [] } = useTransfers();
  const { data: batches = [] } = useBatches();
  const { mutate: createTransfer, isPending: isCreatingTransfer } = useCreateTransfer();
  const { mutate: updateTransferStatus, isPending: isUpdatingTransfer } = useUpdateTransferStatus();
  const { mutate: updateBatchStatus } = useUpdateBatchStatus();
  const { sendTransaction } = useMetaMask();

  const [manufacturerUserId, setManufacturerUserId] = useState("");
  const [requestedBatchId, setRequestedBatchId] = useState("");
  const [requestedNotes, setRequestedNotes] = useState("");

  const [pharmacyUserId, setPharmacyUserId] = useState("");
  const [transferBatchId, setTransferBatchId] = useState("");

  const [qrInput, setQrInput] = useState("");
  const [scannedBatchId, setScannedBatchId] = useState("");

  const incomingCustody = useMemo(
    () =>
      transfers.filter(
        (t) => t.toId === user?.id && t.status === "initiated" && t.entityType === "medicine",
      ),
    [transfers, user?.id],
  );

  const outgoingTransfers = useMemo(
    () => transfers.filter((t) => t.fromId === user?.id && t.entityType === "medicine"),
    [transfers, user?.id],
  );

  const movementHistory = useMemo(
    () =>
      transfers
        .filter((t) => (t.fromId === user?.id || t.toId === user?.id) && t.entityType === "medicine")
        .sort((a, b) => {
          const at = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return bt - at;
        }),
    [transfers, user?.id],
  );

  const inventory = useMemo(() => {
    const owned = new Map<string, { in: number; out: number }>();
    for (const t of transfers) {
      if (t.entityType !== "medicine" || t.status !== "completed") continue;
      const current = owned.get(t.entityBatchId) ?? { in: 0, out: 0 };
      if (t.toId === user?.id) current.in += 1;
      if (t.fromId === user?.id) current.out += 1;
      owned.set(t.entityBatchId, current);
    }
    return Array.from(owned.entries())
      .map(([batchId, stats]) => ({
        batchId,
        quantity: stats.in - stats.out,
        batch: batches.find((b) => b.batchId === batchId),
      }))
      .filter((x) => x.quantity > 0);
  }, [transfers, user?.id, batches]);

  const scannedBatch = useMemo(
    () => (scannedBatchId ? batches.find((b) => b.batchId === scannedBatchId) : null),
    [scannedBatchId, batches],
  );

  const handleReceiveCustody = async (transferId: number, batchId: string) => {
    try {
      const tx = await sendTransaction("Receive Custody");
      updateTransferStatus({ id: transferId, status: "completed" });
      updateBatchStatus({
        batchId,
        status: "Shipped",
        txHash: tx.txHash,
        chainId: tx.chainId,
        blockNumber: tx.blockNumber,
        contractAddress: tx.contractAddress,
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleRequestMedicines = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const manufacturerId = Number(manufacturerUserId);
    if (!Number.isInteger(manufacturerId) || manufacturerId <= 0) return;

    try {
      const tx = await sendTransaction("Request Medicines");
      createTransfer({
        fromId: user.id,
        toId: manufacturerId,
        entityType: "medicine",
        entityBatchId: requestedBatchId,
        status: "initiated",
        blockchainHash: tx.txHash,
        txHash: tx.txHash,
        chainId: tx.chainId,
        blockNumber: tx.blockNumber,
        contractAddress: tx.contractAddress,
      });
      setManufacturerUserId("");
      setRequestedBatchId("");
      setRequestedNotes("");
    } catch (err) {
      console.error(err);
    }
  };

  const handleTransferToPharmacy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const pharmacyId = Number(pharmacyUserId);
    if (!Number.isInteger(pharmacyId) || pharmacyId <= 0) return;

    try {
      const tx = await sendTransaction("Transfer to Pharmacy");
      createTransfer({
        fromId: user.id,
        toId: pharmacyId,
        entityType: "medicine",
        entityBatchId: transferBatchId,
        status: "initiated",
        blockchainHash: tx.txHash,
        txHash: tx.txHash,
        chainId: tx.chainId,
        blockNumber: tx.blockNumber,
        contractAddress: tx.contractAddress,
      });
      updateBatchStatus({
        batchId: transferBatchId,
        status: "Shipped",
        txHash: tx.txHash,
        chainId: tx.chainId,
        blockNumber: tx.blockNumber,
        contractAddress: tx.contractAddress,
      });
      setPharmacyUserId("");
      setTransferBatchId("");
    } catch (err) {
      console.error(err);
    }
  };

  const handleScan = (e: React.FormEvent) => {
    e.preventDefault();
    setScannedBatchId(parseBatchIdFromQrInput(qrInput));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 fade-in-up space-y-8">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-blue-500/20 rounded-xl border border-blue-500/30">
          <Truck className="w-8 h-8 text-blue-400" />
        </div>
        <div>
          <h1 className="text-3xl font-display font-bold text-white">Distributor Operations Hub</h1>
          <p className="text-muted-foreground">{user?.organization} Dashboard</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <GlassCard>
          <div className="flex items-center gap-2 mb-5">
            <Inbox className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-bold text-white">Receive Custody</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-muted-foreground">
                  <th className="p-3 font-medium">Transfer</th>
                  <th className="p-3 font-medium">Batch</th>
                  <th className="p-3 font-medium">From</th>
                  <th className="p-3 font-medium">Status</th>
                  <th className="p-3 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {incomingCustody.map((t) => (
                  <tr key={t.id} className="border-b border-white/5">
                    <td className="p-3 text-white">#{t.id}</td>
                    <td className="p-3 text-white font-mono">{t.entityBatchId}</td>
                    <td className="p-3 text-white">{t.fromId}</td>
                    <td className="p-3"><StatusBadge status={t.status} /></td>
                    <td className="p-3 text-right">
                      <Button
                        size="sm"
                        onClick={() => handleReceiveCustody(t.id, t.entityBatchId)}
                        disabled={isUpdatingTransfer}
                        className="bg-teal-500/20 hover:bg-teal-500/30 text-teal-200 border border-teal-500/30"
                      >
                        Accept
                      </Button>
                    </td>
                  </tr>
                ))}
                {incomingCustody.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-muted-foreground">
                      No incoming custody transfers.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </GlassCard>

        <GlassCard>
          <div className="flex items-center gap-2 mb-5">
            <ClipboardPlus className="w-5 h-5 text-violet-300" />
            <h2 className="text-xl font-bold text-white">Request Medicines</h2>
          </div>
          <form onSubmit={handleRequestMedicines} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-white/80">Manufacturer User ID</Label>
              <Input
                required
                value={manufacturerUserId}
                onChange={(e) => setManufacturerUserId(e.target.value)}
                className="bg-black/20 border-white/10 text-white"
                placeholder="11"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-white/80">Requested Batch / Product Ref</Label>
              <Input
                required
                value={requestedBatchId}
                onChange={(e) => setRequestedBatchId(e.target.value)}
                className="bg-black/20 border-white/10 text-white"
                placeholder="MED-2026-X2"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-white/80">Notes</Label>
              <Input
                value={requestedNotes}
                onChange={(e) => setRequestedNotes(e.target.value)}
                className="bg-black/20 border-white/10 text-white"
                placeholder="Urgent demand for next week"
              />
            </div>
            <Button type="submit" disabled={isCreatingTransfer} className="w-full bg-accent text-white hover:bg-accent/90">
              Submit Request
            </Button>
          </form>
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <GlassCard>
          <div className="flex items-center gap-2 mb-5">
            <Send className="w-5 h-5 text-blue-300" />
            <h2 className="text-xl font-bold text-white">Transfer to Pharmacy</h2>
          </div>
          <form onSubmit={handleTransferToPharmacy} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-white/80">Pharmacy User ID</Label>
              <Input
                required
                value={pharmacyUserId}
                onChange={(e) => setPharmacyUserId(e.target.value)}
                className="bg-black/20 border-white/10 text-white"
                placeholder="31"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-white/80">Batch ID</Label>
              <Input
                required
                value={transferBatchId}
                onChange={(e) => setTransferBatchId(e.target.value)}
                className="bg-black/20 border-white/10 text-white"
                placeholder="MED-2026-X2"
              />
            </div>
            <Button type="submit" disabled={isCreatingTransfer} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
              Initiate Transfer
            </Button>
          </form>
        </GlassCard>

        <GlassCard>
          <div className="flex items-center gap-2 mb-5">
            <Boxes className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-bold text-white">Inventory Tracking</h2>
          </div>
          <div className="space-y-3 max-h-[320px] overflow-y-auto">
            {inventory.map((item) => (
              <div key={item.batchId} className="p-3 rounded-lg bg-white/5 border border-white/10">
                <div className="flex items-center justify-between">
                  <p className="text-white font-mono text-sm">{item.batchId}</p>
                  <span className="text-xs text-primary font-semibold">Qty: {item.quantity}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {item.batch?.name || "Unknown batch"} • {item.batch?.status || "N/A"}
                </p>
              </div>
            ))}
            {inventory.length === 0 && <p className="text-sm text-muted-foreground">No stocked batches currently held.</p>}
          </div>
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <GlassCard>
          <div className="flex items-center gap-2 mb-5">
            <ScanLine className="w-5 h-5 text-amber-300" />
            <h2 className="text-xl font-bold text-white">QR Scanning</h2>
          </div>
          <form onSubmit={handleScan} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-white/80">QR payload / URL / Batch ID</Label>
              <Input
                value={qrInput}
                onChange={(e) => setQrInput(e.target.value)}
                className="bg-black/20 border-white/10 text-white"
                placeholder="https://.../portal?batch=MED-2026-X2"
              />
            </div>
            <Button type="submit" className="w-full bg-amber-500/20 border border-amber-500/30 text-amber-100 hover:bg-amber-500/30">
              Parse QR
            </Button>
          </form>
          {scannedBatchId && (
            <div className="mt-4 p-3 rounded-lg bg-white/5 border border-white/10">
              <p className="text-xs text-muted-foreground">Scanned Batch ID</p>
              <p className="text-white font-mono text-sm">{scannedBatchId}</p>
              {scannedBatch ? (
                <div className="mt-2">
                  <p className="text-xs text-white">{scannedBatch.name}</p>
                  <StatusBadge status={scannedBatch.status} />
                </div>
              ) : (
                <p className="text-xs text-red-300 mt-2">Batch not found in current records.</p>
              )}
            </div>
          )}
        </GlassCard>

        <GlassCard>
          <div className="flex items-center gap-2 mb-5">
            <History className="w-5 h-5 text-violet-300" />
            <h2 className="text-xl font-bold text-white">Movement History</h2>
          </div>
          <div className="space-y-3 max-h-[360px] overflow-y-auto">
            {movementHistory.map((t) => (
              <div key={t.id} className="p-3 rounded-lg bg-white/5 border border-white/10">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-white font-mono">{t.entityBatchId}</p>
                  <StatusBadge status={t.status} />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {t.fromId === user?.id ? "Outbound" : "Inbound"} • {t.fromId} -> {t.toId}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {t.createdAt ? new Date(t.createdAt).toLocaleString() : "N/A"}
                </p>
              </div>
            ))}
            {movementHistory.length === 0 && (
              <p className="text-sm text-muted-foreground">No transfer history yet.</p>
            )}
          </div>
        </GlassCard>
      </div>

      <GlassCard>
        <h2 className="text-xl font-bold text-white mb-4">Outgoing Transfer Queue</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-muted-foreground">
                <th className="p-3 font-medium">Transfer</th>
                <th className="p-3 font-medium">Batch</th>
                <th className="p-3 font-medium">To</th>
                <th className="p-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {outgoingTransfers.map((t) => (
                <tr key={t.id} className="border-b border-white/5">
                  <td className="p-3 text-white">#{t.id}</td>
                  <td className="p-3 text-white font-mono">{t.entityBatchId}</td>
                  <td className="p-3 text-white">{t.toId}</td>
                  <td className="p-3"><StatusBadge status={t.status} /></td>
                </tr>
              ))}
              {outgoingTransfers.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-4 text-center text-muted-foreground">
                    No outgoing transfers yet.
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
