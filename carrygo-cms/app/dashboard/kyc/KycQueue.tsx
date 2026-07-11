'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Eye, ChevronUp, ChevronDown } from 'lucide-react'

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
      return { classes: 'bg-slate-100 text-muted', label: 'Pending' }
    default:
      return { classes: 'bg-slate-100 text-muted', label: status }
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
      <div className="flex flex-wrap gap-1 bg-slate-50/50 rounded-xl p-1">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
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
                  : 'bg-slate-100 text-muted'
              }`}
            >
              {counts[tab.key]}
            </span>
          </button>
        ))}
      </div>

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

      <div className="rounded-2xl bg-surface shadow-[var(--shadow-bento)] border border-border-subtle overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-border-subtle bg-slate-50/50">
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
                  <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">
                    {searchQuery
                      ? 'No sessions match your search'
                      : 'No KYC sessions in this category'}
                  </td>
                </tr>
              ) : (
                filteredSessions.map((session) => {
                  const badge = getStatusBadge(session.status)
                  return (
                    <tr
                      key={session.id}
                      onClick={() => router.push(`/dashboard/kyc/${session.id}`)}
                      className="hover:bg-slate-50/50 transition-colors cursor-pointer"
                    >
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
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            router.push(`/dashboard/kyc/${session.id}`)
                          }}
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
    </div>
  )
}
