import { useState } from "react";
import { Link } from "wouter";
import { useLogin } from "@/hooks/use-auth";
import { GlassCard } from "@/components/GlassCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ShieldCheck } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { mutate: login, isPending } = useLogin();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login({ email, password });
  };

  return (
    <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center p-4">
      <div className="w-full max-w-md fade-in-up">
        <GlassCard glow="violet" className="p-8">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mb-4 border border-white/20">
              <ShieldCheck className="w-8 h-8 text-accent" />
            </div>
            <h2 className="text-3xl font-display font-bold text-white">Welcome Back</h2>
            <p className="text-muted-foreground mt-2">Access your PharmaChain dashboard</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-white/80">Email Address</Label>
              <Input 
                id="email" 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-black/20 border-white/10 text-white focus:border-accent focus:ring-accent/20 h-12 rounded-xl" 
                placeholder="name@organization.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-white/80">Password</Label>
              <Input 
                id="password" 
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-black/20 border-white/10 text-white focus:border-accent focus:ring-accent/20 h-12 rounded-xl" 
                placeholder="••••••••"
              />
            </div>
            <Button 
              type="submit" 
              disabled={isPending}
              className="w-full h-12 text-lg rounded-xl bg-gradient-to-r from-accent to-accent/80 hover:from-accent/90 hover:to-accent/70 text-white shadow-[0_0_20px_rgba(124,58,237,0.3)] border-none"
            >
              {isPending ? "Authenticating..." : "Sign In"}
            </Button>
          </form>

          <div className="mt-8 text-center text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link href="/register" className="text-accent hover:text-accent/80 font-semibold transition-colors">
              Request Access
            </Link>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
