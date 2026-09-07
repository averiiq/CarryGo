'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search,
  Eye,
  ChevronUp,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  ShieldCheck,
} from 'lucide-react'
import { bulkApproveKycSessions } from './actions'

type KycSession = {
  id: string
  userId: string
  fullName: string
  idType: string
  documentsCount: number
  submittedAt: string
  attemptNumber: number
  status: string
}

type TabKey = 'all' | 'submitted' | 'under_review' | 'approved' | 'rejected'

type KycQueueProps = {
  sessions: KycSession[]
  counts: {
    all: number
    submitted: number
    under_review: number
    approved: number
    rejected: number
  }
  activeTab: TabKey
}

type SortField = 'fullName' | 'submittedAt' | 'attemptNumber' | 'status'
type SortDirection = 'asc' | 'desc'

function getStatusBadge(status: string) {
  switch (status) {
    case 'submitted':
      return { classes: 'bg-warning-subtle text-warning', label: 'Submitted' }
    case 'approved':
      return { classes: 'bg-success-subtle text-success', label: 'Approved' }
    case 'rejected':
      return { classes: 'bg-danger-subtle text-danger', label: 'Rejected' }
    case 'under_review':
      return { classes: 'bg-primary-subtle text-primary', label: 'Under Review' }
    case 'pending':
      return { classes: 'bg-surface text-muted', label: 'Pending' }
    default:
      return { classes: 'bg-surface text-muted', label: status }
  }
}

const TABS: { key: TabKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'submitted', label: 'Pending' },
  { key: 'under_review', label: 'Under Review' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
]

export default function KycQueue({ sessions, counts, activeTab: initialTab }: KycQueueProps) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab)
  const [sortField, setSortField] = useState<SortField>('submittedAt')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  // Bulk action states
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const filteredSessions = useMemo(() => {
    let filtered = sessions

    if (activeTab !== 'all') {
      filtered = filtered.filter((s) => s.status === activeTab)
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter((s) =>
        s.fullName.toLowerCase().includes(query)
      )
    }

    const sorted = [...filtered].sort((a, b) => {
      let comparison = 0
      switch (sortField) {
        case 'fullName':
          comparison = a.fullName.localeCompare(b.fullName)
          break
        case 'submittedAt':
          comparison = new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime()
          break
        case 'attemptNumber':
          comparison = a.attemptNumber - b.attemptNumber
          break
        case 'status':
          comparison = a.status.localeCompare(b.status)
          break
      }
      return sortDirection === 'asc' ? comparison : -comparison
    })

    return sorted
  }, [sessions, activeTab, searchQuery, sortField, sortDirection])

  // Selectable items (excluding already approved)
  const selectableSessions = useMemo(() => {
    return filteredSessions.filter((s) => s.status !== 'approved')
  }, [filteredSessions])

  const selectableCount = selectableSessions.length
  const selectedCount = selectableSessions.filter((s) => selectedIds.has(s.id)).length

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleSelectAll = () => {
    const eligibleIds = selectableSessions.map((s) => s.id)
    const allSelected = eligibleIds.length > 0 && eligibleIds.every((id) => selectedIds.has(id))

    if (allSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        for (const id of eligibleIds) next.delete(id)
        return next
      })
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        for (const id of eligibleIds) next.add(id)
        return next
      })
    }
  }

  const handleBulkApprove = async () => {
    if (selectedIds.size === 0) return
    const count = selectedIds.size
    const confirmMsg = `Are you sure you want to approve ${count} selected KYC submission${count > 1 ? 's' : ''}? This will mark users as verified.`
    if (!window.confirm(confirmMsg)) return

    setIsSubmitting(true)
    setFeedback(null)

    try {
      const res = await bulkApproveKycSessions(Array.from(selectedIds))
      if (res.success) {
        setFeedback({
          type: 'success',
          message: `Successfully approved ${res.approvedCount} KYC submission${res.approvedCount === 1 ? '' : 's'}!`,
        })
        setSelectedIds(new Set())
        router.refresh()
      } else {
        setFeedback({
          type: 'error',
          message: res.error || 'Failed to approve selected submissions.',
        })
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'An unexpected error occurred.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  function renderSortIcon(field: SortField) {
    if (sortField !== field) return null
    return sortDirection === 'asc' ? (
      <ChevronUp className="w-3 h-3 inline ml-1" />
    ) : (
      <ChevronDown className="w-3 h-3 inline ml-1" />
    )
  }

  return (
    <div className="space-y-4">
      {/* Status Feedback Banner */}
      {feedback && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between gap-3 text-sm font-medium border ${
            feedback.type === 'success'
              ? 'bg-success-subtle text-success border-success/30'
              : 'bg-danger-subtle text-danger border-danger/30'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition"
            aria-label="Dismiss feedback"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 bg-surface rounded-xl p-1">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setActiveTab(tab.key)
              setSelectedIds(new Set())
              router.push(tab.key === 'all' ? '/dashboard/kyc' : `/dashboard/kyc?status=${tab.key}`)
            }}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              activeTab === tab.key
                ? 'bg-surface text-foreground shadow-sm'
                : 'text-muted hover:text-foreground'
            }`}
          >
            {tab.label}
            <span
              className={`ml-2 inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ${
                activeTab === tab.key
                  ? 'bg-primary-subtle text-primary'
                  : 'bg-surface text-muted'
              }`}
            >
              {counts[tab.key]}
            </span>
          </button>
        ))}
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search by user name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 text-sm border border-border rounded-xl bg-surface text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
        />
      </div>

      {/* Table Card */}
      <div className="rounded-2xl bg-surface shadow-[var(--shadow-bento)] border border-border-subtle overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-border-subtle bg-surface">
                <th className="w-12 px-4 py-3.5 text-center">
                  <input
                    type="checkbox"
                    aria-label="Select all eligible submissions"
                    checked={selectableCount > 0 && selectedCount === selectableCount}
                    ref={(el) => {
                      if (el) {
                        el.indeterminate = selectedCount > 0 && selectedCount < selectableCount
                      }
                    }}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded border-border-subtle text-primary focus:ring-primary/30 accent-primary cursor-pointer"
                  />
                </th>
                <th
                  onClick={() => handleSort('fullName')}
                  className="px-6 py-3.5 text-left text-xs font-semibold text-muted uppercase tracking-wider cursor-pointer hover:text-foreground transition-colors"
                >
                  User {renderSortIcon('fullName')}
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-muted uppercase tracking-wider">
                  ID Type
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-muted uppercase tracking-wider">
                  Docs
                </th>
                <th
                  onClick={() => handleSort('submittedAt')}
                  className="px-6 py-3.5 text-left text-xs font-semibold text-muted uppercase tracking-wider cursor-pointer hover:text-foreground transition-colors"
                >
                  Submitted {renderSortIcon('submittedAt')}
                </th>
                <th
                  onClick={() => handleSort('attemptNumber')}
                  className="px-6 py-3.5 text-left text-xs font-semibold text-muted uppercase tracking-wider cursor-pointer hover:text-foreground transition-colors"
                >
                  Attempt {renderSortIcon('attemptNumber')}
                </th>
                <th
                  onClick={() => handleSort('status')}
                  className="px-6 py-3.5 text-left text-xs font-semibold text-muted uppercase tracking-wider cursor-pointer hover:text-foreground transition-colors"
                >
                  Status {renderSortIcon('status')}
                </th>
                <th className="px-6 py-3.5 text-right text-xs font-semibold text-muted uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {filteredSessions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-muted-foreground">
                    {searchQuery
                      ? 'No sessions match your search'
                      : 'No KYC sessions in this category'}
                  </td>
                </tr>
              ) : (
                filteredSessions.map((session) => {
                  const badge = getStatusBadge(session.status)
                  const isSelected = selectedIds.has(session.id)
                  const isSelectable = session.status !== 'approved'

                  return (
                    <tr
                      key={session.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => router.push(`/dashboard/kyc/${session.id}`)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          router.push(`/dashboard/kyc/${session.id}`)
                        }
                      }}
                      className={`hover:bg-surface transition-colors cursor-pointer ${
                        isSelected ? 'bg-primary-subtle/30' : ''
                      }`}
                    >
                      <td
                        className="w-12 px-4 py-4 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          aria-label={`Select ${session.fullName}`}
                          disabled={!isSelectable}
                          checked={isSelected}
                          onChange={() => handleToggleSelect(session.id)}
                          className="w-4 h-4 rounded border-border-subtle text-primary focus:ring-primary/30 accent-primary cursor-pointer disabled:opacity-20 disabled:cursor-not-allowed"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-foreground">
                          {session.fullName}
                        </div>
                        <div className="text-xs text-muted truncate max-w-[200px]">
                          {session.userId}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-primary-subtle text-primary">
                          {session.idType}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground/70">
                        {session.documentsCount}/4
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted">
                        {new Date(session.submittedAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted">
                        #{session.attemptNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-semibold ${badge.classes}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td
                        className="px-6 py-4 whitespace-nowrap text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => router.push(`/dashboard/kyc/${session.id}`)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-primary bg-primary-subtle rounded-lg hover:bg-primary/10 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Review
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Floating Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
          <div className="flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3 rounded-2xl bg-surface/95 backdrop-blur-md border border-border shadow-2xl">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">
                {selectedIds.size}
              </span>
              <span className="text-xs sm:text-sm font-medium text-foreground whitespace-nowrap">
                {selectedIds.size} {selectedIds.size === 1 ? 'submission' : 'submissions'} selected
              </span>
            </div>

            <div className="h-4 w-px bg-border-subtle" />

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleBulkApprove}
                disabled={isSubmitting}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-success text-white hover:bg-success/90 transition shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Approving...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Approve Selected</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setSelectedIds(new Set())}
                disabled={isSubmitting}
                className="p-2 rounded-xl text-muted hover:text-foreground hover:bg-surface-subtle transition cursor-pointer"
                title="Clear selection"
                aria-label="Clear selection"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
