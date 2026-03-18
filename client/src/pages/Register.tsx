import { useMemo, useState } from "react";
import { Link } from "wouter";
import { useRegister } from "@/hooks/use-auth";
import { useMetaMask } from "@/hooks/use-metamask";
import { GlassCard } from "@/components/GlassCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Activity } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { RegisterRequest } from "@shared/routes";

type RegisterFormState = {
  name: string;
  email: string;
  password: string;
  phone: string;
  organization: string;
  role: RegisterRequest["role"];
  profileRefNumber: string;
};

export default function Register() {
  const [formData, setFormData] = useState<RegisterFormState>({
    name: "",
    email: "",
    password: "",
    phone: "",
    organization: "",
    role: "customer",
    profileRefNumber: "",
  });
  const [proofFile, setProofFile] = useState<File | null>(null);

  const { mutateAsync: register, isPending } = useRegister();
  const { connect, address, isConnecting } = useMetaMask();
  const { toast } = useToast();

  const isBusinessRole = formData.role !== "customer";
  const profileRefLabel = useMemo(() => {
    if (formData.role === "pharmacy") return "Pharmacy Permit Number";
    return "Business License Number";
  }, [formData.role]);

  const walletLabel = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : "No wallet connected";

  const buildMultipartPayload = () => {
    const payload = new FormData();

    payload.append("name", formData.name);
    payload.append("email", formData.email);
    payload.append("password", formData.password);
    payload.append("phone", formData.phone);
    payload.append("role", formData.role);

    if (formData.organization.trim()) {
      payload.append("organization", formData.organization.trim());
    }

    if (address) {
      payload.append("walletAddress", address);
    }

    if (proofFile) {
      payload.append("proof", proofFile);
    }

    if (formData.role === "manufacturer") {
      payload.append("facilityName", formData.organization.trim());
      payload.append("licenseNumber", formData.profileRefNumber.trim());
    } else if (formData.role === "distributor" || formData.role === "material_distributor") {
      payload.append("distributionCenterName", formData.organization.trim());
      payload.append("licenseNumber", formData.profileRefNumber.trim());
    } else if (formData.role === "pharmacy") {
      payload.append("pharmacyName", formData.organization.trim());
      payload.append("permitNumber", formData.profileRefNumber.trim());
    }

    return payload;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (isBusinessRole) {
        if (!proofFile) {
          toast({
            title: "Document Required",
            description: "Please upload an approval document for business registration.",
            variant: "destructive",
          });
          return;
        }

        if (!address) {
          toast({
            title: "Wallet Required",
            description: "Please connect your MetaMask wallet before submitting.",
            variant: "destructive",
          });
          return;
        }
      }

      await register(buildMultipartPayload());
    } catch (err: any) {
      toast({
        title: "Registration Failed",
        description: err.message || "Unable to complete registration.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center p-4 py-12">
      <div className="w-full max-w-lg fade-in-up">
        <GlassCard glow="teal" className="p-8">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mb-4 border border-white/20">
              <Activity className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-3xl font-display font-bold text-white">Join PharmaChain</h2>
            <p className="text-muted-foreground mt-2 text-center">Secure the future of pharmaceutical distribution</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-white/80">Full Name</Label>
                <Input
                  id="name"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="bg-black/20 border-white/10 text-white focus:border-primary h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-white/80">Phone</Label>
                <Input
                  id="phone"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="bg-black/20 border-white/10 text-white focus:border-primary h-11"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-white/80">Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="bg-black/20 border-white/10 text-white focus:border-primary h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-white/80">Password</Label>
              <Input
                id="password"
                type="password"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="bg-black/20 border-white/10 text-white focus:border-primary h-11"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-white/80">Account Type</Label>
              <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value as RegisterRequest["role"] })}>
                <SelectTrigger className="bg-black/20 border-white/10 text-white h-11">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-white/10 text-white">
                  <SelectItem value="customer">Patient / Customer</SelectItem>
                  <SelectItem value="pharmacy">Pharmacy</SelectItem>
                  <SelectItem value="distributor">Distributor</SelectItem>
                  <SelectItem value="manufacturer">Manufacturer</SelectItem>
                  <SelectItem value="material_distributor">Raw Material Supplier</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isBusinessRole && (
              <>
                <div className="space-y-2 fade-in-up delay-100">
                  <Label htmlFor="org" className="text-white/80">Organization Name</Label>
                  <Input
                    id="org"
                    required
                    value={formData.organization}
                    onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                    className="bg-black/20 border-white/10 text-white focus:border-primary h-11"
                  />
                </div>
                <div className="space-y-2 fade-in-up delay-100">
                  <Label htmlFor="profileRef" className="text-white/80">{profileRefLabel}</Label>
                  <Input
                    id="profileRef"
                    required
                    value={formData.profileRefNumber}
                    onChange={(e) => setFormData({ ...formData, profileRefNumber: e.target.value })}
                    className="bg-black/20 border-white/10 text-white focus:border-primary h-11"
                  />
                </div>
                <div className="space-y-2 fade-in-up delay-100">
                  <Label htmlFor="proofFile" className="text-white/80">Approval Document Upload</Label>
                  <Input
                    id="proofFile"
                    type="file"
                    required
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    onChange={(e) => setProofFile(e.target.files?.[0] ?? null)}
                    className="bg-black/20 border-white/10 text-white focus:border-primary h-11 file:text-white file:bg-white/10 file:border-0 file:mr-3"
                  />
                  {proofFile && (
                    <p className="text-xs text-primary">Selected: {proofFile.name}</p>
                  )}
                </div>
                <div className="rounded-xl border border-white/10 bg-black/20 p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm text-white">Wallet</p>
                      <p className="text-xs text-muted-foreground">{walletLabel}</p>
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => void connect()}
                      disabled={isConnecting}
                      className="shrink-0"
                    >
                      {isConnecting ? "Connecting..." : address ? "Reconnect Wallet" : "Connect Wallet"}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Connecting your wallet only stores your address during registration. No placeholder blockchain transaction is sent.
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Business accounts require document review and admin approval before dashboard access.
                </p>
              </>
            )}

            <Button
              type="submit"
              disabled={isPending || isConnecting}
              className="w-full h-12 mt-4 text-lg rounded-xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground shadow-[0_0_20px_rgba(0,212,170,0.3)] border-none"
            >
              {isPending ? "Creating Account..." : "Create Account"}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            Already registered?{" "}
            <Link href="/login" className="text-primary hover:text-primary/80 font-semibold transition-colors">
              Sign In
            </Link>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
