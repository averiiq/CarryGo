-- Add Razorpay transaction tracking columns to payments table
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS razorpay_order_id TEXT,
  ADD COLUMN IF NOT EXISTS razorpay_payment_id TEXT;

-- Index for looking up payments by Razorpay order ID
CREATE INDEX IF NOT EXISTS idx_payments_razorpay_order_id
  ON payments (razorpay_order_id)
  WHERE razorpay_order_id IS NOT NULL;
