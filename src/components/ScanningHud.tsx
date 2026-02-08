import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Terminal, Activity, ShieldCheck, Database, Lock, Search } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ScanningHudProps {
  onComplete?: () => void
  className?: string
}

export function ScanningHud({ onComplete, className }: ScanningHudProps) {
  const [lines, setLines] = useState<string[]>([])
  const [progress, setProgress] = useState(0)
  
  const scanSequences = [
    { text: "Initializing Sentinel Logic Core v4.2...", delay: 500, icon: Activity },
    { text: "Mapping Infrastructure Topology...", delay: 1200, icon: Database },
    { text: "Checking A2P 10DLC Compliance Modules...", delay: 1800, icon: Lock },
    { text: "Validating HIPAA Safe-Harbor protocols...", delay: 2400, icon: ShieldCheck },
    { text: "Scanning for carrier narrative blocks...", delay: 3000, icon: Search },
    { text: "Heuristic vulnerability analysis in progress...", delay: 4000, icon: Activity },
    { text: "Finalizing risk assessment payload...", delay: 5000, icon: ShieldCheck },
  ]

  useEffect(() => {
    let timeoutIds: number[] = []
    
    scanSequences.forEach((seq, index) => {
      const id = window.setTimeout(() => {
        setLines(prev => [...prev, seq.text])
        setProgress(((index + 1) / scanSequences.length) * 100)
        
        if (index === scanSequences.length - 1) {
          window.setTimeout(() => {
            onComplete?.()
          }, 1000)
        }
      }, seq.delay)
      timeoutIds.push(id)
    })

    return () => timeoutIds.forEach(id => window.clearTimeout(id))
  }, [])

  return (
    <div className={cn("p-8 rounded-3xl glass bg-slate-900/60 border-white/10 space-y-8 overflow-hidden relative", className)}>
      <div className="absolute top-0 left-0 w-full h-1 bg-white/5">
        <motion.div 
          className="h-full bg-primary shadow-[0_0_10px_#3b82f6]"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20">
            <Terminal size={20} />
          </div>
          <div className="space-y-0.5">
            <h3 className="font-bold text-white tracking-tight">Active Scan Protocol</h3>
            <p className="text-[10px] uppercase font-black tracking-widest text-slate-500">Sentinel HUD v4.2</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-widest text-primary">Live Data Stream</span>
        </div>
      </div>

      <div className="terminal-log min-h-[220px] flex flex-col gap-2 relative">
        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
           <Activity size={120} />
        </div>
        <AnimatePresence mode="popLayout">
          {lines.map((line, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-start gap-3 py-0.5"
            >
              <span className="text-primary/40 font-bold">[{new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}]</span>
              <span className="text-primary/80 font-mono text-[11px] leading-relaxed">
                <span className="text-primary mr-2">&gt;</span>
                {line}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
        <div className="terminal-cursor text-primary/60 mt-1" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-white/5">
        <HudStat label="CPU Load" value="42.8%" />
        <HudStat label="Net Throughput" value="1.2 Gbps" />
        <HudStat label="Heuristics" value="Active" color="text-emerald-500" />
        <HudStat label="Logic Ops" value="Secure" color="text-primary" />
      </div>
    </div>
  )
}

function HudStat({ label, value, color = "text-white" }: { label: string, value: string, color?: string }) {
  return (
    <div className="space-y-1">
      <p className="text-[9px] uppercase font-black tracking-[0.15em] text-slate-500">{label}</p>
      <p className={cn("text-xs font-bold", color)}>{value}</p>
    </div>
  )
}
