'use client'

import { useState } from 'react'
import { Users, Navigation, CheckCircle2, XCircle, Download, Loader2 } from 'lucide-react'
import DataTable, { type Column } from '@/components/DataTable'
import BulkActionBar from '@/components/BulkActionBar'
import ExportButton from '@/components/ExportButton'
import { bulkVerifyUsers, bulkCancelExpiredTrips } from './actions'

interface UnverifiedUser {
  id: string
  name: string
  email: string
  createdAt: string
  kycStatus: string
}

interface ExpiredTrip {
  id: string
  userName: string
  fromCity: string
  toCity: string
  date: string
  status: string
}

interface BulkOperationsProps {
  unverifiedUsers: UnverifiedUser[]
  expiredTrips: ExpiredTrip[]
}

const userColumns: Column<UnverifiedUser>[] = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'email', label: 'Email', sortable: true },
  { key: 'kycStatus', label: 'KYC Status', render: (v) => (
    <span className="text-xs font-semibold text-warning bg-warning-subtle px-2.5 py-1 rounded-lg">
      {String(v)}
    </span>
  )},
  { key: 'createdAt', label: 'Joined', sortable: true, render: (v) => new Date(String(v)).toLocaleDateString() },
]

const tripColumns: Column<ExpiredTrip>[] = [
  { key: 'userName', label: 'User', sortable: true },
  { key: 'fromCity', label: 'From', sortable: true },
  { key: 'toCity', label: 'To', sortable: true },
  { key: 'date', label: 'Date', sortable: true },
  { key: 'status', label: 'Status', render: () => (
    <span className="text-xs font-semibold text-danger bg-danger-subtle px-2.5 py-1 rounded-lg">
      Expired
    </span>
  )},
]

export default function BulkOperations({ unverifiedUsers, expiredTrips }: BulkOperationsProps) {
  const [activeTab, setActiveTab] = useState<'users' | 'trips'>('users')
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
  const [selectedTripIds, setSelectedTripIds] = useState<string[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [result, setResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const handleUserAction = async (actionKey: string) => {
    if (actionKey === 'verify' && selectedUserIds.length > 0) {
      setIsProcessing(true)
      const res = await bulkVerifyUsers(selectedUserIds)
      setIsProcessing(false)
      if (res.error) {
        setResult({ type: 'error', message: res.error })
      } else {
        setResult({ type: 'success', message: `${selectedUserIds.length} users verified successfully` })
        setSelectedUserIds([])
      }
    }
  }

  const handleCancelExpired = async () => {
    setIsProcessing(true)
    const res = await bulkCancelExpiredTrips()
    setIsProcessing(false)
    if (res.error) {
      setResult({ type: 'error', message: res.error })
    } else {
      setResult({ type: 'success', message: `${res.count ?? 0} expired trips cancelled` })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-1 bg-surface rounded-xl p-1 w-fit">
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
            activeTab === 'users'
              ? 'bg-surface text-foreground shadow-sm'
              : 'text-muted hover:text-foreground'
          }`}
        >
          <Users className="h-4 w-4" />
          Unverified Users ({unverifiedUsers.length})
        </button>
        <button
          onClick={() => setActiveTab('trips')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
            activeTab === 'trips'
              ? 'bg-surface text-foreground shadow-sm'
              : 'text-muted hover:text-foreground'
          }`}
        >
          <Navigation className="h-4 w-4" />
          Expired Trips ({expiredTrips.length})
        </button>
      </div>

      {result && (
        <div className={`flex items-center gap-2 p-3 rounded-xl text-sm font-medium ${
          result.type === 'success' ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'
        }`}>
          {result.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
          {result.message}
          <button onClick={() => setResult(null)} className="ml-auto text-xs font-semibold hover:underline">Dismiss</button>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted">
              Users awaiting KYC verification. Select and verify in bulk.
            </p>
            <ExportButton
              data={unverifiedUsers}
              columns={[
                { key: 'name', label: 'Name' },
                { key: 'email', label: 'Email' },
                { key: 'kycStatus', label: 'KYC Status' },
                { key: 'createdAt', label: 'Joined' },
              ]}
              filename="unverified-users"
              label="Export"
            />
          </div>
          <DataTable
            data={unverifiedUsers}
            columns={userColumns}
            selectable
            onSelectionChange={setSelectedUserIds}
            searchPlaceholder="Search users..."
            emptyMessage="All users are verified"
          />
          <BulkActionBar
            selectedCount={selectedUserIds.length}
            actions={[
              { key: 'verify', label: 'Verify All', icon: CheckCircle2, variant: 'success' },
              { key: 'export', label: 'Export Selected', icon: Download, variant: 'default' },
            ]}
            onAction={handleUserAction}
            onClear={() => setSelectedUserIds([])}
          />
        </div>
      )}

      {activeTab === 'trips' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted">
              Trips past their departure date still marked active.
            </p>
            <div className="flex items-center gap-2">
              <ExportButton
                data={expiredTrips}
                columns={[
                  { key: 'userName', label: 'User' },
                  { key: 'fromCity', label: 'From' },
                  { key: 'toCity', label: 'To' },
                  { key: 'date', label: 'Date' },
                ]}
                filename="expired-trips"
                label="Export"
              />
              <button
                onClick={handleCancelExpired}
                disabled={isProcessing || expiredTrips.length === 0}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-danger rounded-xl hover:bg-danger/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                Cancel All Expired ({expiredTrips.length})
              </button>
            </div>
          </div>
          <DataTable
            data={expiredTrips}
            columns={tripColumns}
            searchPlaceholder="Search trips..."
            emptyMessage="No expired trips found"
          />
        </div>
      )}
    </div>
  )
}
