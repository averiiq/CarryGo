'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import {
  Search,
  Ban,
  UserCheck,
  Star,
  ShieldCheck,
  ShieldAlert,
  Phone,
  Mail,
  User,
  Package,
  Route,
  Loader2,
  ExternalLink,
  ChevronRight,
  Eye,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import SlideOver from '@/components/SlideOver'
import { toggleUserStatus, updateUserSystemRole, getUserDetails } from './actions'

export type UserRow = {
  id: string
  name: string
  username: string | null
  email: string
  phone: string | null
  role: string
  marketplaceRole: string
  status: string
  kycStatus: string
  verified: boolean
  rating: number
  totalDeliveries: number
  totalTrips: number
  joined: string
}

type UserDetailsState = {
  profile: Record<string, unknown>
  tripsCount: number
  parcelsCount: number
  requestsCount: number
  kycSession: {
    id: string
    status: string
    id_type: string
    submission_attempt?: number
    created_at: string
  } | null
} | null

const roleStyles: Record<string, string> = {
  admin: 'bg-primary-subtle text-primary border-primary/20',
  support_agent: 'bg-accent-subtle text-accent border-accent/20',
  user: 'bg-surface text-muted border-border',
}

const kycStatusStyles: Record<string, { label: string; style: string }> = {
  approved: { label: 'Verified', style: 'bg-success-subtle text-success border-success/20' },
  submitted: { label: 'Review Pending', style: 'bg-warning-subtle text-warning border-warning/20' },
  under_review: { label: 'In Review', style: 'bg-primary-subtle text-primary border-primary/20' },
  rejected: { label: 'Rejected', style: 'bg-danger-subtle text-danger border-danger/20' },
  pending: { label: 'Unverified', style: 'bg-surface text-muted border-border' },
}

export default function UsersTable({
  initialUsers,
  totalCount,
}: {
  initialUsers: UserRow[]
  totalCount: number
}) {
  const [users, setUsers] = useState<UserRow[]>(initialUsers)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [kycFilter, setKycFilter] = useState('all')

  // SlideOver drawer state
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [userDetails, setUserDetails] = useState<UserDetailsState>(null)
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [detailsError, setDetailsError] = useState<string | null>(null)

  const [isPending, startTransition] = useTransition()
  const [actionFeedback, setActionFeedback] = useState<string | null>(null)

  const openUserDrawer = async (user: UserRow) => {
    setSelectedUserId(user.id)
    setUserDetails(null)
    setDetailsError(null)
    setActionFeedback(null)
    setLoadingDetails(true)

    const res = await getUserDetails(user.id)
    setLoadingDetails(false)
    if (res.error || !res.data) {
      setDetailsError(res.error || 'Failed to load details')
    } else {
      setUserDetails(res.data)
    }
  }

  const handleToggleStatus = (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'active' ? 'banned' : 'active'
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, status: nextStatus } : u)))

    startTransition(async () => {
      const res = await toggleUserStatus(id)
      if (!res.success) {
        setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, status: currentStatus } : u)))
        setActionFeedback('Failed to update status')
      } else {
        setActionFeedback(`User status updated to ${res.newStatus}`)
      }
    })
  }

  const handleRoleChange = (id: string, newRole: 'user' | 'support_agent') => {
    startTransition(async () => {
      const res = await updateUserSystemRole(id, newRole)
      if (res.success) {
        setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, role: newRole } : u)))
        setActionFeedback(`User role changed to ${newRole}`)
      } else {
        setActionFeedback(res.error || 'Failed to update role')
      }
    })
  }

  const filteredUsers = users.filter((u) => {
    if (roleFilter !== 'all' && u.role !== roleFilter) return false
    if (statusFilter !== 'all' && u.status !== statusFilter) return false
    if (kycFilter !== 'all' && u.kycStatus !== kycFilter) return false

    if (search.trim()) {
      const q = search.toLowerCase()
      return (
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.phone && u.phone.toLowerCase().includes(q)) ||
        (u.username && u.username.toLowerCase().includes(q)) ||
        u.id.toLowerCase().includes(q)
      )
    }

    return true
  })

  const selectedUser = users.find((u) => u.id === selectedUserId) || null

  return (
    <div className="space-y-4">
      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 text-xs font-semibold rounded-xl border border-border bg-surface text-foreground focus:ring-2 focus:ring-primary/20"
          >
            <option value="all">All Roles</option>
            <option value="user">Users</option>
            <option value="support_agent">Support Agents</option>
            <option value="admin">Admins</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs font-semibold rounded-xl border border-border bg-surface text-foreground focus:ring-2 focus:ring-primary/20"
          >
            <option value="all">All Status</option>
            <option value="active">Active Only</option>
            <option value="banned">Banned Only</option>
          </select>

          {/* KYC Filter */}
          <select
            value={kycFilter}
            onChange={(e) => setKycFilter(e.target.value)}
            className="px-3 py-2 text-xs font-semibold rounded-xl border border-border bg-surface text-foreground focus:ring-2 focus:ring-primary/20"
          >
            <option value="all">All KYC Status</option>
            <option value="approved">Verified</option>
            <option value="submitted">Review Pending</option>
            <option value="pending">Unverified</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            className="block w-full pl-9 pr-4 py-2 rounded-xl border border-border bg-surface text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
            placeholder="Search name, phone, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="glass-card rounded-2xl border border-border-subtle overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface/50">
                <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-muted uppercase tracking-wider">User</th>
                <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-muted uppercase tracking-wider">Contact</th>
                <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-muted uppercase tracking-wider">KYC Status</th>
                <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-muted uppercase tracking-wider">Reputation</th>
                <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-muted uppercase tracking-wider">System Role</th>
                <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-muted uppercase tracking-wider">Status</th>
                <th className="px-5 py-3.5 text-right text-[11px] font-semibold text-muted uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">
                    No users match your criteria.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const kycMeta = kycStatusStyles[user.kycStatus] || kycStatusStyles.pending

                  return (
                    <tr
                      key={user.id}
                      onClick={() => openUserDrawer(user)}
                      className="hover:bg-surface-elevated/60 transition-colors cursor-pointer"
                    >
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-9 w-9 flex-shrink-0 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/20 flex items-center justify-center font-bold text-primary text-sm">
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="ml-3">
                            <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                              {user.name}
                              {user.verified && <ShieldCheck className="w-3.5 h-3.5 text-success" />}
                            </div>
                            <div className="text-[11px] text-muted">{user.email}</div>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span className="text-xs text-foreground font-mono">{user.phone || '—'}</span>
                        {user.username && <div className="text-[10px] text-muted">@{user.username}</div>}
                      </td>

                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold border ${kycMeta.style}`}>
                          {kycMeta.label}
                        </span>
                      </td>

                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-1 text-xs font-semibold text-foreground">
                          <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                          <span>{user.rating.toFixed(1)}</span>
                          <span className="text-[11px] text-muted font-normal">
                            ({user.totalDeliveries}d / {user.totalTrips}t)
                          </span>
                        </div>
                      </td>

                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-[10px] font-semibold border uppercase tracking-wider ${roleStyles[user.role] || roleStyles.user}`}>
                          {user.role}
                        </span>
                      </td>

                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-semibold ${
                            user.status === 'active'
                              ? 'bg-success-subtle text-success border border-success/20'
                              : 'bg-danger-subtle text-danger border border-danger/20'
                          }`}
                        >
                          {user.status === 'active' ? 'Active' : 'Banned'}
                        </span>
                      </td>

                      <td className="px-5 py-3.5 whitespace-nowrap text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          {user.role !== 'admin' && (
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(user.id, user.status)}
                              className={`p-1.5 rounded-lg border transition-colors ${
                                user.status === 'active'
                                  ? 'text-danger hover:bg-danger-subtle border-border hover:border-danger/30'
                                  : 'text-success hover:bg-success-subtle border-border hover:border-success/30'
                              }`}
                              title={user.status === 'active' ? 'Ban User' : 'Unban User'}
                            >
                              {user.status === 'active' ? <Ban className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => openUserDrawer(user)}
                            className="p-1.5 rounded-lg border border-border text-muted hover:text-foreground hover:bg-surface-elevated transition-colors"
                            title="View Profile Details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground text-right">
        Showing {filteredUsers.length} of {totalCount} total users
      </p>

      {/* User Details SlideOver Drawer */}
      <SlideOver
        open={Boolean(selectedUserId)}
        onClose={() => {
          setSelectedUserId(null)
          setUserDetails(null)
          setActionFeedback(null)
        }}
        title="User Moderation Profile"
        subtitle={selectedUser ? `ID: ${selectedUser.id}` : undefined}
        width="md"
      >
        {selectedUser && (
          <div className="space-y-6 text-sm">
            {actionFeedback && (
              <div className="p-3 rounded-xl bg-primary-subtle border border-primary/20 text-primary text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {actionFeedback}
              </div>
            )}

            {/* Profile Overview Card */}
            <div className="glass-card p-5 rounded-2xl space-y-4">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary to-primary-hover text-white flex items-center justify-center font-bold text-xl shadow-md">
                  {selectedUser.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-base font-heading font-bold text-foreground flex items-center gap-1.5">
                    {selectedUser.name}
                    {selectedUser.verified && <ShieldCheck className="w-4 h-4 text-success" />}
                  </h3>
                  <p className="text-xs text-muted">{selectedUser.email}</p>
                  {selectedUser.phone && <p className="text-xs text-muted font-mono">{selectedUser.phone}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border-subtle text-xs">
                <div>
                  <span className="text-muted block text-[11px]">System Role:</span>
                  <span className="font-semibold text-foreground capitalize">{selectedUser.role}</span>
                </div>
                <div>
                  <span className="text-muted block text-[11px]">KYC Verification:</span>
                  <span className="font-semibold text-foreground capitalize">{selectedUser.kycStatus}</span>
                </div>
                <div>
                  <span className="text-muted block text-[11px]">Reputation Score:</span>
                  <span className="font-semibold text-foreground">{selectedUser.rating.toFixed(1)} ★</span>
                </div>
                <div>
                  <span className="text-muted block text-[11px]">Joined Date:</span>
                  <span className="font-semibold text-foreground">{selectedUser.joined}</span>
                </div>
              </div>
            </div>

            {/* Moderation Controls Card */}
            {selectedUser.role !== 'admin' && (
              <div className="glass-card p-5 rounded-2xl space-y-4 border-warning/20 bg-warning/5">
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Moderation Actions</h4>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-foreground">Account Access</p>
                      <p className="text-[11px] text-muted">
                        {selectedUser.status === 'active'
                          ? 'User is active and can log in.'
                          : 'User is banned from accessing the platform.'}
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleToggleStatus(selectedUser.id, selectedUser.status)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                        selectedUser.status === 'active'
                          ? 'bg-danger text-white hover:bg-danger/90'
                          : 'bg-success text-white hover:bg-success/90'
                      }`}
                    >
                      {selectedUser.status === 'active' ? 'Ban User' : 'Reactivate User'}
                    </button>
                  </div>

                  <div className="pt-3 border-t border-border-subtle flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-foreground">Support Agent Role</p>
                      <p className="text-[11px] text-muted">Assign support agent permissions to this user.</p>
                    </div>

                    {selectedUser.role === 'support_agent' ? (
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handleRoleChange(selectedUser.id, 'user')}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-surface-elevated border border-border text-foreground hover:bg-surface-elevated/80"
                      >
                        Demote to User
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handleRoleChange(selectedUser.id, 'support_agent')}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary-hover"
                      >
                        Promote to Support
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Activity Summary Card */}
            <div className="glass-card p-5 rounded-2xl space-y-3">
              <h4 className="text-xs font-bold text-muted uppercase tracking-wider">Activity Summary</h4>

              {loadingDetails ? (
                <div className="py-6 flex items-center justify-center gap-2 text-xs text-muted">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  Loading activity telemetry...
                </div>
              ) : userDetails ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="p-3 rounded-xl bg-surface border border-border-subtle">
                      <p className="text-lg font-heading font-bold text-foreground">{userDetails.tripsCount}</p>
                      <p className="text-[10px] text-muted uppercase tracking-wider">Trips Posted</p>
                    </div>
                    <div className="p-3 rounded-xl bg-surface border border-border-subtle">
                      <p className="text-lg font-heading font-bold text-foreground">{userDetails.parcelsCount}</p>
                      <p className="text-[10px] text-muted uppercase tracking-wider">Parcels Posted</p>
                    </div>
                    <div className="p-3 rounded-xl bg-surface border border-border-subtle">
                      <p className="text-lg font-heading font-bold text-foreground">{userDetails.requestsCount}</p>
                      <p className="text-[10px] text-muted uppercase tracking-wider">Requests</p>
                    </div>
                  </div>

                  {userDetails.kycSession && (
                    <div className="p-3 rounded-xl bg-surface border border-border-subtle flex items-center justify-between text-xs">
                      <div>
                        <p className="font-semibold text-foreground">KYC Session #{userDetails.kycSession.id.slice(0, 8)}</p>
                        <p className="text-[11px] text-muted">Status: {userDetails.kycSession.status} · ID: {userDetails.kycSession.id_type}</p>
                      </div>
                      <Link
                        href={`/dashboard/kyc/${userDetails.kycSession.id}`}
                        className="inline-flex items-center gap-1 text-primary text-xs font-semibold hover:underline"
                      >
                        Inspect Docs <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted">{detailsError || 'Click details to inspect user activity.'}</p>
              )}
            </div>
          </div>
        )}
      </SlideOver>
    </div>
  )
}
