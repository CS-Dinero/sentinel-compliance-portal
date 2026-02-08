import React, { useEffect, useState } from 'react'
import { 
  Ticket, 
  Plus, 
  MessageSquare, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Search,
  Filter,
  Loader2,
  X
} from 'lucide-react'
import { api } from '@/lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

export function Tickets() {
  const [tickets, setTickets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [filter, setFilter] = useState('ALL')
  
  // Form state
  const [category, setCategory] = useState('')
  const [message, setMessage] = useState('')
  const [auditId, setAuditId] = useState('')

  useEffect(() => {
    fetchTickets()
  }, [])

  const fetchTickets = async () => {
    try {
      const res = await api.getTickets()
      setTickets(res.items || res)
    } catch (error) {
      console.error('Failed to fetch tickets:', error)
      toast.error('Failed to load tickets from Gateway')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!category || !message) return
    
    setIsSubmitting(true)
    try {
      await api.createTicket({ category, message, audit_record_id: auditId || undefined })
      toast.success('Ticket established in the intelligence network.')
      setIsCreateModalOpen(false)
      // Reset form
      setCategory('')
      setMessage('')
      setAuditId('')
      // Refresh list
      fetchTickets()
    } catch (error: any) {
      toast.error(error.message || 'Failed to create ticket')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) return <TicketsSkeleton />

  const filteredTickets = tickets.filter(t => {
    if (filter === 'ALL') return true
    return t.status === filter
  })

  return (
    <div className="space-y-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
         <div className="space-y-1">
            <h1 className="text-3xl font-black tracking-tight text-white uppercase tracking-widest">Intelligence Support</h1>
            <p className="text-sm text-slate-500 font-medium tracking-wide">Direct channel to compliance leads and remediation specialists.</p>
         </div>
         <Button onClick={() => setIsCreateModalOpen(true)} size="lg" className="h-12 px-8 gap-3 bg-primary text-primary-foreground hover:glow-blue rounded-xl transition-all duration-300 shadow-[0_10px_20px_rgba(59,130,246,0.1)]">
            <Plus size={18} />
            <span className="text-xs font-black uppercase tracking-widest">Establish Inquiry</span>
         </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
         {/* Sidebar filters */}
         <div className="md:col-span-1 space-y-6">
            <Card className="glass-morphism border-white/5 rounded-2xl overflow-hidden">
               <CardHeader className="pb-4 pt-6 px-6 border-b border-white/[0.05]">
                  <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Filter Channels</CardTitle>
               </CardHeader>
               <CardContent className="p-3 space-y-1">
                  <Button 
                    variant="ghost" 
                    className={cn(
                      "w-full justify-start gap-3 rounded-xl px-4 py-6 text-xs font-bold transition-all duration-300",
                      filter === 'ALL' ? "bg-primary/10 text-primary" : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                    )}
                    onClick={() => setFilter('ALL')}
                  >
                     <div className={cn("w-1.5 h-1.5 rounded-full", filter === 'ALL' ? "bg-primary shadow-[0_0_8px_rgba(59,130,246,0.8)]" : "bg-slate-700")} />
                     <span className="uppercase tracking-widest">Active Feeds</span>
                  </Button>
                  <Button 
                    variant="ghost" 
                    className={cn(
                      "w-full justify-start gap-3 rounded-xl px-4 py-6 text-xs font-bold transition-all duration-300",
                      filter === 'OPEN' ? "bg-orange-500/10 text-orange-500" : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                    )}
                    onClick={() => setFilter('OPEN')}
                  >
                     <div className={cn("w-1.5 h-1.5 rounded-full", filter === 'OPEN' ? "bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.8)]" : "bg-slate-700")} />
                     <span className="uppercase tracking-widest">Awaiting Payload</span>
                  </Button>
                  <Button 
                    variant="ghost" 
                    className={cn(
                      "w-full justify-start gap-3 rounded-xl px-4 py-6 text-xs font-bold transition-all duration-300",
                      filter === 'RESOLVED' ? "bg-emerald-500/10 text-emerald-500" : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                    )}
                    onClick={() => setFilter('RESOLVED')}
                  >
                     <div className={cn("w-1.5 h-1.5 rounded-full", filter === 'RESOLVED' ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" : "bg-slate-700")} />
                     <span className="uppercase tracking-widest">Remediated</span>
                  </Button>
               </CardContent>
            </Card>
         </div>

         {/* Ticket List */}
         <div className="md:col-span-3 space-y-6">
            {filteredTickets.length > 0 ? (
               filteredTickets.map((ticket, i) => (
                  <Card key={ticket.id || i} className="glass-morphism border-white/5 hover:border-primary/20 transition-all duration-500 cursor-pointer group rounded-2xl relative overflow-hidden">
                     <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                     <CardContent className="p-8">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-8">
                           <div className="flex gap-6">
                              <div className={cn(
                                 "w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border transition-all duration-500",
                                 ticket.status === 'RESOLVED' ? "bg-emerald-500/5 text-emerald-500 border-emerald-500/10 group-hover:bg-emerald-500/10" : "bg-primary/5 text-primary border-primary/10 group-hover:bg-primary/10"
                              )}>
                                 <MessageSquare size={24} />
                              </div>
                              <div className="space-y-2">
                                 <div className="flex flex-wrap items-center gap-3">
                                    <h3 className="text-lg font-bold text-white tracking-tight uppercase tracking-wider">{ticket.category || 'General Support'}</h3>
                                    <span className="text-slate-700">/</span>
                                    <span className="font-mono text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-white/[0.02] border border-white/[0.05] px-2 py-0.5 rounded">
                                       SIG_{ticket.id?.substring(0, 8) || 'T-2910'}
                                    </span>
                                 </div>
                                 <p className="text-slate-400 line-clamp-2 leading-relaxed font-medium">
                                    {ticket.message || 'I have a question regarding the recent audit finding on infrastructure encryption...'}
                                 </p>
                              </div>
                           </div>
                           <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-4 shrink-0">
                              <StatusBadge status={ticket.status || 'OPEN'} />
                              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-600">
                                 <Clock size={12} />
                                 {ticket.created_at || '2H_AGO'}
                              </div>
                           </div>
                        </div>
                     </CardContent>
                  </Card>
               ))
            ) : (
               <div className="py-32 flex flex-col items-center justify-center text-center px-10 glass-morphism border-white/5 rounded-3xl relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent opacity-30 pointer-events-none" />
                  <div className="w-20 h-20 rounded-[28px] bg-slate-900/60 border border-white/5 flex items-center justify-center mb-8 text-slate-600 shadow-2xl">
                     <Ticket size={32} />
                  </div>
                  <h3 className="text-2xl font-black text-white tracking-tight uppercase tracking-widest">Zero Active Inquiries</h3>
                  <p className="text-slate-500 max-w-sm mt-3 font-medium leading-relaxed">
                     No communication threads detected in the current gateway partition. Access the link below to establish a new support signal.
                  </p>
                  <Button onClick={() => setIsCreateModalOpen(true)} variant="outline" className="mt-10 h-12 px-8 rounded-xl border-white/10 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-300 font-black uppercase tracking-widest text-xs">
                     Establish Primary Signal
                  </Button>
               </div>
            )}
         </div>
      </div>

      {/* Create Ticket Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="bg-slate-950/90 backdrop-blur-2xl border border-white/10 sm:max-w-[560px] p-0 overflow-hidden rounded-[32px] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.8)]">
          <form onSubmit={handleSubmit}>
            <div className="p-10 pb-0 space-y-2">
              <DialogTitle className="text-3xl font-black text-white tracking-tighter uppercase tracking-widest">Establish Inquiry</DialogTitle>
              <DialogDescription className="text-slate-500 font-medium">
                Establish a direct link to the compliance engineering team.
              </DialogDescription>
            </div>
            
            <div className="p-10 space-y-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label htmlFor="category" className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Classification</Label>
                  <Select value={category} onValueChange={setCategory} required>
                    <SelectTrigger className="h-12 bg-white/[0.03] border-white/[0.08] hover:bg-white/[0.05] transition-all rounded-xl font-bold">
                      <SelectValue placeholder="Select logic module" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-white/10 rounded-xl">
                      <SelectItem value="AUDIT_CLARIFICATION" className="font-bold py-3">Audit Clarification</SelectItem>
                      <SelectItem value="REMEDIATION_HELP" className="font-bold py-3">Remediation Help</SelectItem>
                      <SelectItem value="TECHNICAL_SUPPORT" className="font-bold py-3">Technical Support</SelectItem>
                      <SelectItem value="BILLING" className="font-bold py-3">Billing & Account</SelectItem>
                      <SelectItem value="OTHER" className="font-bold py-3">Other Inquiry</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-3">
                  <Label htmlFor="audit_id" className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Context ID (Opt)</Label>
                  <Input 
                    id="audit_id"
                    placeholder="AUD_XXXXX" 
                    className="h-12 bg-white/[0.03] border-white/[0.08] focus:border-primary/50 transition-all rounded-xl font-mono text-xs font-bold"
                    value={auditId}
                    onChange={(e) => setAuditId(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label htmlFor="message" className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Transmission Payload</Label>
                <Textarea 
                  id="message"
                  placeholder="Describe your requirement in detail for the engineering team..." 
                  className="bg-white/[0.03] border-white/[0.08] focus:border-primary/50 transition-all rounded-2xl min-h-[160px] resize-none p-5 font-medium leading-relaxed"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="p-8 pt-0 flex justify-end gap-4 bg-black/20">
              <Button type="button" variant="ghost" onClick={() => setIsCreateModalOpen(false)} className="rounded-xl h-12 px-6 font-bold text-slate-500">
                Abort
              </Button>
              <Button type="submit" disabled={isSubmitting} className="h-12 px-10 gap-3 bg-primary text-primary-foreground hover:glow-blue rounded-xl transition-all duration-300 font-black uppercase tracking-widest text-xs shadow-[0_10px_20px_rgba(59,130,246,0.15)]">
                {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : (
                  <>
                    Launch Signal
                    <Zap size={14} />
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const isResolved = status === 'RESOLVED'
  const isPending = status === 'PENDING' || status === 'OPEN'
  
  return (
    <Badge variant="outline" className={cn(
      "gap-1.5 font-bold text-[9px] tracking-wider py-0.5",
      isResolved ? "bg-emerald-500/5 text-emerald-500 border-emerald-500/20" :
      isPending ? "bg-orange-500/5 text-orange-500 border-orange-500/20" :
      "bg-muted/5 text-muted-foreground border-muted-foreground/20"
    )}>
      {isResolved ? <CheckCircle2 size={10} /> : <Clock size={10} />}
      {status || 'UNKNOWN'}
    </Badge>
  )
}

function TicketsSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
       <div className="flex items-center justify-between">
          <div className="space-y-2">
             <Skeleton className="h-8 w-48" />
             <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-32" />
       </div>
       <div className="grid grid-cols-4 gap-6">
          <Skeleton className="h-48 rounded-xl glass border-white/5" />
          <div className="col-span-3 space-y-4">
             <Skeleton className="h-32 rounded-xl glass border-white/5" />
             <Skeleton className="h-32 rounded-xl glass border-white/5" />
             <Skeleton className="h-32 rounded-xl glass border-white/5" />
          </div>
       </div>
    </div>
  )
}
