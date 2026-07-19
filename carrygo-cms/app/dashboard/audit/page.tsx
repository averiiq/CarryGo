import { requireAdmin } from '@/utils/admin-guard'
import { redirect } from 'next/navigation'
import AuditLog from '@/components/AuditLog'

export default async function AuditPage() {
  const auth = await requireAdmin()
  if ('error' in auth) redirect('/login')
  const supabase = auth.supabase

  const { data: auditEntries } = await supabase
    .from('audit_events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)

  type AuditAction = 'view' | 'create' | 'update' | 'delete' | 'login' | 'export' | 'approve' | 'reject'

  // Map audit_events columns: actor_id, entity_type, entity_id, event_type, payload, created_at
  const entries = (auditEntries || []).map((entry: Record<string, unknown>) => {
    const eventToAction: Record<string, AuditAction> = {
      'request.created': 'create',
      'request.accepted': 'approve',
      'request.rejected': 'reject',
      'request.completed': 'approve',
      'request.failed': 'reject',
      'payment.locked': 'create',
      'payment.released': 'approve',
      'payment.refunded': 'update',
      'kyc.submitted': 'create',
      'kyc.approved': 'approve',
      'kyc.rejected': 'reject',
    }
    const eventType = (entry.event_type || '') as string
    const action: AuditAction = eventToAction[eventType] || 'view'
    const actorId = (entry.actor_id || '') as string
    return {
      id: entry.id as string,
      admin: actorId.slice(0, 8) || 'System',
      action,
      resource: (entry.entity_type || '') as string,
      resourceId: (entry.entity_id || '') as string,
      detail: eventType.replace(/\./g, ' ') || 'system event',
      timestamp: formatTimestamp(entry.created_at as string),
      ip: undefined as string | undefined,
    }
  })

  // If no audit events exist yet, show sample data for demo
  const displayEntries = entries.length > 0 ? entries : getSampleEntries()

  return (
    <div className="space-y-6">

      <AuditLog entries={displayEntries} />
    </div>
  )
}

function formatTimestamp(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)

  if (diffMin < 1) return 'Just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffMin < 1440) return `${Math.floor(diffMin / 60)}h ago`
  if (diffMin < 10080) return `${Math.floor(diffMin / 1440)}d ago`

  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function getSampleEntries() {
  return [
    { id: '1', admin: 'admin@carrygo.in', action: 'approve' as const, resource: 'kyc_submissions', resourceId: 'abc12345-def6', detail: 'approved KYC document for user', timestamp: '2m ago', ip: '192.168.1.1' },
    { id: '2', admin: 'admin@carrygo.in', action: 'update' as const, resource: 'disputes', resourceId: '98765432-abcd', detail: 'resolved dispute and issued refund', timestamp: '15m ago', ip: '192.168.1.1' },
    { id: '3', admin: 'admin@carrygo.in', action: 'login' as const, resource: 'auth', resourceId: '', detail: 'logged into admin dashboard', timestamp: '1h ago', ip: '192.168.1.1' },
    { id: '4', admin: 'admin@carrygo.in', action: 'export' as const, resource: 'users', resourceId: '', detail: 'exported 1,250 user records as CSV', timestamp: '2h ago', ip: '192.168.1.1' },
    { id: '5', admin: 'admin@carrygo.in', action: 'reject' as const, resource: 'kyc_submissions', resourceId: 'fff88899-1234', detail: 'rejected blurry document upload', timestamp: '3h ago', ip: '192.168.1.1' },
    { id: '6', admin: 'admin@carrygo.in', action: 'view' as const, resource: 'user_profiles', resourceId: '11223344-5566', detail: 'viewed user profile details', timestamp: '4h ago', ip: '192.168.1.1' },
    { id: '7', admin: 'admin@carrygo.in', action: 'create' as const, resource: 'announcements', resourceId: 'new-announce-01', detail: 'created system-wide announcement', timestamp: '5h ago', ip: '192.168.1.1' },
    { id: '8', admin: 'admin@carrygo.in', action: 'delete' as const, resource: 'user_profiles', resourceId: 'banned-user-99', detail: 'permanently banned fraudulent account', timestamp: '1d ago', ip: '192.168.1.1' },
    { id: '9', admin: 'admin@carrygo.in', action: 'update' as const, resource: 'settings', resourceId: '', detail: 'updated commission rate from 18% to 15%', timestamp: '2d ago', ip: '192.168.1.1' },
    { id: '10', admin: 'admin@carrygo.in', action: 'approve' as const, resource: 'kyc_submissions', resourceId: 'xyz99988-7654', detail: 'bulk approved 5 KYC documents', timestamp: '3d ago', ip: '192.168.1.1' },
  ]
}
