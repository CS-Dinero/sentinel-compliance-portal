import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronUp, AlertTriangle, CheckCircle, Info, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

interface Finding {
  id: string
  title: string
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  status: 'OPEN' | 'RESOLVED' | 'IN_PROGRESS'
  category: string
  remediation_plan?: string
  code_preview?: string
}

interface FindingsTableProps {
  findings: Finding[]
}

export function FindingsTable({ findings }: FindingsTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedRows(newExpanded)
  }

  return (
    <div className="rounded-xl border glass overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent border-muted">
            <TableHead className="w-[40px]"></TableHead>
            <TableHead>Finding</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Severity</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {findings.map((finding) => (
            <React.Fragment key={finding.id}>
              <TableRow 
                className="cursor-pointer hover:bg-white/5 border-muted group"
                onClick={() => toggleRow(finding.id)}
              >
                <TableCell>
                  {expandedRows.has(finding.id) ? (
                    <ChevronUp size={16} className="text-muted-foreground" />
                  ) : (
                    <ChevronDown size={16} className="text-muted-foreground" />
                  )}
                </TableCell>
                <TableCell className="font-medium">{finding.title}</TableCell>
                <TableCell>
                  <Badge variant="secondary" className="bg-muted/50 text-xs">
                    {finding.category}
                  </Badge>
                </TableCell>
                <TableCell>
                  <SeverityBadge severity={finding.severity} />
                </TableCell>
                <TableCell>
                  <StatusBadge status={finding.status} />
                </TableCell>
              </TableRow>
              <AnimatePresence>
                {expandedRows.has(finding.id) && (
                  <TableRow className="hover:bg-transparent border-muted bg-white/[0.02]">
                    <TableCell colSpan={5} className="p-0">
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        className="overflow-hidden"
                      >
                        <div className="p-6 space-y-4">
                          {finding.remediation_plan && (
                            <div>
                              <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                                <Info size={14} className="text-primary" />
                                Remediation Plan
                              </h4>
                              <p className="text-sm text-muted-foreground leading-relaxed">
                                {finding.remediation_plan}
                              </p>
                            </div>
                          )}
                          {finding.code_preview && (
                            <div>
                              <h4 className="text-sm font-semibold mb-2">Technical Details</h4>
                              <pre className="p-4 rounded-lg bg-black/50 border border-muted text-xs font-mono overflow-x-auto text-primary/80">
                                <code>{finding.code_preview}</code>
                              </pre>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    </TableCell>
                  </TableRow>
                )}
              </AnimatePresence>
            </React.Fragment>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function SeverityBadge({ severity }: { severity: Finding['severity'] }) {
  switch (severity) {
    case 'CRITICAL':
      return <Badge className="bg-destructive hover:bg-destructive/80 text-[10px] px-1.5 py-0">CRITICAL</Badge>
    case 'HIGH':
      return <Badge className="bg-orange-500 hover:bg-orange-500/80 text-[10px] px-1.5 py-0">HIGH</Badge>
    case 'MEDIUM':
      return <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/30 text-[10px] px-1.5 py-0 border-yellow-500/30">MEDIUM</Badge>
    case 'LOW':
      return <Badge variant="secondary" className="bg-blue-500/20 text-blue-500 hover:bg-blue-500/30 text-[10px] px-1.5 py-0 border-blue-500/30">LOW</Badge>
  }
}

function StatusBadge({ status }: { status: Finding['status'] }) {
  switch (status) {
    case 'OPEN':
      return (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <AlertTriangle size={12} className="text-orange-500" />
          Open
        </div>
      )
    case 'RESOLVED':
      return (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <CheckCircle size={12} className="text-primary" />
          Resolved
        </div>
      )
    case 'IN_PROGRESS':
      return (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Info size={12} className="text-blue-500" />
          In Progress
        </div>
      )
  }
}
