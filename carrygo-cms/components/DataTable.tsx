'use client'

import { useState, useMemo } from 'react'
import { Search, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Loader2, SlidersHorizontal } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export interface Column<T> {
  key: keyof T & string
  label: string
  sortable?: boolean
  width?: string
  render?: (value: T[keyof T], row: T) => React.ReactNode
}

interface DataTableProps<T extends { id: string }> {
  data: T[]
  columns: Column<T>[]
  isLoading?: boolean
  pageSize?: number
  searchable?: boolean
  searchPlaceholder?: string
  selectable?: boolean
  onSelectionChange?: (ids: string[]) => void
  onRowClick?: (row: T) => void
  emptyMessage?: string
  emptyIcon?: React.ReactNode
  toolbar?: React.ReactNode
}

export default function DataTable<T extends { id: string }>({
  data,
  columns,
  isLoading = false,
  pageSize = 15,
  searchable = true,
  searchPlaceholder = 'Search records...',
  selectable = false,
  onSelectionChange,
  onRowClick,
  emptyMessage = 'No records found',
  emptyIcon,
  toolbar,
}: DataTableProps<T>) {
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [page, setPage] = useState(0)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const filtered = useMemo(() => {
    if (!search) return data
    const q = search.toLowerCase()
    return data.filter(row =>
      columns.some(col => {
        const val = row[col.key]
        return val != null && String(val).toLowerCase().includes(q)
      })
    )
  }, [data, search, columns])

  const sorted = useMemo(() => {
    if (!sortKey) return filtered
    return [...filtered].sort((a, b) => {
      const aVal = a[sortKey as keyof T]
      const bVal = b[sortKey as keyof T]
      if (aVal == null && bVal == null) return 0
      if (aVal == null) return 1
      if (bVal == null) return -1
      const cmp = String(aVal).localeCompare(String(bVal), undefined, { numeric: true })
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [filtered, sortKey, sortDir])

  const totalPages = Math.ceil(sorted.length / pageSize)
  const pageData = sorted.slice(page * pageSize, (page + 1) * pageSize)

  const toggleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
    setPage(0)
  }

  const toggleSelect = (id: string) => {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelected(next)
    onSelectionChange?.(Array.from(next))
  }

  const toggleAll = () => {
    if (selected.size === pageData.length) {
      setSelected(new Set())
      onSelectionChange?.([])
    } else {
      const all = new Set(pageData.map(r => r.id))
      setSelected(all)
      onSelectionChange?.(Array.from(all))
    }
  }

  if (isLoading) {
    return (
      <div className="glass-card p-12 flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
        <p className="text-sm text-muted">Loading data...</p>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-4"
    >
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        {searchable && (
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(0) }}
              placeholder={searchPlaceholder}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl glass border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
            />
          </div>
        )}
        {toolbar}
        {selected.size > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="px-3 py-1.5 rounded-lg bg-primary-subtle text-primary text-xs font-medium"
          >
            {selected.size} selected
          </motion.div>
        )}
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-border">
                {selectable && (
                  <th className="px-4 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={pageData.length > 0 && selected.size === pageData.length}
                      onChange={toggleAll}
                      aria-label="Select all rows on this page"
                      className="rounded border-border-strong accent-primary"
                    />
                  </th>
                )}
                {columns.map(col => (
                  <th
                    key={col.key}
                    style={col.width ? { width: col.width } : undefined}
                    className={`px-4 py-3 text-left text-[11px] font-semibold text-muted uppercase tracking-wider ${col.sortable ? 'cursor-pointer select-none hover:text-foreground transition-colors' : ''}`}
                    onClick={() => col.sortable && toggleSort(col.key)}
                  >
                    <div className="flex items-center gap-1">
                      {col.label}
                      {col.sortable && sortKey === col.key && (
                        <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                          {sortDir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        </motion.span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              <AnimatePresence mode="popLayout">
                {pageData.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length + (selectable ? 1 : 0)} className="px-4 py-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        {emptyIcon || <SlidersHorizontal className="h-8 w-8 text-muted-foreground/40" />}
                        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  pageData.map((row, idx) => (
                    <motion.tr
                      key={row.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ delay: idx * 0.02 }}
                      onClick={() => onRowClick?.(row)}
                      className={`group transition-colors ${
                        selected.has(row.id) ? 'bg-primary-subtle/50' : 'hover:bg-surface-elevated/50'
                      } ${onRowClick ? 'cursor-pointer' : ''}`}
                    >
                      {selectable && (
                        <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selected.has(row.id)}
                            onChange={() => toggleSelect(row.id)}
                            aria-label={`Select row ${row.id}`}
                            className="rounded border-border-strong accent-primary"
                          />
                        </td>
                      )}
                      {columns.map(col => (
                        <td key={col.key} className="px-4 py-3 text-sm text-foreground/85 whitespace-nowrap">
                          {col.render ? col.render(row[col.key], row) : String(row[col.key] ?? '')}
                        </td>
                      ))}
                    </motion.tr>
                  ))
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted text-xs">
            Showing {page * pageSize + 1}–{Math.min((page + 1) * pageSize, sorted.length)} of {sorted.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(0)}
              disabled={page === 0}
              className="p-1.5 rounded-lg hover:bg-surface-elevated disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronsLeft className="h-4 w-4 text-muted" />
            </button>
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="p-1.5 rounded-lg hover:bg-surface-elevated disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="h-4 w-4 text-muted" />
            </button>
            <span className="px-3 py-1 rounded-lg bg-surface-elevated text-xs font-medium text-foreground border border-border-subtle">
              {page + 1} / {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="p-1.5 rounded-lg hover:bg-surface-elevated disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="h-4 w-4 text-muted" />
            </button>
            <button
              onClick={() => setPage(totalPages - 1)}
              disabled={page >= totalPages - 1}
              className="p-1.5 rounded-lg hover:bg-surface-elevated disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronsRight className="h-4 w-4 text-muted" />
            </button>
          </div>
        </div>
      )}
    </motion.div>
  )
}
