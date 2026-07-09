'use client'

import { useState } from 'react'
import { CheckCircle2, XCircle, Download, Trash2, AlertTriangle } from 'lucide-react'

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

  if (selectedCount === 0) return null

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
    default: 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50',
    success: 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100',
    danger: 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100',
  }

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4">
      <div className="flex items-center gap-3 px-5 py-3 bg-white rounded-xl shadow-lg border border-gray-200">
        <div className="flex items-center gap-2 pr-3 border-r border-gray-200">
          <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center">
            <span className="text-xs font-bold text-blue-700">{selectedCount}</span>
          </div>
          <span className="text-sm font-medium text-gray-600">selected</span>
        </div>

        {confirming ? (
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <span className="text-sm text-gray-700">
              {actions.find(a => a.key === confirming)?.confirmMessage}
            </span>
            <button
              onClick={() => handleAction(actions.find(a => a.key === confirming)!)}
              className="px-3 py-1.5 text-xs font-medium bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              Confirm
            </button>
            <button
              onClick={() => setConfirming(null)}
              className="px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200"
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
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border rounded-md transition-colors disabled:opacity-50 ${variantClasses[action.variant]}`}
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
          className="ml-2 p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600"
          title="Clear selection"
        >
          <XCircle className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

export const BULK_ACTIONS = {
  verify: { key: 'verify', label: 'Verify', icon: CheckCircle2, variant: 'success' as const },
  export: { key: 'export', label: 'Export', icon: Download, variant: 'default' as const },
  delete: { key: 'delete', label: 'Delete', icon: Trash2, variant: 'danger' as const, confirmMessage: 'Delete selected items permanently?' },
}
