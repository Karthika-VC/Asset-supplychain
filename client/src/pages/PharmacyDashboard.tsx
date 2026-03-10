import { useMemo, useState } from "react";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/StatusBadge";
import { useUser } from "@/hooks/use-auth";
import { useMetaMask } from "@/hooks/use-metamask";
import { useBatch, useBatches, useUpdateBatchStatus } from "@/hooks/use-batches";
import { useTransfers, useCreateTransfer, useUpdateTransferStatus } from "@/hooks/use-transfers";
import { useAuthenticityReports, useCreateAuthenticityReport } from "@/hooks/use-authenticity";
import { Store, Download, Boxes, ShieldCheck, ScanLine, History } from "lucide-react";

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

export default function PharmacyDashboard() {
  const { data: user } = useUser();
  const { sendTransaction } = useMetaMask();

  const { data: batches = [] } = useBatches();
  const { mutate: updateStatus } = useUpdateBatchStatus();
  const { data: transfers = [] } = useTransfers();
  const { mutate: createTransfer, isPending: isCreatingTransfer } = useCreateTransfer();
  const { mutate: updateTransferStatus, isPending: isUpdatingTransfer } = useUpdateTransferStatus();
  const { data: authenticityReports = [] } = useAuthenticityReports();
  const { mutate: createAuthenticityReport, isPending: isCreatingReport } = useCreateAuthenticityReport();

  const [dispenseBatchId, setDispenseBatchId] = useState("");
  const [customerUserId, setCustomerUserId] = useState("");

  const [verifyBatchId, setVerifyBatchId] = useState("");
  const [verifyStatus, setVerifyStatus] = useState<"verified" | "flagged" | "suspicious">("verified");
  const [verifyComments, setVerifyComments] = useState("");

  const [qrInput, setQrInput] = useState("");
  const [searchBatchId, setSearchBatchId] = useState("");
  const [resolvedBatchId, setResolvedBatchId] = useState("");
  const { data: searchedBatch } = useBatch(resolvedBatchId);

  const incomingTransfers = useMemo(
    () => transfers.filter((t) => t.toId === user?.id && t.entityType === "medicine" && t.status === "initiated"),
    [transfers, user?.id],
  );

  const incomingBatches = useMemo(
    () => batches.filter((b) => ["Shipped", "Received"].includes(b.status)),
    [batches],
  );

  const inventory = useMemo(() => {
    const stock = new Map<string, number>();

    for (const b of batches) {
      if (b.status === "Received") {
        stock.set(b.batchId, (stock.get(b.batchId) ?? 0) + 1);
      }
    }

    for (const t of transfers) {
      if (t.entityType !== "medicine" || t.status !== "completed") continue;
      if (t.toId === user?.id) stock.set(t.entityBatchId, (stock.get(t.entityBatchId) ?? 0) + 1);
      if (t.fromId === user?.id) stock.set(t.entityBatchId, (stock.get(t.entityBatchId) ?? 0) - 1);
    }

    return Array.from(stock.entries())
      .map(([batchId, quantity]) => ({
        batchId,
        quantity,
        batch: batches.find((b) => b.batchId === batchId),
      }))
      .filter((x) => x.quantity > 0);
  }, [batches, transfers, user?.id]);

  const movementHistory = useMemo(
    () =>
      transfers
        .filter((t) => t.fromId === user?.id || t.toId === user?.id)
        .sort((a, b) => {
          const at = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return bt - at;
        }),
    [transfers, user?.id],
  );

  const myAuthenticityHistory = useMemo(
    () =>
      authenticityReports
        .filter((r) => r.reportedBy === user?.id)
        .sort((a, b) => {
          const at = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return bt - at;
        }),
    [authenticityReports, user?.id],
  );

  const handleReceiveByTransfer = async (transferId: number, batchId: string) => {
    try {
      const tx = await sendTransaction("Receive Medicines");
      updateTransferStatus({
        id: transferId,
        status: "completed",
        txHash: tx.txHash,
        chainId: tx.chainId,
        blockNumber: tx.blockNumber,
        contractAddress: tx.contractAddress,
      });
      updateStatus({
        batchId,
        status: "Received",
        txHash: tx.txHash,
        chainId: tx.chainId,
        blockNumber: tx.blockNumber,
        contractAddress: tx.contractAddress,
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleReceiveByBatch = async (batchId: string) => {
    try {
      const tx = await sendTransaction("Receive Medicines");
      updateStatus({
        batchId,
        status: "Received",
        txHash: tx.txHash,
        chainId: tx.chainId,
        blockNumber: tx.blockNumber,
        contractAddress: tx.contractAddress,
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleDispense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const toId = Number(customerUserId);
    if (!Number.isInteger(toId) || toId <= 0) return;

    try {
      const tx = await sendTransaction("Dispense Medicine");
      createTransfer({
        fromId: user.id,
        toId,
        entityType: "medicine",
        entityBatchId: dispenseBatchId,
        status: "completed",
        blockchainHash: tx.txHash,
        txHash: tx.txHash,
        chainId: tx.chainId,
        blockNumber: tx.blockNumber,
        contractAddress: tx.contractAddress,
      });
      setDispenseBatchId("");
      setCustomerUserId("");
    } catch (e) {
      console.error(e);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      await sendTransaction("Verify Authenticity");
      createAuthenticityReport({
        batchId: verifyBatchId,
        reportedBy: user.id,
        status: verifyStatus,
        comments: verifyComments || undefined,
      });
      setVerifyBatchId("");
      setVerifyComments("");
      setVerifyStatus("verified");
    } catch (e) {
      console.error(e);
    }
  };

  const handleResolveBatch = (e: React.FormEvent) => {
    e.preventDefault();
    const raw = searchBatchId || qrInput;
    setResolvedBatchId(parseBatchIdFromQrInput(raw));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 fade-in-up space-y-8">
      <div className="flex items-center gap-4 mb-2">
        <div className="p-3 bg-teal-500/20 rounded-xl border border-teal-500/30">
          <Store className="w-8 h-8 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-display font-bold text-white">Pharmacy Inventory</h1>
          <p className="text-muted-foreground">{user?.organization} Dashboard</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <GlassCard>
          <h2 className="text-xl font-bold text-white mb-4">Receive Medicines</h2>
          <div className="overflow-x-auto mb-5">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-muted-foreground">
                  <th className="p-3 font-medium">Transfer</th>
                  <th className="p-3 font-medium">Batch</th>
                  <th className="p-3 font-medium">Status</th>
                  <th className="p-3 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {incomingTransfers.map((t) => (
                  <tr key={t.id} className="border-b border-white/5">
                    <td className="p-3 text-white">#{t.id}</td>
                    <td className="p-3 text-white font-mono">{t.entityBatchId}</td>
                    <td className="p-3"><StatusBadge status={t.status} /></td>
                    <td className="p-3 text-right">
                      <Button
                        size="sm"
                        onClick={() => handleReceiveByTransfer(t.id, t.entityBatchId)}
                        disabled={isUpdatingTransfer}
                        className="bg-primary text-primary-foreground hover:bg-primary/90"
                      >
                        <Download className="w-4 h-4 mr-2" /> Receive
                      </Button>
                    </td>
                  </tr>
                ))}
                {incomingTransfers.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-3 text-center text-muted-foreground">
                      No incoming transfer requests.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="pt-4 border-t border-white/10">
            <p className="text-sm text-muted-foreground mb-3">Direct receive by batch status</p>
            <div className="space-y-2">
              {incomingBatches
                .filter((b) => b.status === "Shipped")
                .slice(0, 5)
                .map((b) => (
                  <div key={b.id} className="flex items-center justify-between bg-white/5 border border-white/10 rounded-lg p-3">
                    <div>
                      <p className="text-white text-sm font-mono">{b.batchId}</p>
                      <p className="text-xs text-muted-foreground">{b.name}</p>
                    </div>
                    <Button size="sm" onClick={() => handleReceiveByBatch(b.batchId)} className="bg-primary text-primary-foreground hover:bg-primary/90">
                      Mark Received
                    </Button>
                  </div>
                ))}
            </div>
          </div>
        </GlassCard>

        <GlassCard>
          <div className="flex items-center gap-2 mb-4">
            <Boxes className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-bold text-white">Manage Stock</h2>
          </div>
          <form onSubmit={handleDispense} className="space-y-4 mb-6">
            <div className="space-y-2">
              <Label className="text-white/80">Batch ID to Dispense</Label>
              <Input
                required
                value={dispenseBatchId}
                onChange={(e) => setDispenseBatchId(e.target.value)}
                className="bg-black/20 border-white/10 text-white"
                placeholder="MED-2026-X2"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-white/80">Customer User ID</Label>
              <Input
                required
                value={customerUserId}
                onChange={(e) => setCustomerUserId(e.target.value)}
                className="bg-black/20 border-white/10 text-white"
                placeholder="101"
              />
            </div>
            <Button type="submit" disabled={isCreatingTransfer} className="w-full bg-teal-600 hover:bg-teal-700 text-white">
              Dispense / Update Stock
            </Button>
          </form>

          <div className="space-y-3 max-h-[240px] overflow-y-auto">
            {inventory.map((item) => (
              <div key={item.batchId} className="p-3 rounded-lg bg-white/5 border border-white/10">
                <div className="flex items-center justify-between">
                  <p className="text-white font-mono">{item.batchId}</p>
                  <span className="text-xs text-primary font-semibold">Qty {item.quantity}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{item.batch?.name || "Unknown batch"}</p>
              </div>
            ))}
            {inventory.length === 0 && (
              <p className="text-sm text-muted-foreground">No stock available in pharmacy inventory.</p>
            )}
          </div>
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <GlassCard>
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheck className="w-5 h-5 text-amber-300" />
            <h2 className="text-xl font-bold text-white">Verify Authenticity</h2>
          </div>
          <form onSubmit={handleVerify} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-white/80">Batch ID</Label>
              <Input
                required
                value={verifyBatchId}
                onChange={(e) => setVerifyBatchId(e.target.value)}
                className="bg-black/20 border-white/10 text-white"
                placeholder="MED-2026-X2"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-white/80">Verification Status</Label>
              <select
                value={verifyStatus}
                onChange={(e) => setVerifyStatus(e.target.value as typeof verifyStatus)}
                className="w-full h-11 rounded-md bg-black/20 border border-white/10 text-white px-3"
              >
                <option value="verified">Verified</option>
                <option value="flagged">Flagged</option>
                <option value="suspicious">Suspicious</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-white/80">Comments</Label>
              <Input
                value={verifyComments}
                onChange={(e) => setVerifyComments(e.target.value)}
                className="bg-black/20 border-white/10 text-white"
                placeholder="Packaging matched expected records"
              />
            </div>
            <Button type="submit" disabled={isCreatingReport} className="w-full bg-amber-500/20 border border-amber-500/30 text-amber-100 hover:bg-amber-500/30">
              Submit Verification
            </Button>
          </form>
        </GlassCard>

        <GlassCard>
          <div className="flex items-center gap-2 mb-4">
            <ScanLine className="w-5 h-5 text-violet-300" />
            <h2 className="text-xl font-bold text-white">Scan QR / Search Batch</h2>
          </div>
          <form onSubmit={handleResolveBatch} className="space-y-3">
            <div className="space-y-2">
              <Label className="text-white/80">QR payload or URL</Label>
              <Input
                value={qrInput}
                onChange={(e) => setQrInput(e.target.value)}
                className="bg-black/20 border-white/10 text-white"
                placeholder="https://.../portal?batch=MED-2026-X2"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-white/80">Or search by Batch ID</Label>
              <Input
                value={searchBatchId}
                onChange={(e) => setSearchBatchId(e.target.value)}
                className="bg-black/20 border-white/10 text-white"
                placeholder="MED-2026-X2"
              />
            </div>
            <Button type="submit" className="w-full bg-violet-500/20 border border-violet-500/30 text-violet-100 hover:bg-violet-500/30">
              Resolve Batch
            </Button>
          </form>

          {resolvedBatchId && (
            <div className="mt-5 p-4 rounded-lg bg-white/5 border border-white/10">
              <p className="text-xs text-muted-foreground">Resolved Batch</p>
              <p className="text-white font-mono">{resolvedBatchId}</p>
              {searchedBatch ? (
                <div className="mt-2">
                  <p className="text-sm text-white">{searchedBatch.name}</p>
                  <div className="mt-2"><StatusBadge status={searchedBatch.status} /></div>
                </div>
              ) : (
                <p className="text-sm text-red-300 mt-2">No batch record found.</p>
              )}
            </div>
          )}
        </GlassCard>
      </div>

      <GlassCard>
        <div className="flex items-center gap-2 mb-4">
          <History className="w-5 h-5 text-blue-300" />
          <h2 className="text-xl font-bold text-white">History View</h2>
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-semibold text-white mb-3">Movement History</h3>
            <div className="space-y-2 max-h-[260px] overflow-y-auto">
              {movementHistory.map((t) => (
                <div key={t.id} className="p-3 rounded-lg bg-white/5 border border-white/10">
                  <div className="flex items-center justify-between">
                    <p className="text-white font-mono text-sm">{t.entityBatchId}</p>
                    <StatusBadge status={t.status} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{t.fromId} {"->"} {t.toId}</p>
                  <p className="text-[11px] text-muted-foreground">{t.createdAt ? new Date(t.createdAt).toLocaleString() : "N/A"}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white mb-3">Authenticity Actions</h3>
            <div className="space-y-2 max-h-[260px] overflow-y-auto">
              {myAuthenticityHistory.map((r) => (
                <div key={r.id} className="p-3 rounded-lg bg-white/5 border border-white/10">
                  <div className="flex items-center justify-between">
                    <p className="text-white font-mono text-sm">{r.batchId}</p>
                    <StatusBadge status={r.status} />
                  </div>
                  {r.comments && <p className="text-xs text-muted-foreground mt-1">{r.comments}</p>}
                  <p className="text-[11px] text-muted-foreground">{r.createdAt ? new Date(r.createdAt).toLocaleString() : "N/A"}</p>
                </div>
              ))}
              {myAuthenticityHistory.length === 0 && (
                <p className="text-sm text-muted-foreground">No authenticity records submitted yet.</p>
              )}
            </div>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}

