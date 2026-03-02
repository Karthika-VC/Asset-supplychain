import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Activity, Link as LinkIcon, Database } from "lucide-react";
import { GlassCard } from "@/components/GlassCard";
import { motion } from "framer-motion";

export default function Home() {
  return (
    <div className="relative min-h-[calc(100vh-5rem)] flex flex-col items-center pt-20 pb-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="text-center max-w-4xl mx-auto mb-24 fade-in-up">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <span className="px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-sm font-medium text-primary inline-block mb-6 shadow-[0_0_20px_rgba(0,212,170,0.2)]">
              Next-Gen Pharmacy Supply Chain
            </span>
          </motion.div>
          <h1 className="text-5xl md:text-7xl font-display font-bold text-white mb-8 leading-tight">
            Trust the process.<br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
              Verify the source.
            </span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
            Immutable, blockchain-backed tracking for pharmaceutical supply chains. 
            From raw materials to the patient's hands, every step is verified.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/register">
              <Button size="lg" className="w-full sm:w-auto h-14 px-8 text-lg bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground shadow-[0_0_30px_rgba(0,212,170,0.4)] border-none rounded-xl">
                Join the Network
              </Button>
            </Link>
            <Link href="/portal">
              <Button size="lg" variant="outline" className="w-full sm:w-auto h-14 px-8 text-lg bg-white/5 border-white/20 hover:bg-white/10 text-white rounded-xl">
                Verify a Product
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 fade-in-up delay-200">
          <GlassCard glow="teal">
            <div className="w-14 h-14 rounded-2xl bg-teal-500/20 flex items-center justify-center mb-6 border border-teal-500/30">
              <Database className="w-7 h-7 text-primary" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Immutable Ledger</h3>
            <p className="text-muted-foreground">Every transaction, material transfer, and status update is cryptographically secured on the blockchain.</p>
          </GlassCard>

          <GlassCard glow="violet">
            <div className="w-14 h-14 rounded-2xl bg-violet-500/20 flex items-center justify-center mb-6 border border-violet-500/30">
              <LinkIcon className="w-7 h-7 text-accent" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">End-to-End Tracking</h3>
            <p className="text-muted-foreground">Connect raw material providers, manufacturers, distributors, and pharmacies in one unified ecosystem.</p>
          </GlassCard>

          <GlassCard glow="teal">
            <div className="w-14 h-14 rounded-2xl bg-teal-500/20 flex items-center justify-center mb-6 border border-teal-500/30">
              <ShieldCheck className="w-7 h-7 text-primary" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Patient Safety</h3>
            <p className="text-muted-foreground">Customers can instantly verify the authenticity and origin of their medication with a simple search.</p>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
