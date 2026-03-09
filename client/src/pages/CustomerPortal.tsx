import { useMemo, useState } from "react";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/StatusBadge";
import { useUser } from "@/hooks/use-auth";
import { useBatch } from "@/hooks/use-batches";
import { useAuthenticityReports, useCreateAuthenticityReport } from "@/hooks/use-authenticity";
import { useCreateFeedback } from "@/hooks/use-feedback";
import { Search, ShieldCheck, AlertTriangle, User, ScanLine, Star, BadgeCheck } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

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

export default function CustomerPortal() {
  const { data: user } = useUser();
  const [searchInput, setSearchInput] = useState("");
  const [qrInput, setQrInput] = useState("");
  const [queryId, setQueryId] = useState("");

  const [rating, setRating] = useState(5);
  const [feedbackComment, setFeedbackComment] = useState("");
  const [reportComment, setReportComment] = useState("");

  const { data: batch, isLoading, isError } = useBatch(queryId);
  const { data: authenticityReports = [] } = useAuthenticityReports();
  const { mutate: createFeedback, isPending: isSubmittingFeedback } = useCreateFeedback();
  const { mutate: createAuthenticityReport, isPending: isSubmittingReport } = useCreateAuthenticityReport();

  const batchAuthenticity = useMemo(
    () =>
      authenticityReports
        .filter((r) => r.batchId === queryId)
        .sort((a, b) => {
          const at = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return bt - at;
        }),
    [authenticityReports, queryId],
  );

  const authenticityBadge = useMemo(() => {
    if (!batch) return { label: "Unknown", className: "text-gray-300" };
    const hasFlagged = batchAuthenticity.some((r) => r.status === "flagged" || r.status === "suspicious");
    if (hasFlagged) return { label: "Under Review", className: "text-amber-300" };
    return { label: "Verified", className: "text-primary" };
  }, [batch, batchAuthenticity]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const id = parseBatchIdFromQrInput(searchInput);
    if (id) setQueryId(id);
  };

  const handleQrResolve = (e: React.FormEvent) => {
    e.preventDefault();
    const id = parseBatchIdFromQrInput(qrInput);
    if (id) {
      setSearchInput(id);
      setQueryId(id);
    }
  };

  const handleFeedbackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!batch || !user) return;
    createFeedback({
      batchId: batch.batchId,
      customerId: user.id,
      rating,
      comments: feedbackComment || undefined,
    });
    setFeedbackComment("");
    setRating(5);
  };

  const handleSuspiciousReport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!batch || !user) return;
    createAuthenticityReport({
      batchId: batch.batchId,
      reportedBy: user.id,
      status: "flagged",
      comments: reportComment || "Reported by customer",
    });
    setReportComment("");
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 fade-in-up space-y-8">
      <div className="flex items-center gap-4 justify-center">
        <div className="p-3 bg-white/10 rounded-xl border border-white/20">
          <User className="w-8 h-8 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-display font-bold text-white">Patient Portal</h1>
          <p className="text-muted-foreground">Verify medicines by batch or QR without wallet setup</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <GlassCard glow="teal">
          <form onSubmit={handleSearch} className="space-y-3">
            <h2 className="text-lg font-bold text-white">Batch Lookup</h2>
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="bg-black/20 border-white/10 text-white h-12"
              placeholder="Enter batch ID (e.g. MED-2026-X2)"
            />
            <Button type="submit" className="w-full h-11 bg-primary text-primary-foreground hover:bg-primary/90">
              <Search className="w-4 h-4 mr-2" /> Search Batch
            </Button>
          </form>
        </GlassCard>

        <GlassCard glow="violet">
          <form onSubmit={handleQrResolve} className="space-y-3">
            <h2 className="text-lg font-bold text-white">QR Scan Input</h2>
            <Input
              value={qrInput}
              onChange={(e) => setQrInput(e.target.value)}
              className="bg-black/20 border-white/10 text-white h-12"
              placeholder="Paste QR payload or URL"
            />
            <Button type="submit" className="w-full h-11 bg-accent text-white hover:bg-accent/90">
              <ScanLine className="w-4 h-4 mr-2" /> Resolve QR
            </Button>
          </form>
        </GlassCard>
      </div>

      {isLoading && (
        <div className="text-center py-12 text-primary animate-pulse font-mono">
          Querying supply-chain records...
        </div>
      )}

      {isError && (
        <GlassCard className="border-red-500/30 bg-red-500/10 text-center py-8">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">Record Not Found</h3>
          <p className="text-red-200/70">The entered Batch ID is unavailable. Please verify QR source.</p>
        </GlassCard>
      )}

      {batch && (
        <div className="space-y-6">
          <GlassCard className="relative overflow-hidden border-teal-500/30">
            <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
              <ShieldCheck className="w-40 h-40 text-primary" />
            </div>

            <div className="flex items-start justify-between mb-6 relative z-10">
              <div>
                <h2 className="text-3xl font-display font-bold text-white">{batch.name}</h2>
                <p className="text-lg font-mono text-muted-foreground mt-1">ID: {batch.batchId}</p>
                <div className="mt-3"><StatusBadge status={batch.status} /></div>
              </div>
              <div className="bg-white p-2 rounded-xl">
                <QRCodeSVG value={`${window.location.origin}/portal?batch=${batch.batchId}`} size={88} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
              <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                <p className="text-xs text-muted-foreground">Medicine Details</p>
                <p className="text-white font-semibold mt-1">{batch.name}</p>
                <p className="text-xs text-muted-foreground mt-1">Source Material: {batch.materialBatchId || "N/A"}</p>
                <p className="text-xs text-muted-foreground">Manufacturer ID: {batch.manufacturerId}</p>
              </div>
              <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                <p className="text-xs text-muted-foreground">Authenticity</p>
                <div className="flex items-center gap-2 mt-1">
                  <BadgeCheck className={`w-4 h-4 ${authenticityBadge.className}`} />
                  <p className={`font-semibold ${authenticityBadge.className}`}>{authenticityBadge.label}</p>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Tx: {batch.blockchainHash?.slice(0, 18) || "N/A"}...</p>
                <p className="text-xs text-muted-foreground">Chain ID: {batch.chainId ?? "N/A"}</p>
              </div>
            </div>
          </GlassCard>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <GlassCard>
              <h3 className="text-lg font-bold text-white mb-4">Authenticity View</h3>
              <div className="space-y-3 max-h-[260px] overflow-y-auto">
                {batchAuthenticity.map((report) => (
                  <div key={report.id} className="p-3 rounded-lg bg-white/5 border border-white/10">
                    <div className="flex items-center justify-between">
                      <p className="text-white text-sm">Report #{report.id}</p>
                      <StatusBadge status={report.status} />
                    </div>
                    {report.comments && <p className="text-xs text-muted-foreground mt-1">{report.comments}</p>}
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {report.createdAt ? new Date(report.createdAt).toLocaleString() : "N/A"}
                    </p>
                  </div>
                ))}
                {batchAuthenticity.length === 0 && (
                  <p className="text-sm text-muted-foreground">No authenticity incidents reported for this batch.</p>
                )}
              </div>

              <form onSubmit={handleSuspiciousReport} className="mt-4 pt-4 border-t border-white/10 space-y-3">
                <Input
                  value={reportComment}
                  onChange={(e) => setReportComment(e.target.value)}
                  className="bg-black/20 border-white/10 text-white"
                  placeholder="Report suspicious details (optional)"
                />
                <Button type="submit" disabled={isSubmittingReport} variant="outline" className="w-full border-red-500/30 text-red-300 hover:bg-red-500/10">
                  <AlertTriangle className="w-4 h-4 mr-2" /> Report Suspicious Activity
                </Button>
              </form>
            </GlassCard>

            <GlassCard>
              <h3 className="text-lg font-bold text-white mb-4">Feedback & Rating</h3>
              <form onSubmit={handleFeedbackSubmit} className="space-y-4">
                <div>
                  <p className="text-sm text-white mb-2">Rating</p>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setRating(value)}
                        className={`p-2 rounded-md border ${rating >= value ? "border-amber-400 bg-amber-400/20" : "border-white/10 bg-white/5"}`}
                      >
                        <Star className={`w-4 h-4 ${rating >= value ? "text-amber-300" : "text-muted-foreground"}`} />
                      </button>
                    ))}
                  </div>
                </div>
                <Input
                  value={feedbackComment}
                  onChange={(e) => setFeedbackComment(e.target.value)}
                  className="bg-black/20 border-white/10 text-white"
                  placeholder="Share your feedback (optional)"
                />
                <Button type="submit" disabled={isSubmittingFeedback} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                  Submit Feedback
                </Button>
              </form>
            </GlassCard>
          </div>
        </div>
      )}
    </div>
  );
}
