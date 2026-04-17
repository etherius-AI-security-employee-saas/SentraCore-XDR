import { motion } from "framer-motion";
import type { PropsWithChildren, ReactNode } from "react";

interface PremiumCardProps extends PropsWithChildren {
  title: string;
  kicker?: string;
  action?: ReactNode;
  className?: string;
}

export function PremiumCard({ title, kicker, action, className = "", children }: PremiumCardProps) {
  return (
    <motion.section
      layout
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className={`rounded-3xl border border-white/10 bg-white/5 p-5 shadow-glass backdrop-blur-xl ${className}`}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.35em] text-ink/45">{kicker}</p>
          <h3 className="mt-1 text-lg font-semibold text-white">{title}</h3>
        </div>
        {action}
      </div>
      {children}
    </motion.section>
  );
}
