'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Shield, Eye, Edit3, Trash2, UserPlus, Lock, Download, Filter, Search } from 'lucide-react'

type AuditAction = 'view' | 'create' | 'update' | 'delete' | 'login' | 'export' | 'approve' | 'reject'

interface AuditEntry {
  id: string
  admin: string
  action: AuditAction
  resource: string
  resourceId?: string
  detail: string
  timestamp: string
  ip?: string
}

interface AuditLogProps {
  entries: AuditEntry[]
}

const actionConfig: Record<AuditAction, { icon: React.ComponentType<{ className?: string }>; color: string; bg: string; label: string }> = {
  view: { icon: Eye, color: 'text-muted-foreground', bg: 'bg-surface-elevated', label: 'Viewed' },
  create: { icon: UserPlus, color: 'text-success', bg: 'bg-success-subtle', label: 'Created' },
  update: { icon: Edit3, color: 'text-primary', bg: 'bg-primary-subtle', label: 'Updated' },
  delete: { icon: Trash2, color: 'text-danger', bg: 'bg-danger-subtle', label: 'Deleted' },
  login: { icon: Lock, color: 'text-accent', bg: 'bg-accent-subtle', label: 'Logged in' },
  export: { icon: Download, color: 'text-warning', bg: 'bg-warning-subtle', label: 'Exported' },
  approve: { icon: Shield, color: 'text-success', bg: 'bg-success-subtle', label: 'Approved' },
  reject: { icon: Shield, color: 'text-danger', bg: 'bg-danger-subtle', label: 'Rejected' },
}

const actionFilters: AuditAction[] = ['view', 'create', 'update', 'delete', 'login', 'export', 'approve', 'reject']

export default function AuditLog({ entries }: AuditLogProps) {
  const [filter, setFilter] = useState<AuditAction | 'all'>('all')
  const [showFilters, setShowFilters] = useState(false)
  const [search, setSearch] = useState('')

  const filtered = entries.filter((e) => {
    if (filter !== 'all' && e.action !== filter) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      return (
        e.admin.toLowerCase().includes(q) ||
        e.resource.toLowerCase().includes(q) ||
        (e.resourceId && e.resourceId.toLowerCase().includes(q)) ||
        e.detail.toLowerCase().includes(q) ||
        e.timestamp.toLowerCase().includes(q)
      )
    }
    return true
  })

  const exportAuditLog = () => {
    const escapeCell = (value: unknown) => {
      let text = String(value ?? '')
      if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`
      return `"${text.replace(/"/g, '""')}"`
    }
    const rows = [
      ['ID', 'Admin / Actor', 'Action', 'Resource', 'Resource ID', 'Detail', 'Timestamp', 'IP'],
      ...filtered.map((e) => [
        e.id,
        e.admin,
        e.action,
        e.resource,
        e.resourceId || '',
        e.detail,
        e.timestamp,
        e.ip || '',
      ]),
    ]
    const blob = new Blob([rows.map((r) => r.map(escapeCell).join(',')).join('\n')], {
      type: 'text/csv;charset=utf-8',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              showFilters ? 'bg-primary text-white' : 'bg-surface border border-border-subtle text-muted-foreground hover:text-foreground'
            }`}
          >
            <Filter className="h-3.5 w-3.5" />
            Filter
          </button>
          {filter !== 'all' && (
            <span className="text-xs text-muted-foreground">
              Showing: <span className="font-medium text-foreground capitalize">{filter}</span>
              <button onClick={() => setFilter('all')} className="ml-1.5 text-primary hover:underline">Clear</button>
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-60">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search audit trail..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-border bg-surface text-xs text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <button
            type="button"
            onClick={exportAuditLog}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border bg-surface text-xs font-medium text-muted hover:text-foreground shrink-0 transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="flex flex-wrap gap-1.5 pb-3">
              <button
                onClick={() => setFilter('all')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                  filter === 'all' ? 'bg-primary text-white' : 'bg-surface-elevated text-muted-foreground hover:bg-border'
                }`}
              >
                All
              </button>
              {actionFilters.map(action => {
                return (
                  <button
                    key={action}
                    onClick={() => setFilter(action)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all capitalize ${
                      filter === action ? 'bg-primary text-white' : 'bg-surface-elevated text-muted-foreground hover:bg-border'
                    }`}
                  >
                    {action}
                  </button>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="glass-card overflow-hidden">
        <div className="divide-y divide-border-subtle">
          {filtered.length === 0 ? (
            <div className="py-12 text-center">
              <Shield className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-40" />
              <p className="text-sm text-muted-foreground">No audit entries found</p>
            </div>
          ) : (
            filtered.map((entry, i) => {
              const config = actionConfig[entry.action]
              const Icon = config.icon
              return (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.02 }}
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-surface-elevated/50 transition-colors"
                >
                  <div className={`shrink-0 rounded-lg p-2 ${config.bg}`}>
                    <Icon className={`h-3.5 w-3.5 ${config.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground">
                      <span className="font-semibold">{entry.admin}</span>
                      {' '}
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${config.bg} ${config.color}`}>
                        {config.label}
                      </span>
                      {' '}
                      <span className="text-muted">{entry.detail}</span>
                    </p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-[10px] text-muted-foreground">{entry.timestamp}</span>
                      {entry.resource && (
                        <span className="text-[10px] text-muted-foreground font-mono bg-surface-elevated px-1.5 py-0.5 rounded">
                          {entry.resource}{entry.resourceId ? `#${entry.resourceId.slice(0, 8)}` : ''}
                        </span>
                      )}
                      {entry.ip && (
                        <span className="text-[10px] text-muted-foreground font-mono">{entry.ip}</span>
                      )}
                    </div>
                  </div>
                </motion.div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
