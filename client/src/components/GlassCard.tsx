import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  glow?: 'teal' | 'violet' | 'none';
}

export function GlassCard({ children, className, glow = 'none' }: GlassCardProps) {
  return (
    <div className={cn(
      "glass-panel rounded-2xl p-6 md:p-8 transition-all duration-300",
      glow === 'teal' && "hover:shadow-[0_0_30px_rgba(0,212,170,0.15)] border-teal-500/20",
      glow === 'violet' && "hover:shadow-[0_0_30px_rgba(124,58,237,0.15)] border-violet-500/20",
      className
    )}>
      {children}
    </div>
  );
}
