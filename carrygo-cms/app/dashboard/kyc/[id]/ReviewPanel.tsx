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
      return { bg: 'bg-red-100', text: 'text-red-800', label: 'Rejected' }
    case 'pending':
      return { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Pending' }
    default:
      return { bg: 'bg-gray-100', text: 'text-gray-600', label: status }
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
      return 'text-red-700 bg-red-50 border-red-200'
    case 'resubmission_requested':
      return 'text-amber-700 bg-amber-50 border-amber-200'
    case 'note_added':
      return 'text-blue-700 bg-blue-50 border-blue-200'
    default:
      return 'text-gray-700 bg-gray-50 border-gray-200'
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
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {actionMessage.text}
        </div>
      )}

      {/* User Info Card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">User Information</h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">Name</span>
            <span className="text-sm font-medium text-gray-900">{userName}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">Email</span>
            <span className="text-sm font-medium text-gray-900">{userEmail}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">Signed up</span>
            <span className="text-sm text-gray-700">{userSignupDate}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">Submitted</span>
            <span className="text-sm text-gray-700">{submissionDate}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">Attempt</span>
            <span className="text-sm text-gray-700">#{attemptNumber}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">Status</span>
            <span
              className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusBadge.bg} ${statusBadge.text}`}
            >
              {statusBadge.label}
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Actions</h3>
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
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
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
                  className="px-3 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
              <p className="text-xs text-gray-400">
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
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
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
                  className="px-3 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
              <p className="text-xs text-gray-400">
                {resubmissionReason.length}/10 minimum characters
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Internal Notes */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-gray-500" />
          Internal Notes
        </h3>
        <p className="text-xs text-gray-400 mb-3">Not visible to the user</p>
        <textarea
          value={internalNote}
          onChange={(e) => setInternalNote(e.target.value)}
          placeholder="Add internal reviewer notes..."
          rows={4}
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
        />
        <button
          onClick={handleSaveNote}
          disabled={isPending || internalNote.trim().length === 0}
          className="mt-3 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Save Note
        </button>
      </div>

      {/* Review History Timeline */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Review History</h3>
        {reviewHistory.length === 0 ? (
          <p className="text-sm text-gray-400">No review actions yet</p>
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
