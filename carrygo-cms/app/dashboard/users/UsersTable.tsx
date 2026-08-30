'use client'

import { useState } from 'react'
import { Search, Ban, UserCheck } from 'lucide-react'
import { toggleUserStatus } from './actions'

type UserRow = {
  id: string
  name: string
  email: string
  role: string
  status: string
  joined: string
}

const roleStyles: Record<string, string> = {
  admin: 'bg-primary-subtle text-primary',
  support_agent: 'bg-accent-subtle text-accent',
}

export default function UsersTable({ initialUsers }: { initialUsers: UserRow[] }) {
  const [users, setUsers] = useState(initialUsers)
  const [search, setSearch] = useState('')

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  )

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'banned' : 'active'
    setUsers(users.map((u) => (u.id === id ? { ...u, status: newStatus } : u)))

    const res = await toggleUserStatus(id)
    if (!res.success) {
      setUsers(users.map((u) => (u.id === id ? { ...u, status: currentStatus } : u)))
    }
  }

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground tracking-tight">User Management</h1>
          <p className="text-sm text-muted mt-1">View and manage all CarryGo users.</p>
        </div>

        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            className="block w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-surface text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="rounded-2xl bg-surface shadow-[var(--shadow-bento)] border border-border-subtle overflow-hidden">
        <table className="min-w-full">
          <thead>
            <tr className="border-b border-border-subtle bg-surface">
              <th className="px-6 py-4 text-left text-xs font-semibold text-muted uppercase tracking-wider">Name</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-muted uppercase tracking-wider">Role</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-muted uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-muted uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">
                  No users found.
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-surface transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-9 w-9 flex-shrink-0 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center font-bold text-primary text-sm">
                        {user.name.charAt(0)}
                      </div>
                      <div className="ml-3">
                        <div className="text-sm font-medium text-foreground">{user.name}</div>
                        <div className="text-xs text-muted">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold ${roleStyles[user.role] || 'bg-surface text-muted'}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold ${
                      user.status === 'active' ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'
                    }`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    {user.role !== 'admin' && (
                      <button
                        onClick={() => handleToggleStatus(user.id, user.status)}
                        className={`p-2 rounded-xl transition-colors ${
                          user.status === 'active'
                            ? 'text-danger hover:bg-danger-subtle'
                            : 'text-success hover:bg-success-subtle'
                        }`}
                        title={user.status === 'active' ? 'Ban User' : 'Unban User'}
                      >
                        {user.status === 'active' ? (
                          <Ban className="w-4 h-4" />
                        ) : (
                          <UserCheck className="w-4 h-4" />
                        )}
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}
