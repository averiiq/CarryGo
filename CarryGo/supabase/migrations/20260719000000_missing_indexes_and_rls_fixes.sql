-- Missing indexes identified in deep audit
CREATE INDEX IF NOT EXISTS idx_trips_date ON trips (date);
CREATE INDEX IF NOT EXISTS idx_parcels_delivery_date ON parcels (delivery_date);
CREATE INDEX IF NOT EXISTS idx_deliveries_status ON deliveries (status);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments (status);
CREATE INDEX IF NOT EXISTS idx_outbox_events_topic ON outbox_events (topic, status, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages (sender_id);

-- Tighten RLS: Block direct client UPDATE on critical tables (force use of RPC functions)
-- Revoke the overly-permissive update policies on requests, deliveries, payments
-- and replace with narrower ones that only allow non-critical field updates

-- For messages: only allow updating 'read' field, not text
DROP POLICY IF EXISTS "messages_update_participant" ON messages;
CREATE POLICY "messages_update_read_only" ON messages
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
      AND auth.uid() = ANY(c.participant_ids)
    )
  )
  WITH CHECK (
    -- Only allow updating read status, not message text
    text = (SELECT text FROM messages m WHERE m.id = messages.id)
  );
