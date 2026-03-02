import { useState } from "react";
import { Link } from "wouter";
import { useRegister } from "@/hooks/use-auth";
import { GlassCard } from "@/components/GlassCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Activity } from "lucide-react";
import type { InsertUser } from "@shared/routes";

export default function Register() {
  const [formData, setFormData] = useState<InsertUser>({
    name: "",
    email: "",
    password: "",
    phone: "",
    organization: "",
    role: "customer",
    proofUrl: ""
  });
  
  const { mutate: register, isPending } = useRegister();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    register(formData);
  };

  const isBusinessRole = formData.role !== 'customer';

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
                <Input id="name" required
                  value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                  className="bg-black/20 border-white/10 text-white focus:border-primary h-11" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-white/80">Phone</Label>
                <Input id="phone" required
                  value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})}
                  className="bg-black/20 border-white/10 text-white focus:border-primary h-11" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-white/80">Email</Label>
              <Input id="email" type="email" required
                value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})}
                className="bg-black/20 border-white/10 text-white focus:border-primary h-11" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-white/80">Password</Label>
              <Input id="password" type="password" required
                value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})}
                className="bg-black/20 border-white/10 text-white focus:border-primary h-11" />
            </div>

            <div className="space-y-2">
              <Label className="text-white/80">Account Type</Label>
              <Select value={formData.role} onValueChange={(v) => setFormData({...formData, role: v})}>
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
                  <Input id="org" required
                    value={formData.organization} onChange={e => setFormData({...formData, organization: e.target.value})}
                    className="bg-black/20 border-white/10 text-white focus:border-primary h-11" />
                </div>
                <div className="space-y-2 fade-in-up delay-100">
                  <Label htmlFor="proof" className="text-white/80">Business License URL (Proof)</Label>
                  <Input id="proof" required
                    value={formData.proofUrl || ""} onChange={e => setFormData({...formData, proofUrl: e.target.value})}
                    className="bg-black/20 border-white/10 text-white focus:border-primary h-11" 
                    placeholder="https://..." />
                </div>
              </>
            )}

            <Button 
              type="submit" 
              disabled={isPending}
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
