import { Link } from "wouter";
import { useUser, useLogout } from "@/hooks/use-auth";
import { useMetaMask } from "@/hooks/use-metamask";
import { Button } from "@/components/ui/button";
import { ShieldCheck, LogOut, Wallet, LayoutDashboard } from "lucide-react";

export function NavBar() {
  const { data: user, isLoading } = useUser();
  const logout = useLogout();
  const { address, isConnecting, connect } = useMetaMask();

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-white/10 bg-[#0a0e2e]/60 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <ShieldCheck className="w-8 h-8 text-primary group-hover:text-primary/80 transition-colors" />
          <span className="font-display font-bold text-2xl tracking-tight text-white">
            Pharma<span className="text-primary">Chain</span>
          </span>
        </Link>

        <div className="flex items-center gap-4">
          {!isLoading && user ? (
            <>
              {address ? (
                <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10">
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  <span className="text-sm font-mono text-primary/90">
                    {address.slice(0, 6)}...{address.slice(-4)}
                  </span>
                </div>
              ) : (
                <Button 
                  onClick={connect} 
                  disabled={isConnecting}
                  variant="outline" 
                  className="hidden md:flex bg-white/5 border-primary/30 hover:bg-primary/20 hover:text-white"
                >
                  <Wallet className="w-4 h-4 mr-2" />
                  {isConnecting ? "Connecting..." : "Connect Wallet"}
                </Button>
              )}

              <Link href={user.role === 'customer' ? "/portal" : "/dashboard"}>
                <Button variant="ghost" className="text-white hover:bg-white/10 hover:text-white">
                  <LayoutDashboard className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Dashboard</span>
                </Button>
              </Link>
              <Button onClick={logout} variant="ghost" size="icon" className="text-red-400 hover:text-red-300 hover:bg-red-400/10">
                <LogOut className="w-5 h-5" />
              </Button>
            </>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" className="text-white hover:bg-white/10 hover:text-white">Login</Button>
              </Link>
              <Link href="/register">
                <Button className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/25">
                  Get Started
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
