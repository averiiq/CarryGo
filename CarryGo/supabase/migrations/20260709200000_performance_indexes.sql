-- Performance indexes for frequently-queried patterns

-- Requests: user's incoming requests (traveller view)
CREATE INDEX IF NOT EXISTS idx_requests_traveller_status
  ON requests(traveller_id, status, created_at DESC);

-- Requests: user's outgoing requests (sender view)
CREATE INDEX IF NOT EXISTS idx_requests_sender_status
  ON requests(sender_id, status, created_at DESC);

-- Messages: unread count per conversation
CREATE INDEX IF NOT EXISTS idx_messages_conversation_read
  ON messages(conversation_id, read, created_at DESC);

-- Deliveries: lookup by request
CREATE INDEX IF NOT EXISTS idx_deliveries_request_id
  ON deliveries(request_id);

-- Payments: lookup by request
CREATE INDEX IF NOT EXISTS idx_payments_request_id
  ON payments(request_id);

-- User profiles: push token lookup for notifications
CREATE INDEX IF NOT EXISTS idx_user_profiles_push_token
  ON user_profiles(push_token) WHERE push_token IS NOT NULL;

-- Trips: user's own trips
CREATE INDEX IF NOT EXISTS idx_trips_user_status
  ON trips(user_id, status, created_at DESC);

-- Parcels: user's own parcels
CREATE INDEX IF NOT EXISTS idx_parcels_user_status
  ON parcels(user_id, status, created_at DESC);
