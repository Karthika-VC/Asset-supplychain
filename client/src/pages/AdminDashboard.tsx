import { useUsers, useApproveUser } from "@/hooks/use-admin";
import { useMetaMask } from "@/hooks/use-metamask";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Shield, Loader2 } from "lucide-react";

export default function AdminDashboard() {
  const { data: users, isLoading } = useUsers();
  const { mutate: approve, isPending } = useApproveUser();
  const { sendTransaction, address } = useMetaMask();

  const handleApprove = async (id: number) => {
    try {
      const tx = await sendTransaction("Approve Business Entity");
      approve({
        id,
        isApproved: true,
        walletAddress: address ?? tx.from,
        txHash: tx.txHash,
        chainId: tx.chainId,
        blockNumber: tx.blockNumber,
        contractAddress: tx.contractAddress,
      });
    } catch (e) {
      console.error(e);
    }
  };

  const pendingUsers = users?.filter(u => !u.isApproved && u.role !== 'customer') || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 fade-in-up">
      <div className="flex items-center gap-4 mb-8">
        <div className="p-3 bg-red-500/20 rounded-xl border border-red-500/30">
          <Shield className="w-8 h-8 text-red-400" />
        </div>
        <div>
          <h1 className="text-3xl font-display font-bold text-white">Admin Control Center</h1>
          <p className="text-muted-foreground">Manage network participants and permissions.</p>
        </div>
      </div>

      <GlassCard glow="none" className="overflow-hidden">
        <h2 className="text-xl font-bold text-white mb-6 border-b border-white/10 pb-4">Pending Approvals</h2>
        
        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>
        ) : pendingUsers.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">No pending user approvals.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-muted-foreground">
                  <th className="p-4 font-medium">Organization</th>
                  <th className="p-4 font-medium">Role</th>
                  <th className="p-4 font-medium">Contact</th>
                  <th className="p-4 font-medium">Proof Document</th>
                  <th className="p-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingUsers.map(user => (
                  <tr key={user.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="p-4 text-white font-medium">{user.organization}</td>
                    <td className="p-4">
                      <span className="px-3 py-1 rounded-full bg-white/10 text-xs border border-white/10">
                        {user.role.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="text-sm text-white">{user.name}</div>
                      <div className="text-xs text-muted-foreground">{user.email}</div>
                    </td>
                    <td className="p-4">
                      <a href={user.proofUrl || "#"} target="_blank" rel="noreferrer" className="text-primary hover:underline text-sm flex items-center gap-1">
                        View Document
                      </a>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          onClick={() => handleApprove(user.id)}
                          disabled={isPending}
                          size="sm" 
                          className="bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/30"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" /> Approve
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>
    </div>
  );
}
