import React, { useEffect, useState } from 'react'
import { 
  Files, 
  Download, 
  FileText, 
  Search,
  Filter,
  FileCheck,
  FileClock,
  ExternalLink
} from 'lucide-react'
import { api } from '@/lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

export function Deliverables() {
  const [artifacts, setArtifacts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filter, setFilter] = useState('ALL')

  useEffect(() => {
    async function fetchArtifacts() {
      try {
        const res = await api.getArtifacts()
        setArtifacts(res.items || res)
      } catch (error) {
        console.error('Failed to fetch artifacts:', error)
        toast.error('Failed to load artifacts from Gateway')
      } finally {
        setLoading(false)
      }
    }
    fetchArtifacts()
  }, [])

  const filteredArtifacts = artifacts.filter(item => {
    const matchesSearch = item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.type?.toLowerCase().includes(searchTerm.toLowerCase())
    if (!matchesSearch) return false
    if (filter === 'ALL') return true
    return item.status === filter
  })

  if (loading) return <DeliverablesSkeleton />

  return (
    <div className="space-y-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
         <div className="space-y-1">
            <h1 className="text-3xl font-black tracking-tight text-white uppercase tracking-widest">Compliance Assets</h1>
            <p className="text-sm text-slate-500 font-medium tracking-wide">Certified compliance artifacts and immutable documentation logs.</p>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
         {/* Filter Card */}
         <div className="lg:col-span-1 space-y-6">
            <Card className="glass-morphism border-white/5 rounded-2xl overflow-hidden h-fit">
               <CardHeader className="pb-4 pt-6 px-6 border-b border-white/[0.05]">
                  <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Query Repository</CardTitle>
               </CardHeader>
               <CardContent className="p-6 space-y-6">
                  <div className="relative group">
                     <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500 group-focus-within:text-primary transition-colors" />
                     <Input 
                        placeholder="Filter artifacts..." 
                        className="pl-9 h-10 bg-black/20 border-white/[0.08] focus:border-primary/50 transition-all rounded-xl text-xs"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                     />
                  </div>
                  <div className="space-y-1">
                     <Button 
                        variant="ghost" 
                        className={cn(
                          "w-full justify-start gap-3 rounded-xl px-4 py-3 text-xs font-bold transition-all",
                          filter === 'ALL' ? "bg-primary/10 text-primary" : "text-slate-400 hover:text-white"
                        )}
                        onClick={() => setFilter('ALL')}
                     >
                        <Files size={14} />
                        <span className="uppercase tracking-widest text-[10px]">All Artifacts</span>
                     </Button>
                     <Button 
                        variant="ghost" 
                        className={cn(
                          "w-full justify-start gap-3 rounded-xl px-4 py-3 text-xs font-bold transition-all",
                          filter === 'CERTIFIED' ? "bg-emerald-500/10 text-emerald-500" : "text-slate-400 hover:text-white"
                        )}
                        onClick={() => setFilter('CERTIFIED')}
                     >
                        <FileCheck size={14} />
                        <span className="uppercase tracking-widest text-[10px]">Certified Logs</span>
                     </Button>
                     <Button 
                        variant="ghost" 
                        className={cn(
                          "w-full justify-start gap-3 rounded-xl px-4 py-3 text-xs font-bold transition-all",
                          filter === 'DRAFT' ? "bg-amber-500/10 text-amber-500" : "text-slate-400 hover:text-white"
                        )}
                        onClick={() => setFilter('DRAFT')}
                     >
                        <FileClock size={14} />
                        <span className="uppercase tracking-widest text-[10px]">Draft Payloads</span>
                     </Button>
                  </div>
               </CardContent>
            </Card>
         </div>

         {/* Grid of Artifacts */}
         <div className="lg:col-span-3">
            {filteredArtifacts.length > 0 ? (
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {filteredArtifacts.map((item, i) => (
                     <Card key={item.id || i} className="glass-morphism border-white/5 hover:border-primary/20 transition-all duration-500 group rounded-2xl relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        <CardContent className="p-8">
                           <div className="flex items-start gap-6">
                              <div className="w-16 h-16 rounded-2xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-center shrink-0 group-hover:border-primary/30 group-hover:bg-primary/10 transition-all duration-500">
                                 <FileText className="text-slate-500 group-hover:text-primary transition-colors" size={28} />
                              </div>
                              <div className="flex-1 min-w-0 space-y-3">
                                 <div className="flex items-start justify-between gap-4">
                                    <h3 className="font-bold text-base text-white tracking-tight truncate uppercase tracking-wider">{item.name || 'Artifact Name'}</h3>
                                    <Badge variant="outline" className="bg-white/5 border-white/10 text-primary text-[9px] font-black uppercase tracking-widest h-5 px-2">
                                       {item.type || 'PDF'}
                                    </Badge>
                                 </div>
                                 <p className="text-xs text-slate-500 font-medium leading-relaxed line-clamp-2">
                                    {item.description || 'Formal compliance verification document and immutable evidence payload for regulatory authorities.'}
                                 </p>
                                 <div className="flex items-center justify-between pt-4 border-t border-white/[0.03]">
                                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-600">
                                       <Calendar size={12} />
                                       {item.created_at || 'JAN_24_2026'}
                                    </div>
                                    <Button 
                                       asChild 
                                       size="sm" 
                                       className="h-9 px-4 gap-2 bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-all duration-300 rounded-lg text-[10px] font-black uppercase tracking-widest"
                                    >
                                       <a href={item.public_url} target="_blank" rel="noopener noreferrer">
                                          Download
                                          <Download size={14} />
                                       </a>
                                    </Button>
                                 </div>
                              </div>
                           </div>
                        </CardContent>
                     </Card>
                  ))}
               </div>
            ) : (
               <div className="py-32 flex flex-col items-center justify-center text-center px-10 glass-morphism border-white/5 rounded-3xl relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent opacity-30 pointer-events-none" />
                  <div className="w-20 h-20 rounded-[28px] bg-slate-900/60 border border-white/5 flex items-center justify-center mb-8 text-slate-600 shadow-2xl">
                     <Files size={32} />
                  </div>
                  <h3 className="text-2xl font-black text-white tracking-tight uppercase tracking-widest">Repository Depleted</h3>
                  <p className="text-slate-500 max-w-sm mt-3 font-medium leading-relaxed">
                     No immutable compliance artifacts detected in the current partition. Artifacts are automatically generated upon successful audit completion.
                  </p>
               </div>
            )}
         </div>
      </div>
    </div>
  )
}

function DeliverablesSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
       <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
       </div>
       <div className="grid grid-cols-4 gap-6">
          <Skeleton className="h-64 rounded-xl glass border-white/5" />
          <div className="col-span-3 grid grid-cols-2 gap-4">
             {[1, 2, 3, 4].map(i => (
                <Skeleton key={i} className="h-32 rounded-xl glass border-white/5" />
             ))}
          </div>
       </div>
    </div>
  )
}
