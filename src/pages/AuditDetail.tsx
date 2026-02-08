import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { 
  ArrowLeft, 
  ShieldAlert, 
  Download, 
  Share2, 
  Calendar, 
  CheckCircle2, 
  AlertCircle,
  FileText,
  BarChart3,
  ShieldCheck
} from 'lucide-react'
import { api } from '@/lib/api'
import { FindingsTable } from '@/components/FindingsTable'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

export function AuditDetail() {
  const { id } = useParams<{ id: string }>()
  const [audit, setAudit] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchAudit() {
      if (!id) return
      try {
        const res = await api.getAudit(id)
        setAudit(res)
      } catch (error) {
        console.error('Failed to fetch audit detail:', error)
        toast.error('Audit record not found or access denied')
      } finally {
        setLoading(false)
      }
    }
    fetchAudit()
  }, [id])

  if (loading) return <AuditDetailSkeleton />
  if (!audit) return <div className="text-center py-20">Audit not found</div>

  const isLocked = audit.status === 'LOCKED'

  return (
    <div className="space-y-10">
      {/* Back Link */}
      <Link to="/audits" className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-primary transition-colors group">
        <ArrowLeft size={14} className="transition-transform group-hover:-translate-x-1" />
        Back to System Audits
      </Link>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-4">
             <Badge variant="outline" className="bg-primary/5 border-primary/20 text-primary font-mono px-3 py-1">
                SYSTEM_AUDIT_LOG
             </Badge>
             <span className="text-slate-600">/</span>
             <span className="font-mono text-sm text-slate-400">{id}</span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-white">Compliance Evaluation</h1>
          <div className="flex flex-wrap items-center gap-6 text-sm text-slate-500">
            <div className="flex items-center gap-2">
               <Calendar size={14} className="text-primary/60" />
               <span className="font-medium">Timestamp:</span>
               <span>{audit.conducted_at || 'Jan 24, 2026 14:32:01'}</span>
            </div>
            <div className="flex items-center gap-2">
               <ShieldCheck size={14} className="text-emerald-500/60" />
               <span className="font-medium">Target Entity:</span>
               <span>{audit.entity_name || 'Sentinel Production'}</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <Button variant="outline" className="h-12 px-6 gap-3 border-white/10 bg-white/5 hover:bg-white/10 transition-all duration-300 rounded-xl group">
            <Download size={16} className="text-slate-400 group-hover:text-primary" />
            <span className="text-sm font-bold uppercase tracking-wider">Export Board-Ready Report</span>
          </Button>
          <Button className="h-12 px-8 gap-3 bg-primary text-primary-foreground hover:glow-blue transition-all duration-300 rounded-xl shadow-[0_0_20px_rgba(59,130,246,0.2)]">
            <span className="text-sm font-bold uppercase tracking-widest">Signal Stakeholders</span>
            <Share2 size={16} />
          </Button>
        </div>
      </div>

      {/* Sentinel Concierge Alert */}
      {isLocked && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative group"
        >
          <div className="absolute -inset-[1px] bg-gradient-to-r from-destructive/40 via-destructive/10 to-destructive/40 rounded-[21px] blur-sm opacity-50" />
          <Card className="glass-morphism border-destructive/20 overflow-hidden relative rounded-[20px]">
            <div className="absolute top-0 left-0 w-1 h-full bg-destructive" />
            <CardContent className="p-8">
              <div className="flex flex-col lg:flex-row gap-10">
                <div className="flex-1 space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="p-4 rounded-2xl bg-destructive/10 text-destructive border border-destructive/20 shadow-[0_0_15px_rgba(239,68,68,0.1)]">
                       <ShieldAlert size={32} />
                    </div>
                    <div className="space-y-1">
                       <h3 className="text-2xl font-bold text-white tracking-tight">🛡️ Priority System Alert: Action Required to Restore Throughput</h3>
                       <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-destructive">
                          <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                          Carrier Narrative Blocked
                       </div>
                    </div>
                  </div>
                  
                  <p className="text-slate-400 leading-relaxed text-lg">
                    Your current scan has identified <span className="text-white font-bold underline underline-offset-4 decoration-destructive/50">{audit.findings?.filter((f: any) => f.severity === 'CRITICAL').length || 3} Critical Blocks</span> that are preventing 10DLC carrier registration and HIPAA safe-harbor compliance. These are not just technical warnings; they are operational "locks" that will result in immediate message filtering or account suspension.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-1">
                      <p className="text-[10px] uppercase font-black tracking-widest text-slate-500">Assigned Compliance Lead</p>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        <p className="text-sm font-bold text-white">Eng. Sarah Chen (SC-942)</p>
                      </div>
                    </div>
                    <div className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-1">
                      <p className="text-[10px] uppercase font-black tracking-widest text-slate-500">Carrier Narrative Status</p>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-amber-500" />
                        <p className="text-sm font-bold text-amber-500/90">Awaiting Remediation Payload</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="lg:w-[320px] shrink-0 flex flex-col gap-4">
                   <div className="p-6 rounded-2xl bg-destructive/5 border border-destructive/20 flex flex-col items-center text-center space-y-4">
                      <div className="space-y-1">
                         <p className="text-4xl font-black text-white">85%</p>
                         <p className="text-[10px] uppercase font-black tracking-widest text-destructive">Est. Filtering Risk</p>
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Trigger a **Sentinel Remediation Sprint** to apply verified patches and restore compliance throughput in &lt; 48 hours.
                      </p>
                   </div>
                   <Button variant="destructive" className="h-14 font-black text-sm uppercase tracking-[0.15em] rounded-xl shadow-[0_10px_30px_rgba(239,68,68,0.2)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-300">
                      Apply My $197 Credit & Start Sprint
                   </Button>
                   <p className="text-[10px] text-center text-slate-600 font-medium">
                     *Includes manual verification scan and "Clean Receipt" for carrier.
                   </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <ScoreCard label="Health Score" value={`${audit.score}%`} icon={ShieldCheck} trend="neutral" className="border-emerald-500/10" />
        <ScoreCard label="Revenue Risks" value={audit.findings?.filter((f: any) => f.severity === 'CRITICAL').length || 0} icon={AlertCircle} color="text-destructive" className="border-destructive/10" />
        <ScoreCard label="Efficiency Risks" value={audit.findings?.filter((f: any) => f.severity === 'HIGH').length || 0} icon={ShieldAlert} color="text-amber-500" className="border-amber-500/10" />
        <ScoreCard label="Audit Status" value={audit.status} icon={CheckCircle2} color={isLocked ? "text-destructive" : "text-primary"} />
      </div>

      <Tabs defaultValue="findings" className="space-y-8">
        <TabsList className="bg-white/5 border-white/5 p-1 h-12">
          <TabsTrigger value="summary" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary h-10 px-6 gap-2">
             <FileText size={16} />
             Executive Summary
          </TabsTrigger>
          <TabsTrigger value="findings" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary h-10 px-6 gap-2">
             <BarChart3 size={16} />
             Technical Findings
          </TabsTrigger>
          <TabsTrigger value="remediation" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary h-10 px-6 gap-2">
             <ShieldAlert size={16} />
             Remediation Overview
          </TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="space-y-6 outline-none">
          <Card className="glass border-white/5">
            <CardHeader>
               <CardTitle>Overview</CardTitle>
               <CardDescription>High-level summary of audit objectives and results.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
               <p className="text-muted-foreground leading-relaxed">
                  {audit.summary || 'This comprehensive audit evaluated the security posture and regulatory compliance of the specified entity. The assessment covered infrastructure security, data privacy controls, and operational process adherence.'}
               </p>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                  <div className="p-4 rounded-lg bg-white/[0.02] border border-white/5">
                     <h4 className="font-semibold mb-2">Key Strengths</h4>
                     <ul className="text-sm text-muted-foreground space-y-2">
                        <li className="flex items-center gap-2">
                           <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                           Robust encryption for data at rest
                        </li>
                        <li className="flex items-center gap-2">
                           <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                           Strong identity and access management
                        </li>
                     </ul>
                  </div>
                  <div className="p-4 rounded-lg bg-white/[0.02] border border-white/5">
                     <h4 className="font-semibold mb-2">Primary Risks</h4>
                     <ul className="text-sm text-muted-foreground space-y-2">
                        <li className="flex items-center gap-2">
                           <div className="w-1.5 h-1.5 rounded-full bg-destructive" />
                           Outdated dependency versions
                        </li>
                        <li className="flex items-center gap-2">
                           <div className="w-1.5 h-1.5 rounded-full bg-destructive" />
                           Incomplete disaster recovery testing
                        </li>
                     </ul>
                  </div>
               </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="findings" className="space-y-6 outline-none">
           <FindingsTable findings={audit.findings || []} />
        </TabsContent>

        <TabsContent value="remediation" className="space-y-6 outline-none">
           <Card className="glass border-white/5">
              <CardHeader>
                 <CardTitle>Remediation Plan</CardTitle>
                 <CardDescription>Step-by-step actions required to achieve full compliance.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                 {(audit.remediation_steps || [
                    { step: 'Update core application dependencies to patched versions.', status: 'PENDING' },
                    { step: 'Review and rotate all production environment secrets.', status: 'IN_PROGRESS' },
                    { step: 'Conduct full disaster recovery drill with documented results.', status: 'PENDING' }
                 ]).map((item: any, i: number) => (
                    <div key={i} className="flex items-start gap-4 p-4 rounded-lg bg-white/[0.02] border border-white/5">
                       <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold shrink-0">
                          {i + 1}
                       </div>
                       <div className="flex-1">
                          <p className="text-sm font-medium">{item.step}</p>
                       </div>
                       <Badge variant="secondary" className="bg-muted/50 text-[10px] uppercase">
                          {item.status}
                       </Badge>
                    </div>
                 ))}
              </CardContent>
           </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function ScoreCard({ label, value, icon: Icon, color = "text-foreground", trend }: any) {
  return (
    <Card className="glass border-white/5 overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
           <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
           <Icon size={16} className={color} />
        </div>
        <div className="flex items-baseline gap-2">
           <h3 className={cn("text-2xl font-bold tracking-tight", color)}>{value}</h3>
        </div>
      </CardContent>
    </Card>
  )
}

function AuditDetailSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
       <Skeleton className="h-4 w-32" />
       <div className="flex items-end justify-between">
          <div className="space-y-2">
             <Skeleton className="h-10 w-64" />
             <Skeleton className="h-4 w-48" />
          </div>
          <div className="flex gap-2">
             <Skeleton className="h-10 w-24" />
             <Skeleton className="h-10 w-32" />
          </div>
       </div>
       <div className="grid grid-cols-4 gap-4">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
       </div>
       <Skeleton className="h-12 w-full max-w-md rounded-lg" />
       <Skeleton className="h-[400px] w-full rounded-xl" />
    </div>
  )
}
