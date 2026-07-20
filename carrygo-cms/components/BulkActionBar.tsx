'use client'

import { useState } from 'react'
import { CheckCircle2, XCircle, Download, Trash2, AlertTriangle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface BulkAction {
  key: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  variant: 'default' | 'success' | 'danger'
  confirmMessage?: string
}

interface BulkActionBarProps {
  selectedCount: number
  actions: BulkAction[]
  onAction: (actionKey: string) => void | Promise<void>
  onClear: () => void
}

export default function BulkActionBar({
  selectedCount,
  actions,
  onAction,
  onClear,
}: BulkActionBarProps) {
  const [confirming, setConfirming] = useState<string | null>(null)
  const [loading, setLoading] = useState<string | null>(null)

  const handleAction = async (action: BulkAction) => {
    if (action.confirmMessage && confirming !== action.key) {
      setConfirming(action.key)
      return
    }
    setConfirming(null)
    setLoading(action.key)
    await onAction(action.key)
    setLoading(null)
  }

  const variantClasses = {
    default: 'bg-surface border-border text-foreground hover:bg-surface-elevated',
    success: 'bg-success-subtle border-success/20 text-success hover:bg-success/10',
    danger: 'bg-danger-subtle border-danger/20 text-danger hover:bg-danger/10',
  }

  return (
    <AnimatePresence>
      {selectedCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.2 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
        >
          <div className="flex items-center gap-3 px-5 py-3 bg-surface rounded-2xl shadow-2xl border border-border">
            <div className="flex items-center gap-2 pr-3 border-r border-border">
              <div className="w-7 h-7 rounded-lg bg-primary-subtle flex items-center justify-center">
                <span className="text-xs font-bold text-primary">{selectedCount}</span>
              </div>
              <span className="text-sm font-medium text-muted">selected</span>
            </div>

            {confirming ? (
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-warning" />
                <span className="text-sm text-foreground">
                  {actions.find(a => a.key === confirming)?.confirmMessage}
                </span>
                <button
                  onClick={() => handleAction(actions.find(a => a.key === confirming)!)}
                  className="px-3 py-1.5 text-xs font-semibold bg-danger text-white rounded-lg hover:bg-danger/90"
                >
                  Confirm
                </button>
                <button
                  onClick={() => setConfirming(null)}
                  className="px-3 py-1.5 text-xs font-semibold bg-surface text-muted rounded-lg hover:bg-surface-elevated"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                {actions.map(action => {
                  const Icon = action.icon
                  return (
                    <button
                      key={action.key}
                      onClick={() => handleAction(action)}
                      disabled={loading === action.key}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border rounded-lg transition-colors disabled:opacity-50 ${variantClasses[action.variant]}`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {action.label}
                    </button>
                  )
                })}
              </div>
            )}

            <button
              onClick={onClear}
              className="ml-2 p-1.5 rounded-lg hover:bg-surface-elevated text-muted-foreground hover:text-foreground transition-colors"
              title="Clear selection"
            >
              <XCircle className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export const BULK_ACTIONS = {
  verify: { key: 'verify', label: 'Verify', icon: CheckCircle2, variant: 'success' as const },
  export: { key: 'export', label: 'Export', icon: Download, variant: 'default' as const },
  delete: { key: 'delete', label: 'Delete', icon: Trash2, variant: 'danger' as const, confirmMessage: 'Delete selected items permanently?' },
}
