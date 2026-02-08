import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { 
  ClipboardCheck, 
  Ticket, 
  Files, 
  ArrowUpRight, 
  ExternalLink,
  ShieldAlert,
  Calendar
} from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import { AuditScoreGauge } from '@/components/AuditScoreGauge'
import { LocksGrid } from '@/components/LocksGrid'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'

import { ScanningHud } from '@/components/ScanningHud'

export function Dashboard() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const res = await api.getDashboard()
        // Artificial delay to show the HUD if it's the first load
        setTimeout(() => {
          setData(res)
          setLoading(false)
        }, 5500)
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error)
        toast.error('Could not connect to the Gateway API')
        setLoading(false)
      }
    }
    fetchDashboard()
  }, [])

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-10">
        <ScanningHud onComplete={() => {}} />
      </div>
    )
  }

  const overallStatus = data?.overall_status || 'PROCESSING'
  const stats = [
    { label: 'System Audits', value: data?.audit_count || 0, icon: ClipboardCheck, color: 'text-blue-500', trend: 'up' },
    { label: 'Open Tickets', value: data?.ticket_count || 0, icon: Ticket, color: 'text-orange-500', trend: 'down' },
    { label: 'Artifacts', value: data?.artifact_count || 0, icon: Files, color: 'text-emerald-500', trend: 'neutral' },
  ]

  return (
    <div className="space-y-12">
      {/* Top Banner for LOCKED status */}
      {overallStatus === 'LOCKED' && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative group p-[1px] rounded-2xl overflow-hidden shadow-[0_0_20px_rgba(239,68,68,0.15)]"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-destructive/40 via-destructive/5 to-destructive/40 animate-pulse" />
          <div className="relative p-6 bg-slate-950/80 backdrop-blur-xl flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-5">
               <div className="p-4 rounded-2xl bg-destructive/10 text-destructive border border-destructive/20 shadow-[inset_0_0_15px_rgba(239,68,68,0.2)]">
                  <ShieldAlert size={28} />
               </div>
               <div className="space-y-1">
                  <h4 className="text-xl font-black text-white tracking-tight uppercase tracking-widest">Compliance Critical Lock</h4>
                  <p className="text-sm text-slate-400 max-w-lg">Your account has reached a critical failure threshold. Revenue-generating pathways are restricted until remediation is verified.</p>
               </div>
            </div>
            <Button variant="destructive" size="lg" className="shrink-0 font-black tracking-[0.15em] uppercase text-xs h-12 px-8 rounded-xl shadow-[0_10px_30px_rgba(239,68,68,0.2)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-300">
              Book Remediation Sprint
            </Button>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Health Score Card */}
        <div className="lg:col-span-1 flex flex-col gap-8">
          <div className="relative group">
            <div className="absolute -inset-[1px] bg-gradient-to-b from-primary/30 to-transparent rounded-[21px] blur-sm opacity-50 group-hover:opacity-100 transition-opacity duration-500" />
            <AuditScoreGauge score={data?.health_score || 0} className="relative rounded-[20px] bg-slate-900/40 backdrop-blur-3xl border-white/[0.05] p-10 h-full flex items-center justify-center" />
          </div>
          
          <div className="flex flex-col items-center gap-4">
             <StatusPill status={overallStatus} />
             <div className="text-center space-y-1">
                <p className="text-[10px] text-slate-500 uppercase font-black tracking-[0.2em]">Data Integrity Verified</p>
                <p className="text-xs text-slate-400">
                  Calculated from {data?.audit_count || 0} production endpoints
                </p>
             </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="lg:col-span-2 space-y-10">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {stats.map((stat, i) => (
              <Card key={i} className="glass border-white/5 hover:border-primary/20 hover:bg-white/[0.05] transition-all duration-500 group relative overflow-hidden rounded-2xl">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <CardContent className="p-8">
                  <div className="flex items-center justify-between mb-6">
                    <div className={cn("p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05] group-hover:bg-primary/10 group-hover:border-primary/20 transition-all duration-500", stat.color)}>
                      <stat.icon size={20} />
                    </div>
                    <ArrowUpRight size={16} className="text-slate-600 group-hover:text-primary transition-all duration-500 transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-4xl font-black tracking-tighter text-white">{stat.value}</h3>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 group-hover:text-slate-400 transition-colors">{stat.label}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Latest Audit Card */}
          {data?.latest_audit && (
             <Card className="glass-morphism border-white/5 overflow-hidden rounded-3xl relative">
                <div className="absolute top-0 right-0 p-10 opacity-[0.03] pointer-events-none group-hover:opacity-10 group-hover:scale-110 transition-all duration-700">
                   <ClipboardCheck size={180} />
                </div>
                <CardHeader className="flex flex-row items-center justify-between p-10 pb-4">
                   <div className="space-y-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-2 h-2 rounded-full bg-primary" />
                        <CardTitle className="text-xl font-bold tracking-tight text-white">Latest Intelligence Scan</CardTitle>
                      </div>
                      <CardDescription className="text-slate-500 font-medium">Conducted on {data.latest_audit.conducted_at || 'Jan 24, 2026'}</CardDescription>
                   </div>
                   <div className="flex flex-col items-end gap-2">
                     <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 font-black px-4 py-1 rounded-lg">
                        {data.latest_audit.score}% MATCH
                     </Badge>
                     <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">Compliance Score</p>
                   </div>
                </CardHeader>
                <CardContent className="p-10 pt-4">
                   <div className="flex flex-col md:flex-row md:items-center justify-between gap-10">
                      <div className="space-y-4 max-w-xl">
                         <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-slate-500 bg-white/[0.02] border border-white/[0.05] px-3 py-1.5 rounded-lg w-fit">
                            <Calendar size={12} className="text-primary" />
                            <span>REPORT_ID:</span>
                            <span className="text-primary font-mono">{data.latest_audit.id}</span>
                         </div>
                         <p className="text-slate-400 leading-relaxed">
                            {data.latest_audit.summary || 'Summary of the most recent compliance evaluation and risk assessment results.'}
                         </p>
                      </div>
                      <Button asChild className="h-14 px-10 gap-3 bg-primary text-primary-foreground hover:glow-blue transition-all duration-300 rounded-xl shadow-[0_10px_20px_rgba(59,130,246,0.15)] group shrink-0">
                        <Link to={`/audits/${data.latest_audit.id}`}>
                           <span className="text-sm font-black uppercase tracking-widest">Access Report</span>
                           <ArrowUpRight size={18} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                        </Link>
                      </Button>
                   </div>
                </CardContent>
             </Card>
          )}
        </div>
      </div>

      {/* Critical Locks Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
           <h2 className="text-xl font-bold flex items-center gap-2">
              <ShieldAlert size={20} className="text-primary" />
              Critical Compliance Locks
           </h2>
        </div>
        <LocksGrid locks={data?.locks || []} />
      </section>
    </div>
  )
}

function StatusPill({ status }: { status: string }) {
  const configs: Record<string, any> = {
    READY: { label: 'READY', className: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
    LOCKED: { label: 'LOCKED', className: 'bg-destructive/10 text-destructive border-destructive/20' },
    PROCESSING: { label: 'PROCESSING', className: 'bg-primary/10 text-primary border-primary/20' },
  }
  
  const config = configs[status] || configs.PROCESSING
  
  return (
    <div className={cn(
      "px-6 py-2 rounded-xl text-[10px] font-black tracking-[0.3em] uppercase border backdrop-blur-md shadow-lg flex items-center gap-3",
      config.className
    )}>
      <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse shadow-[0_0_8px_currentColor]", config.className.split(' ')[1])} />
      {config.label}
    </div>
  )
}
