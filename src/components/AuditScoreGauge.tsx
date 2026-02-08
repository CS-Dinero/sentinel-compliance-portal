import React from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface AuditScoreGaugeProps {
  score: number
  className?: string
}

export function AuditScoreGauge({ 
  score, 
  className 
}: AuditScoreGaugeProps) {
  const getColor = (s: number) => {
    if (s > 75) return "#10b981" // Emerald-500
    if (s > 40) return "#f59e0b" // Amber-500
    return "#ef4444" // Red-500
  }

  return (
    <div className={cn("relative flex items-center justify-center", className)}>
      <div className="relative w-56 h-56">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          {/* Background Track with inner glow effect */}
          <circle
            className="stroke-slate-800/40"
            strokeWidth="8"
            fill="transparent"
            r="42"
            cx="50"
            cy="50"
          />
          {/* Progress Path */}
          <motion.circle
            className="stroke-current transition-colors duration-1000"
            strokeWidth="8"
            strokeDasharray="263.89"
            initial={{ strokeDashoffset: 263.89 }}
            animate={{ strokeDashoffset: 263.89 - (263.89 * score) / 100 }}
            style={{ color: getColor(score), filter: `drop-shadow(0 0 8px ${getColor(score)}44)` }}
            strokeLinecap="round"
            fill="transparent"
            r="42"
            cx="50"
            cy="50"
            transition={{ duration: 2, ease: [0.4, 0, 0.2, 1] }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="text-6xl font-black tracking-tighter text-white"
          >
            {score}
          </motion.span>
          <span className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500 mt-1">Health Metric</span>
        </div>
      </div>
    </div>
  )
}
