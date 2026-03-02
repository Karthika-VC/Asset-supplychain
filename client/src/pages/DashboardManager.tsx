import { useUser } from "@/hooks/use-auth";
import AdminDashboard from "./AdminDashboard";
import MaterialDashboard from "./MaterialDashboard";
import ManufacturerDashboard from "./ManufacturerDashboard";
import DistributorDashboard from "./DistributorDashboard";
import PharmacyDashboard from "./PharmacyDashboard";
import CustomerPortal from "./CustomerPortal";
import { Loader2 } from "lucide-react";

export default function DashboardManager() {
  const { data: user, isLoading } = useUser();

  if (isLoading) {
    return (
      <div className="h-[calc(100vh-5rem)] flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
      </div>
    );
  }

  if (!user) {
    window.location.href = "/login";
    return null;
  }

  if (!user.isApproved && user.role !== 'customer') {
    return (
      <div className="max-w-2xl mx-auto mt-20 p-8 text-center glass rounded-2xl border-yellow-500/20 shadow-[0_0_30px_rgba(234,179,8,0.1)]">
        <h2 className="text-3xl font-display font-bold text-white mb-4">Approval Pending</h2>
        <p className="text-muted-foreground text-lg">
          Your organization account is currently under review by our administration team. 
          You will gain access to the dashboard once your business license is verified.
        </p>
      </div>
    );
  }

  switch (user.role) {
    case 'admin': return <AdminDashboard />;
    case 'material_distributor': return <MaterialDashboard />;
    case 'manufacturer': return <ManufacturerDashboard />;
    case 'distributor': return <DistributorDashboard />;
    case 'pharmacy': return <PharmacyDashboard />;
    case 'customer': return <CustomerPortal />;
    default: return <div>Unknown role</div>;
  }
}
