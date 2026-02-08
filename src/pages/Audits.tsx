import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { 
  Search, 
  Calendar, 
  ChevronRight, 
  AlertCircle, 
  CheckCircle2, 
  Loader2,
  Filter,
  Zap
} from 'lucide-react'
import { api } from '@/lib/api'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Empty } from '@/components/ui/empty'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { ScanningHud } from '@/components/ScanningHud'

export function Audits() {
  const [audits, setAudits] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isScanning, setIsScanning] = useState(false)

  useEffect(() => {
    async function fetchAudits() {
      try {
        const res = await api.getAudits()
        setAudits(res.items || res)
      } catch (error) {
        console.error('Failed to fetch audits:', error)
        toast.error('Failed to load audits from Gateway')
      } finally {
        setLoading(false)
      }
    }
    fetchAudits()
  }, [])

  const handleRequestAudit = () => {
    setIsScanning(true)
  }

  const handleScanComplete = () => {
    setIsScanning(false)
    toast.success('System Audit Complete. New report generated.')
    // Refresh audits or just simulate new one
  }

  const filteredAudits = audits.filter(audit => 
    audit.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    audit.status?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) return <AuditsSkeleton />

  return (
    <div className="space-y-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
         <div className="space-y-1">
            <h1 className="text-3xl font-black tracking-tight text-white uppercase tracking-widest">Compliance Audits</h1>
            <p className="text-sm text-slate-500 font-medium tracking-wide">Historical assessment logs and automated remediation tracking.</p>
         </div>
         <div className="flex items-center gap-3">
            <Button variant="outline" size="lg" className="h-12 px-6 gap-3 border-white/5 bg-white/[0.03] hover:bg-white/5 rounded-xl transition-all duration-300">
               <Filter size={16} className="text-slate-400" />
               <span className="text-xs font-bold uppercase tracking-widest">Configure View</span>
            </Button>
            <Button size="lg" className="h-12 px-8 gap-3 bg-primary text-primary-foreground hover:glow-blue rounded-xl transition-all duration-300 shadow-[0_10px_20px_rgba(59,130,246,0.1)]" onClick={handleRequestAudit}>
               <Zap size={16} />
               <span className="text-xs font-black uppercase tracking-widest">Trigger Intelligence Scan</span>
            </Button>
         </div>
      </div>

      <Dialog open={isScanning} onOpenChange={setIsScanning}>
        <DialogContent className="max-w-3xl bg-transparent border-none p-0 shadow-none outline-none">
          <ScanningHud onComplete={handleScanComplete} />
        </DialogContent>
      </Dialog>

      <Card className="glass-morphism border-white/5 overflow-hidden rounded-[24px]">
        <CardHeader className="border-b border-white/[0.05] p-8">
          <div className="relative max-w-sm group">
             <Search className="absolute left-4 top-3.5 h-4 w-4 text-slate-500 group-focus-within:text-primary transition-colors" />
             <Input 
                placeholder="Query audit database..." 
                className="pl-11 h-11 bg-black/20 border-white/[0.08] focus:border-primary/50 transition-all duration-300 rounded-xl font-medium"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
             />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredAudits.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-white/[0.05] bg-white/[0.01]">
                  <TableHead className="px-8 h-14 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Log Identifier</TableHead>
                  <TableHead className="h-14 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Timestamp</TableHead>
                  <TableHead className="h-14 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Integrity Score</TableHead>
                  <TableHead className="h-14 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Lifecycle Status</TableHead>
                  <TableHead className="text-right px-8 h-14 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAudits.map((audit) => (
                  <TableRow key={audit.id} className="hover:bg-white/[0.03] border-white/[0.05] group transition-colors">
                    <TableCell className="px-8 font-mono text-[11px] font-bold text-primary/70">
                      {audit.id}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3 text-sm text-slate-400 font-medium">
                        <Calendar size={14} className="text-slate-600" />
                        {audit.conducted_at || 'Jan 24, 2026'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-4">
                        <span className={cn(
                          "font-black text-sm tabular-nums",
                          audit.score < 50 ? "text-destructive" : "text-emerald-500"
                        )}>
                          {audit.score}%
                        </span>
                        <div className="w-24 h-1.5 rounded-full bg-slate-800/50 overflow-hidden border border-white/[0.03]">
                           <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${audit.score}%` }}
                              className={cn(
                                "h-full rounded-full transition-all duration-1000",
                                audit.score < 50 ? "bg-destructive shadow-[0_0_10px_rgba(239,68,68,0.3)]" : "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                              )}
                           />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                       <StatusBadge status={audit.status} />
                    </TableCell>
                    <TableCell className="text-right px-8">
                      <Button asChild variant="ghost" size="sm" className="h-9 px-4 gap-2 rounded-lg text-slate-400 hover:text-primary hover:bg-primary/5 transition-all duration-300">
                        <Link to={`/audits/${audit.id}`}>
                          <span className="text-[10px] font-black uppercase tracking-widest">Analyze</span>
                          <ChevronRight size={14} className="transition-transform group-hover:translate-x-0.5" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="py-32 flex flex-col items-center justify-center text-center px-8">
              <div className="w-20 h-20 rounded-3xl bg-slate-900/60 border border-white/5 flex items-center justify-center mb-6 text-slate-600 shadow-2xl">
                 <Search size={32} />
              </div>
              <h3 className="text-xl font-bold text-white tracking-tight">No matching logs found</h3>
              <p className="text-sm text-slate-500 max-w-xs mt-2 font-medium">
                The query yielded zero records from the Gateway API. Adjust your search parameters or trigger a new baseline scan.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const isLocked = status === 'LOCKED'
  const isReady = status === 'READY' || status === 'COMPLETED'
  
  return (
    <Badge variant="outline" className={cn(
      "gap-1.5 font-bold text-[10px] tracking-wider py-0.5",
      isLocked ? "bg-destructive/5 text-destructive border-destructive/20" :
      isReady ? "bg-primary/5 text-primary border-primary/20" :
      "bg-muted/5 text-muted-foreground border-muted-foreground/20"
    )}>
      {isLocked ? <AlertCircle size={10} /> : isReady ? <CheckCircle2 size={10} /> : <Loader2 size={10} className="animate-spin" />}
      {status || 'UNKNOWN'}
    </Badge>
  )
}

function AuditsSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
       <div className="flex items-center justify-between">
          <div className="space-y-2">
             <Skeleton className="h-8 w-48" />
             <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-9 w-32" />
       </div>
       <Card className="glass border-white/5">
          <CardHeader>
             <Skeleton className="h-10 w-full max-w-sm" />
          </CardHeader>
          <CardContent className="space-y-4">
             {[1, 2, 3, 4, 5].map(i => (
                <Skeleton key={i} className="h-16 w-full" />
             ))}
          </CardContent>
       </Card>
    </div>
  )
}
