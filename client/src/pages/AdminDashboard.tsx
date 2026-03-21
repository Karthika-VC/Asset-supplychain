import { format } from "date-fns";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useApproveUser, usePendingUsers, useRejectUser, useUsers } from "@/hooks/use-admin";
import { useMaterials } from "@/hooks/use-materials";
import { useBatches } from "@/hooks/use-batches";
import { useTransfers } from "@/hooks/use-transfers";
import { useAuthenticityReports } from "@/hooks/use-authenticity";
import { useFeedback } from "@/hooks/use-feedback";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, CheckCircle, ExternalLink, Loader2, Shield, XCircle } from "lucide-react";

function formatRole(role: string) {
  return role.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatStatus(status: string) {
  return status.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatCreatedAt(value: Date | string | null) {
  if (!value) {
    return "Unknown";
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return format(date, "dd MMM yyyy, hh:mm a");
}

function SummaryCard({
  label,
  value,
  helpText,
}: {
  label: string;
  value: number;
  helpText: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-bold text-white">{value}</p>
      <p className="mt-2 text-xs text-muted-foreground">{helpText}</p>
    </div>
  );
}

function DatasetSection({
  title,
  count,
  isLoading,
  error,
  emptyMessage,
}: {
  title: string;
  count: number;
  isLoading: boolean;
  error: unknown;
  emptyMessage: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
        ) : (
          <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-white/80">
            {count}
          </span>
        )}
      </div>
      <p className="mt-3 text-sm text-muted-foreground">
        {error instanceof Error ? error.message : emptyMessage}
      </p>
    </div>
  );
}

export default function AdminDashboard() {
  const { data: users = [], isLoading: usersLoading, error: usersError, refetch: refetchUsers } = useUsers();
  const {
    data: pendingUsers = [],
    isLoading: pendingLoading,
    isError: pendingIsError,
    error: pendingError,
    refetch: refetchPendingUsers,
    isFetching: pendingIsFetching,
  } = usePendingUsers();
  const { data: materials = [], isLoading: materialsLoading, error: materialsError } = useMaterials();
  const { data: batches = [], isLoading: batchesLoading, error: batchesError } = useBatches();
  const { data: transfers = [], isLoading: transfersLoading, error: transfersError } = useTransfers();
  const { data: authenticityReports = [], isLoading: authenticityLoading, error: authenticityError } = useAuthenticityReports();
  const { data: feedback = [], isLoading: feedbackLoading, error: feedbackError } = useFeedback();
  const approveMutation = useApproveUser();
  const rejectMutation = useRejectUser();
  const { toast } = useToast();

  const approvedUsers = users.filter((user) => user.accountStatus === "approved" || user.accountStatus === "active");
  const rejectedUsers = users.filter((user) => user.accountStatus === "rejected");

  const handleApprove = async (id: number) => {
    try {
      await approveMutation.mutateAsync(id);
      toast({
        title: "User approved",
        description: "The business account is now active.",
      });
    } catch (mutationError: any) {
      toast({
        title: "Approval failed",
        description: mutationError?.message || "Unable to approve this user.",
        variant: "destructive",
      });
    }
  };

  const handleReject = async (id: number) => {
    try {
      await rejectMutation.mutateAsync(id);
      toast({
        title: "User rejected",
        description: "The registration was marked as rejected.",
      });
    } catch (mutationError: any) {
      toast({
        title: "Rejection failed",
        description: mutationError?.message || "Unable to reject this user.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 fade-in-up space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-red-500/20 rounded-xl border border-red-500/30">
            <Shield className="w-8 h-8 text-red-400" />
          </div>
          <div>
            <h1 className="text-3xl font-display font-bold text-white">Admin Control Center</h1>
            <p className="text-muted-foreground">
              Review registrations and track core supply-chain records across the platform.
            </p>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={() => {
            void refetchPendingUsers();
            void refetchUsers();
          }}
          disabled={pendingLoading || pendingIsFetching || usersLoading}
          className="border-white/15 bg-white/5 text-white hover:bg-white/10"
        >
          {pendingIsFetching ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <SummaryCard label="Pending approvals" value={pendingUsers.length} helpText="Business accounts waiting for review" />
        <SummaryCard label="Approved users" value={approvedUsers.length} helpText="Accounts with active access" />
        <SummaryCard label="Rejected users" value={rejectedUsers.length} helpText="Registrations rejected by admin" />
        <SummaryCard label="Materials" value={materials.length} helpText="Tracked material entries" />
        <SummaryCard label="Batches" value={batches.length} helpText="Medicine batches in the system" />
        <SummaryCard label="Transfers" value={transfers.length} helpText="Movement events recorded across roles" />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <DatasetSection
          title="Authenticity reports"
          count={authenticityReports.length}
          isLoading={authenticityLoading}
          error={authenticityError}
          emptyMessage="Customer and pharmacy authenticity checks appear here."
        />
        <DatasetSection
          title="Feedback entries"
          count={feedback.length}
          isLoading={feedbackLoading}
          error={feedbackError}
          emptyMessage="Customer feedback records appear here."
        />
        <DatasetSection
          title="Registered users"
          count={users.length}
          isLoading={usersLoading}
          error={usersError}
          emptyMessage="All user registrations are visible below."
        />
      </div>

      <GlassCard glow="none" className="overflow-hidden border border-white/10 p-6">
        <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-4 mb-6">
          <div>
            <h2 className="text-xl font-bold text-white">Pending Business Users</h2>
            <p className="text-sm text-muted-foreground">
              Review pending manufacturers, distributors, raw material suppliers, and pharmacies.
            </p>
          </div>
        </div>

        {pendingLoading ? (
          <div className="flex min-h-64 items-center justify-center">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : pendingIsError ? (
          <div className="flex min-h-64 flex-col items-center justify-center text-center">
            <AlertCircle className="w-10 h-10 text-red-400 mb-3" />
            <p className="text-white font-semibold">Unable to load pending users</p>
            <p className="text-sm text-muted-foreground mb-5">
              {(pendingError as Error)?.message || "Something went wrong while fetching the approval queue."}
            </p>
            <Button
              type="button"
              onClick={() => void refetchPendingUsers()}
              className="bg-primary/80 hover:bg-primary text-primary-foreground"
            >
              Try Again
            </Button>
          </div>
        ) : pendingUsers.length === 0 ? (
          <div className="flex min-h-64 flex-col items-center justify-center text-center">
            <CheckCircle className="w-10 h-10 text-emerald-400 mb-3" />
            <p className="text-white font-semibold">No pending approvals</p>
            <p className="text-sm text-muted-foreground">
              New business registrations will appear here when they need review.
            </p>
          </div>
        ) : (
          <Table className="min-w-[1100px]">
            <TableHeader>
              <TableRow className="border-white/10 hover:bg-transparent">
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Organization</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Wallet</TableHead>
                <TableHead>Proof Document</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingUsers.map((user) => {
                const isApprovingUser =
                  approveMutation.isPending && approveMutation.variables === user.id;
                const isRejectingUser =
                  rejectMutation.isPending && rejectMutation.variables === user.id;
                const isRowBusy = isApprovingUser || isRejectingUser;

                return (
                  <TableRow key={user.id} className="border-white/5 hover:bg-white/5">
                    <TableCell className="font-medium text-white">{user.name}</TableCell>
                    <TableCell className="text-white">{user.email}</TableCell>
                    <TableCell className="text-white/80">{user.organization || "N/A"}</TableCell>
                    <TableCell>
                      <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/80">
                        {formatRole(user.role)}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-[180px] truncate text-xs text-muted-foreground">
                      {user.walletAddress || "Not provided"}
                    </TableCell>
                    <TableCell>
                      {user.proofUrl ? (
                        <a
                          href={user.proofUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-primary hover:underline"
                        >
                          View Document
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      ) : (
                        <span className="text-muted-foreground">No document</span>
                      )}
                    </TableCell>
                    <TableCell className="text-white/80">{formatCreatedAt(user.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => void handleApprove(user.id)}
                          disabled={isRowBusy}
                          className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30"
                        >
                          {isApprovingUser ? (
                            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                          ) : (
                            <CheckCircle className="w-4 h-4 mr-1" />
                          )}
                          Approve
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          onClick={() => void handleReject(user.id)}
                          disabled={isRowBusy}
                        >
                          {isRejectingUser ? (
                            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                          ) : (
                            <XCircle className="w-4 h-4 mr-1" />
                          )}
                          Reject
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </GlassCard>

      <GlassCard glow="none" className="overflow-hidden border border-white/10 p-6">
        <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-4 mb-6">
          <div>
            <h2 className="text-xl font-bold text-white">All Registrations</h2>
            <p className="text-sm text-muted-foreground">
              Approved, pending, rejected, and customer accounts from the main user registry.
            </p>
          </div>
        </div>

        {usersLoading ? (
          <div className="flex min-h-48 items-center justify-center">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : usersError ? (
          <div className="text-sm text-red-200">{(usersError as Error).message}</div>
        ) : (
          <Table className="min-w-[1100px]">
            <TableHeader>
              <TableRow className="border-white/10 hover:bg-transparent">
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Account Status</TableHead>
                <TableHead>Approved</TableHead>
                <TableHead>Organization</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id} className="border-white/5 hover:bg-white/5">
                  <TableCell className="font-medium text-white">{user.name}</TableCell>
                  <TableCell className="text-white">{user.email}</TableCell>
                  <TableCell className="text-white/80">{formatRole(user.role)}</TableCell>
                  <TableCell>
                    <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/80">
                      {formatStatus(user.accountStatus)}
                    </span>
                  </TableCell>
                  <TableCell className="text-white/80">{user.isApproved ? "Yes" : "No"}</TableCell>
                  <TableCell className="text-white/80">{user.organization || "N/A"}</TableCell>
                  <TableCell className="text-white/80">{formatCreatedAt(user.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </GlassCard>
    </div>
  );
}
