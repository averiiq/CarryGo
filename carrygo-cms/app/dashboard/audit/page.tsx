import { requireAdmin } from '@/utils/admin-guard'
import { redirect } from 'next/navigation'
import AuditLog from '@/components/AuditLog'

export default async function AuditPage() {
  const auth = await requireAdmin()
  if ('error' in auth) redirect('/login')
  const supabase = auth.supabase

  const { data: auditEntries, error } = await supabase
    .from('audit_events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) throw new Error(`Unable to load audit events: ${error.message}`)

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

  return (
    <div className="space-y-6">

      <AuditLog entries={entries} />
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
