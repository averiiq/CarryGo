-- Add exponential backoff to outbox event processing
-- Events that fail are retried with increasing delays instead of being stuck forever

-- Add max_attempts and last_error columns for better retry tracking
ALTER TABLE outbox_events ADD COLUMN IF NOT EXISTS max_attempts integer NOT NULL DEFAULT 5;
ALTER TABLE outbox_events ADD COLUMN IF NOT EXISTS last_error text;

-- Update process_outbox_events to implement exponential backoff
CREATE OR REPLACE FUNCTION process_outbox_events(p_limit integer DEFAULT 50)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_processed integer := 0;
  v_event record;
BEGIN
  FOR v_event IN
    SELECT id, topic, entity_type, entity_id, payload, attempt_count
    FROM outbox_events
    WHERE status IN ('pending', 'failed')
      AND attempt_count < max_attempts
      AND available_at <= now()
    ORDER BY created_at ASC
    LIMIT p_limit
    FOR UPDATE SKIP LOCKED
  LOOP
    -- Mark as processing
    UPDATE outbox_events SET status = 'processing' WHERE id = v_event.id;

    BEGIN
      -- Process based on topic (insert notification)
      IF v_event.topic LIKE 'request.%' OR v_event.topic LIKE 'delivery.%' OR v_event.topic LIKE 'rating.%' OR v_event.topic = 'chat.message' OR v_event.topic = 'route.match' THEN
        INSERT INTO notifications (user_id, title, body, type, related_id)
        SELECT
          (v_event.payload->>'recipient_id')::uuid,
          v_event.payload->>'title',
          v_event.payload->>'body',
          (v_event.payload->>'notification_type')::notification_type,
          v_event.entity_id
        WHERE v_event.payload->>'recipient_id' IS NOT NULL;
      END IF;

      -- Mark as processed
      UPDATE outbox_events
      SET status = 'processed', processed_at = now()
      WHERE id = v_event.id;

      v_processed := v_processed + 1;
    EXCEPTION WHEN OTHERS THEN
      -- Exponential backoff: 30s, 2min, 8min, 32min, 2h
      UPDATE outbox_events
      SET
        status = 'failed',
        attempt_count = attempt_count + 1,
        last_error = SQLERRM,
        available_at = now() + (power(4, attempt_count) * interval '30 seconds')
      WHERE id = v_event.id;
    END;
  END LOOP;

  RETURN v_processed;
END;
$$;

-- Dead-letter: Move permanently failed events out of the hot path
CREATE TABLE IF NOT EXISTS outbox_dead_letters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  original_event_id uuid NOT NULL,
  topic text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}',
  attempt_count integer NOT NULL,
  last_error text,
  failed_at timestamptz NOT NULL DEFAULT now()
);

-- Function to move dead events to dead-letter table
CREATE OR REPLACE FUNCTION sweep_dead_outbox_events()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count integer;
BEGIN
  WITH moved AS (
    DELETE FROM outbox_events
    WHERE status = 'failed' AND attempt_count >= max_attempts
    RETURNING id, topic, entity_type, entity_id, payload, attempt_count, last_error
  )
  INSERT INTO outbox_dead_letters (original_event_id, topic, entity_type, entity_id, payload, attempt_count, last_error)
  SELECT id, topic, entity_type, entity_id, payload, attempt_count, last_error
  FROM moved;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- Schedule dead-letter sweep (if pg_cron is available)
-- SELECT cron.schedule('sweep-dead-outbox', '0 * * * *', 'SELECT sweep_dead_outbox_events()');
