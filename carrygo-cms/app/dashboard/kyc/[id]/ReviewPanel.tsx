'use client'

import { useState, useTransition } from 'react'
import { Check, X, RotateCcw, MessageSquare } from 'lucide-react'
import {
  approveKycSession,
  rejectKycSession,
  requestResubmission,
  addReviewerNote,
} from './actions'

type ReviewHistoryItem = {
  id: string
  action: string
  reason: string | null
  notes: string | null
  created_at: string
  reviewer_id: string
}

type ReviewPanelProps = {
  sessionId: string
  userName: string
  userEmail: string
  userSignupDate: string
  submissionDate: string
  attemptNumber: number
  currentStatus: string
  reviewerNotes: string | null
  reviewHistory: ReviewHistoryItem[]
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'submitted':
      return { bg: 'bg-amber-100', text: 'text-amber-800', label: 'Submitted' }
    case 'approved':
      return { bg: 'bg-green-100', text: 'text-green-800', label: 'Approved' }
    case 'rejected':
      return { bg: 'bg-danger-subtle', text: 'text-danger', label: 'Rejected' }
    case 'pending':
      return { bg: 'bg-surface', text: 'text-foreground', label: 'Pending' }
    default:
      return { bg: 'bg-surface', text: 'text-muted', label: status }
  }
}

function getActionLabel(action: string): string {
  switch (action) {
    case 'approved':
      return 'Approved'
    case 'rejected':
      return 'Rejected'
    case 'resubmission_requested':
      return 'Resubmission Requested'
    case 'note_added':
      return 'Note Added'
    default:
      return action
  }
}

function getActionColor(action: string): string {
  switch (action) {
    case 'approved':
      return 'text-green-700 bg-green-50 border-green-200'
    case 'rejected':
      return 'text-danger bg-danger-subtle border-danger/20'
    case 'resubmission_requested':
      return 'text-amber-700 bg-amber-50 border-amber-200'
    case 'note_added':
      return 'text-primary bg-primary-subtle border-primary/20'
    default:
      return 'text-foreground bg-background border-border'
  }
}

export default function ReviewPanel({
  sessionId,
  userName,
  userEmail,
  userSignupDate,
  submissionDate,
  attemptNumber,
  currentStatus,
  reviewerNotes,
  reviewHistory,
}: ReviewPanelProps) {
  const [isPending, startTransition] = useTransition()
  const [rejectionReason, setRejectionReason] = useState('')
  const [resubmissionReason, setResubmissionReason] = useState('')
  const [internalNote, setInternalNote] = useState(reviewerNotes || '')
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [showResubmitForm, setShowResubmitForm] = useState(false)
  const [confirmApprove, setConfirmApprove] = useState(false)
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const statusBadge = getStatusBadge(currentStatus)

  const handleApprove = () => {
    if (!confirmApprove) {
      setConfirmApprove(true)
      return
    }

    startTransition(async () => {
      const result = await approveKycSession(sessionId)
      if (result.success) {
        setActionMessage({ type: 'success', text: 'KYC session approved successfully' })
        setConfirmApprove(false)
      } else {
        setActionMessage({ type: 'error', text: result.error })
        setConfirmApprove(false)
      }
    })
  }

  const handleReject = () => {
    if (rejectionReason.length < 10) {
      setActionMessage({ type: 'error', text: 'Rejection reason must be at least 10 characters' })
      return
    }

    startTransition(async () => {
      const result = await rejectKycSession(sessionId, rejectionReason)
      if (result.success) {
        setActionMessage({ type: 'success', text: 'KYC session rejected' })
        setShowRejectForm(false)
        setRejectionReason('')
      } else {
        setActionMessage({ type: 'error', text: result.error })
      }
    })
  }

  const handleResubmission = () => {
    if (resubmissionReason.length < 10) {
      setActionMessage({ type: 'error', text: 'Reason must be at least 10 characters' })
      return
    }

    startTransition(async () => {
      const result = await requestResubmission(sessionId, resubmissionReason)
      if (result.success) {
        setActionMessage({ type: 'success', text: 'Resubmission requested' })
        setShowResubmitForm(false)
        setResubmissionReason('')
      } else {
        setActionMessage({ type: 'error', text: result.error })
      }
    })
  }

  const handleSaveNote = () => {
    if (internalNote.trim().length === 0) {
      setActionMessage({ type: 'error', text: 'Note cannot be empty' })
      return
    }

    startTransition(async () => {
      const result = await addReviewerNote(sessionId, internalNote)
      if (result.success) {
        setActionMessage({ type: 'success', text: 'Note saved' })
      } else {
        setActionMessage({ type: 'error', text: result.error })
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Action Message */}
      {actionMessage && (
        <div
          className={`p-3 rounded-lg text-sm font-medium ${
            actionMessage.type === 'success'
              ? 'bg-success-subtle text-success border border-success/20'
              : 'bg-danger-subtle text-danger border border-danger/20'
          }`}
        >
          {actionMessage.text}
        </div>
      )}

      {/* User Info Card */}
      <div className="bg-surface-solid rounded-xl border border-border shadow-sm p-6">
        <h3 className="text-sm font-semibold text-foreground mb-4">User Information</h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Name</span>
            <span className="text-sm font-medium text-foreground">{userName}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Email</span>
            <span className="text-sm font-medium text-foreground">{userEmail}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Signed up</span>
            <span className="text-sm text-foreground">{userSignupDate}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Submitted</span>
            <span className="text-sm text-foreground">{submissionDate}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Attempt</span>
            <span className="text-sm text-foreground">#{attemptNumber}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Status</span>
            <span
              className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusBadge.bg} ${statusBadge.text}`}
            >
              {statusBadge.label}
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="bg-surface-solid rounded-xl border border-border shadow-sm p-6">
        <h3 className="text-sm font-semibold text-foreground mb-4">Actions</h3>
        <div className="space-y-3">
          {/* Approve */}
          <button
            onClick={handleApprove}
            disabled={isPending || currentStatus === 'approved'}
            className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              confirmApprove
                ? 'bg-green-700 text-white hover:bg-green-800'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            <Check className="w-4 h-4" />
            {confirmApprove ? 'Click again to confirm approval' : 'Approve'}
          </button>

          {/* Reject */}
          {!showRejectForm ? (
            <button
              onClick={() => {
                setShowRejectForm(true)
                setShowResubmitForm(false)
                setConfirmApprove(false)
              }}
              disabled={isPending || currentStatus === 'rejected'}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <X className="w-4 h-4" />
              Reject
            </button>
          ) : (
            <div className="border border-red-200 rounded-lg p-3 space-y-3">
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Enter rejection reason (min 10 characters)..."
                rows={3}
                className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleReject}
                  disabled={isPending || rejectionReason.length < 10}
                  className="flex-1 px-3 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Confirm Rejection
                </button>
                <button
                  onClick={() => {
                    setShowRejectForm(false)
                    setRejectionReason('')
                  }}
                  className="px-3 py-2 text-sm font-medium text-muted border border-border rounded-lg hover:bg-surface-elevated transition-colors"
                >
                  Cancel
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                {rejectionReason.length}/10 minimum characters
              </p>
            </div>
          )}

          {/* Request Resubmission */}
          {!showResubmitForm ? (
            <button
              onClick={() => {
                setShowResubmitForm(true)
                setShowRejectForm(false)
                setConfirmApprove(false)
              }}
              disabled={isPending}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-amber-500 text-white hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RotateCcw className="w-4 h-4" />
              Request Resubmission
            </button>
          ) : (
            <div className="border border-amber-200 rounded-lg p-3 space-y-3">
              <textarea
                value={resubmissionReason}
                onChange={(e) => setResubmissionReason(e.target.value)}
                placeholder="Describe what needs to be resubmitted (min 10 characters)..."
                rows={3}
                className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleResubmission}
                  disabled={isPending || resubmissionReason.length < 10}
                  className="flex-1 px-3 py-2 text-sm font-medium bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Send Request
                </button>
                <button
                  onClick={() => {
                    setShowResubmitForm(false)
                    setResubmissionReason('')
                  }}
                  className="px-3 py-2 text-sm font-medium text-muted border border-border rounded-lg hover:bg-surface-elevated transition-colors"
                >
                  Cancel
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                {resubmissionReason.length}/10 minimum characters
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Internal Notes */}
      <div className="bg-surface-solid rounded-xl border border-border shadow-sm p-6">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-muted-foreground" />
          Internal Notes
        </h3>
        <p className="text-xs text-muted-foreground mb-3">Not visible to the user</p>
        <textarea
          value={internalNote}
          onChange={(e) => setInternalNote(e.target.value)}
          placeholder="Add internal reviewer notes..."
          rows={4}
          className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
        />
        <button
          onClick={handleSaveNote}
          disabled={isPending || internalNote.trim().length === 0}
          className="mt-3 px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Save Note
        </button>
      </div>

      {/* Review History Timeline */}
      <div className="bg-surface-solid rounded-xl border border-border shadow-sm p-6">
        <h3 className="text-sm font-semibold text-foreground mb-4">Review History</h3>
        {reviewHistory.length === 0 ? (
          <p className="text-sm text-muted-foreground">No review actions yet</p>
        ) : (
          <div className="space-y-3">
            {reviewHistory.map((item) => (
              <div
                key={item.id}
                className={`border rounded-lg p-3 ${getActionColor(item.action)}`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="text-xs font-semibold">
                    {getActionLabel(item.action)}
                  </span>
                  <span className="text-xs opacity-70">
                    {new Date(item.created_at).toLocaleString()}
                  </span>
                </div>
                {item.reason && (
                  <p className="text-xs mt-1 opacity-80">Reason: {item.reason}</p>
                )}
                {item.notes && (
                  <p className="text-xs mt-1 opacity-80">Note: {item.notes}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
