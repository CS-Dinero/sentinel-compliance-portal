import React from 'react'
import { motion } from 'framer-motion'
import { Lock, Unlock, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

interface LockItem {
  id: string
  name: string
  status: 'READY' | 'LOCKED' | 'PROCESSING'
  description?: string
}

interface LocksGridProps {
  locks: LockItem[]
}

export function LocksGrid({ locks }: LocksGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {locks.map((lock, index) => (
        <motion.div
          key={lock.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className={cn(
            "p-5 rounded-xl border glass transition-all duration-300 hover:scale-[1.02]",
            lock.status === 'LOCKED' ? "border-destructive/30 bg-destructive/5" : "hover:border-primary/50"
          )}
        >
          <div className="flex items-start justify-between mb-4">
            <div className={cn(
              "p-2.5 rounded-lg",
              lock.status === 'READY' ? "bg-primary/10 text-primary" :
              lock.status === 'LOCKED' ? "bg-destructive/10 text-destructive" :
              "bg-muted text-muted-foreground"
            )}>
              {lock.status === 'READY' ? <Unlock size={20} /> : <Lock size={20} />}
            </div>
            <StatusBadge status={lock.status} />
          </div>
          
          <h3 className="font-semibold text-lg mb-1">{lock.name}</h3>
          <p className="text-sm text-muted-foreground line-clamp-2">
            {lock.description || `Compliance check for ${lock.name} verification and security standards.`}
          </p>
        </motion.div>
      ))}
    </div>
  )
}

function StatusBadge({ status }: { status: LockItem['status'] }) {
  switch (status) {
    case 'READY':
      return (
        <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 gap-1.5 py-1 px-2.5">
          <CheckCircle2 size={12} />
          READY
        </Badge>
      )
    case 'LOCKED':
      return (
        <Badge variant="outline" className="bg-destructive/5 text-destructive border-destructive/20 gap-1.5 py-1 px-2.5">
          <AlertCircle size={12} />
          LOCKED
        </Badge>
      )
    case 'PROCESSING':
      return (
        <Badge variant="outline" className="bg-muted text-muted-foreground border-muted-foreground/20 gap-1.5 py-1 px-2.5">
          <Loader2 size={12} className="animate-spin" />
          PROCESSING
        </Badge>
      )
  }
}
