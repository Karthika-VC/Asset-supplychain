import { useMemo, useState } from "react";
import { Link } from "wouter";
import { useRegister } from "@/hooks/use-auth";
import { useMetaMask } from "@/hooks/use-metamask";
import { GlassCard } from "@/components/GlassCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Activity, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { RegisterRequest } from "@shared/routes";

const MAX_PROOF_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_PROOF_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

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
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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

    payload.append("name", formData.name.trim());
    payload.append("email", formData.email.trim());
    payload.append("password", formData.password);
    payload.append("phone", formData.phone.trim());
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

  const validateBusinessRegistration = () => {
    if (!formData.organization.trim()) {
      return "Organization is required for business registration.";
    }

    if (!formData.profileRefNumber.trim()) {
      return formData.role === "pharmacy"
        ? "Pharmacy permit number is required."
        : "Business license number is required.";
    }

    if (!address) {
      return "Please connect your MetaMask wallet before submitting.";
    }

    if (!proofFile) {
      return "Please upload an approval document for business registration.";
    }

    if (!ALLOWED_PROOF_MIME_TYPES.has(proofFile.type)) {
      return "Unsupported file type. Allowed types: PDF, JPG, PNG, WEBP.";
    }

    if (proofFile.size > MAX_PROOF_FILE_SIZE_BYTES) {
      return "Uploaded file exceeds the 10MB limit.";
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSuccessMessage(null);

    try {
      if (isBusinessRole) {
        const validationError = validateBusinessRegistration();
        if (validationError) {
          setFormError(validationError);
          toast({
            title: "Registration Incomplete",
            description: validationError,
            variant: "destructive",
          });
          return;
        }
      }

      const result = await register(buildMultipartPayload());

      if (result.requiresApproval) {
        setSuccessMessage(result.message);
        setProofFile(null);
        setFormData({
          name: "",
          email: "",
          password: "",
          phone: "",
          organization: "",
          role: "customer",
          profileRefNumber: "",
        });
      }
    } catch (err: any) {
      const message = err?.message || "Unable to complete registration.";
      setFormError(message);
      toast({
        title: "Registration Failed",
        description: message,
        variant: "destructive",
      });
    }
  };

  if (successMessage) {
    return (
      <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center p-4 py-12">
        <div className="w-full max-w-lg fade-in-up">
          <GlassCard glow="teal" className="p-8">
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/15">
                <CheckCircle2 className="h-8 w-8 text-emerald-300" />
              </div>
              <h2 className="text-3xl font-display font-bold text-white">Registration Submitted</h2>
              <p className="mt-3 text-base text-muted-foreground">{successMessage}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                You can return to login after an admin approves your account.
              </p>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <Link href="/login">
                <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                  Go to Login
                </Button>
              </Link>
              <Button
                type="button"
                variant="outline"
                onClick={() => setSuccessMessage(null)}
                className="w-full border-white/15 bg-white/5 text-white hover:bg-white/10"
              >
                Register Another Account
              </Button>
            </div>
          </GlassCard>
        </div>
      </div>
    );
  }

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
            {formError ? (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                {formError}
              </div>
            ) : null}

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
                minLength={6}
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

            {isBusinessRole ? (
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
                  <p className="text-xs text-muted-foreground">
                    Accepted: PDF, JPG, PNG, WEBP up to 10MB.
                  </p>
                  {proofFile ? (
                    <p className="text-xs text-primary">Selected: {proofFile.name}</p>
                  ) : null}
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
                    Your wallet address is stored with the registration. No blockchain transaction is sent during signup.
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Business accounts are created successfully in a pending state and require admin approval before login.
                </p>
              </>
            ) : null}

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
