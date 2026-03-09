import { useMemo, useState } from "react";
import { Link } from "wouter";
import { useRegister } from "@/hooks/use-auth";
import { useMetaMask, type ChainTxResult } from "@/hooks/use-metamask";
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
  proofUrl: string;
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
    proofUrl: "",
  });
  const [documentMeta, setDocumentMeta] = useState<{
    fileName: string;
    mimeType: string;
    dataUrl: string;
  } | null>(null);
  const [uploadingDocument, setUploadingDocument] = useState(false);

  const { mutateAsync: register, isPending } = useRegister();
  const { connect, address, sendTransaction, isConnecting } = useMetaMask();
  const { toast } = useToast();

  const isBusinessRole = formData.role !== "customer";
  const profileRefLabel = useMemo(() => {
    if (formData.role === "pharmacy") return "Pharmacy Permit Number";
    return "Business License Number";
  }, [formData.role]);

  const handleProofFileChange = async (file: File | null) => {
    if (!file) {
      setDocumentMeta(null);
      return;
    }

    setUploadingDocument(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result ?? ""));
        reader.onerror = () => reject(new Error("Unable to read file"));
        reader.readAsDataURL(file);
      });

      setDocumentMeta({
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        dataUrl,
      });
    } finally {
      setUploadingDocument(false);
    }
  };

  const buildProfilePayload = (role: RegisterRequest["role"], org: string, refNo: string) => {
    if (role === "manufacturer") {
      return {
        facilityName: org,
        licenseNumber: refNo,
      };
    }
    if (role === "distributor" || role === "material_distributor") {
      return {
        distributionCenterName: org,
        licenseNumber: refNo,
      };
    }
    if (role === "pharmacy") {
      return {
        pharmacyName: org,
        permitNumber: refNo,
      };
    }
    return undefined;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      let registrationTx: ChainTxResult | undefined;
      let walletAddress: string | undefined;

      if (isBusinessRole) {
        if (!documentMeta) {
          toast({
            title: "Document Required",
            description: "Please upload an approval document for business registration.",
            variant: "destructive",
          });
          return;
        }

        const connected = address ?? (await connect());
        if (!connected) {
          throw new Error("Wallet connection is required for business registration");
        }
        walletAddress = connected;
        registrationTx = await sendTransaction(`Register ${formData.role}`);
      }

      const payload: RegisterRequest = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        phone: formData.phone,
        organization: formData.organization,
        role: formData.role,
        proofUrl: documentMeta?.dataUrl || formData.proofUrl || undefined,
        walletAddress,
        registrationTx: registrationTx
          ? {
              txHash: registrationTx.txHash,
              chainId: registrationTx.chainId,
              blockNumber: registrationTx.blockNumber,
              contractAddress: registrationTx.contractAddress,
            }
          : undefined,
        profile: buildProfilePayload(formData.role, formData.organization, formData.profileRefNumber),
        approvalDocument: documentMeta
          ? {
              fileName: documentMeta.fileName,
              mimeType: documentMeta.mimeType,
              dataUrl: documentMeta.dataUrl,
            }
          : undefined,
      };

      await register(payload);
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
              <Select value={formData.role} onValueChange={(v) => setFormData({ ...formData, role: v as RegisterRequest["role"] })}>
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
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => void handleProofFileChange(e.target.files?.[0] ?? null)}
                    className="bg-black/20 border-white/10 text-white focus:border-primary h-11 file:text-white file:bg-white/10 file:border-0 file:mr-3"
                  />
                  {documentMeta && (
                    <p className="text-xs text-primary">Selected: {documentMeta.fileName}</p>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Business accounts require wallet signature and admin approval before dashboard access.
                </p>
              </>
            )}

            <Button
              type="submit"
              disabled={isPending || uploadingDocument || isConnecting}
              className="w-full h-12 mt-4 text-lg rounded-xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground shadow-[0_0_20px_rgba(0,212,170,0.3)] border-none"
            >
              {isPending
                ? "Creating Account..."
                : uploadingDocument
                  ? "Preparing Document..."
                  : isBusinessRole
                    ? "Register & Sign On-Chain"
                    : "Create Account"}
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
