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
import { useApproveUser, usePendingUsers, useRejectUser } from "@/hooks/use-admin";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, CheckCircle, ExternalLink, Loader2, Shield, XCircle } from "lucide-react";

function formatRole(role: string) {
  return role.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
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

export default function AdminDashboard() {
  const { data: users = [], isLoading, isError, error, refetch, isFetching } = usePendingUsers();
  const approveMutation = useApproveUser();
  const rejectMutation = useRejectUser();
  const { toast } = useToast();

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
        description: "The pending registration was removed successfully.",
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 fade-in-up">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-red-500/20 rounded-xl border border-red-500/30">
            <Shield className="w-8 h-8 text-red-400" />
          </div>
          <div>
            <h1 className="text-3xl font-display font-bold text-white">Admin Approval Queue</h1>
            <p className="text-muted-foreground">
              Review pending manufacturers, distributors, raw material suppliers, and pharmacies.
            </p>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={() => void refetch()}
          disabled={isLoading || isFetching}
          className="border-white/15 bg-white/5 text-white hover:bg-white/10"
        >
          {isFetching ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
          Refresh
        </Button>
      </div>

      <GlassCard glow="none" className="overflow-hidden border border-white/10">
        <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-4 mb-6">
          <div>
            <h2 className="text-xl font-bold text-white">Pending Business Users</h2>
            <p className="text-sm text-muted-foreground">
              {users.length} registration{users.length === 1 ? "" : "s"} waiting for admin approval.
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex min-h-64 items-center justify-center">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : isError ? (
          <div className="flex min-h-64 flex-col items-center justify-center text-center">
            <AlertCircle className="w-10 h-10 text-red-400 mb-3" />
            <p className="text-white font-semibold">Unable to load pending users</p>
            <p className="text-sm text-muted-foreground mb-5">
              {(error as Error)?.message || "Something went wrong while fetching the approval queue."}
            </p>
            <Button
              type="button"
              onClick={() => void refetch()}
              className="bg-primary/80 hover:bg-primary text-primary-foreground"
            >
              Try Again
            </Button>
          </div>
        ) : users.length === 0 ? (
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
                <TableHead>Phone</TableHead>
                <TableHead>Organization</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Wallet</TableHead>
                <TableHead>Proof Document</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => {
                const isApprovingUser =
                  approveMutation.isPending && approveMutation.variables === user.id;
                const isRejectingUser =
                  rejectMutation.isPending && rejectMutation.variables === user.id;
                const isRowBusy = isApprovingUser || isRejectingUser;

                return (
                  <TableRow key={user.id} className="border-white/5 hover:bg-white/5">
                    <TableCell className="font-medium text-white">{user.name}</TableCell>
                    <TableCell className="text-white">{user.email}</TableCell>
                    <TableCell className="text-white/80">{user.phone}</TableCell>
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
    </div>
  );
}
