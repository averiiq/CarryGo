-- ═══════════════════════════════════════════════════════════════════════════
-- PROMOTIONAL BANNERS CMS TABLE & POLICIES
-- Allows CMS / Admin panel to create, edit, reorder, toggle, and delete
-- promotional banners displayed in the CarryGo mobile application.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.promotional_banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL DEFAULT 'urgent' CHECK (type IN ('urgent', 'corridor', 'kyc', 'announcement', 'discount')),
  badge_text TEXT NOT NULL,
  badge_color TEXT NOT NULL DEFAULT '#F59E0B',
  title TEXT NOT NULL,
  subtitle TEXT NOT NULL,
  cta_text TEXT NOT NULL DEFAULT 'Learn More',
  cta_action TEXT NOT NULL DEFAULT 'create_parcel' CHECK (cta_action IN ('create_parcel', 'create_trip', 'open_kyc', 'matching', 'link', 'none')),
  deep_link TEXT,
  image_url TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  starts_at TIMESTAMPTZ DEFAULT now(),
  ends_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for speedy ordering and active filtering
CREATE INDEX IF NOT EXISTS idx_promotional_banners_active_order 
  ON public.promotional_banners(is_active, display_order ASC);

-- Enable RLS
ALTER TABLE public.promotional_banners ENABLE ROW LEVEL SECURITY;

-- 1. Public & Authenticated users can view active banners within valid date ranges
CREATE POLICY "promotional_banners_select_active" 
  ON public.promotional_banners
  FOR SELECT
  USING (
    is_active = true 
    AND (starts_at IS NULL OR starts_at <= now()) 
    AND (ends_at IS NULL OR ends_at >= now())
  );

-- 2. Admin & Support can view all banners (including inactive and scheduled)
CREATE POLICY "promotional_banners_select_admin" 
  ON public.promotional_banners
  FOR SELECT 
  TO authenticated
  USING (public.get_system_role() IN ('admin', 'support_agent'));

-- 3. Admin can insert, update, and delete banners
CREATE POLICY "promotional_banners_insert_admin" 
  ON public.promotional_banners
  FOR INSERT 
  TO authenticated
  WITH CHECK (public.get_system_role() = 'admin');

CREATE POLICY "promotional_banners_update_admin" 
  ON public.promotional_banners
  FOR UPDATE 
  TO authenticated
  USING (public.get_system_role() = 'admin')
  WITH CHECK (public.get_system_role() = 'admin');

CREATE POLICY "promotional_banners_delete_admin" 
  ON public.promotional_banners
  FOR DELETE 
  TO authenticated
  USING (public.get_system_role() = 'admin');

-- Seed initial curated banners so the CMS and mobile app have immediate data
INSERT INTO public.promotional_banners (
  id,
  type,
  badge_text,
  badge_color,
  title,
  subtitle,
  cta_text,
  cta_action,
  image_url,
  display_order,
  is_active
) VALUES 
(
  'b0000000-0000-4000-8000-000000000001',
  'urgent',
  '⚡ SAME-DAY EXPRESS',
  '#F59E0B',
  'Urgent Same-Day Delivery',
  'Send or carry urgent documents & essentials with travellers leaving today.',
  'Send Parcel',
  'create_parcel',
  'urgentExpress',
  0,
  true
),
(
  'b0000000-0000-4000-8000-000000000002',
  'corridor',
  '🎉 0% COMMISSION',
  '#10B981',
  'Haryana Corridor Sprint',
  'Keep 100% of your earnings on Delhi ⇄ Chandigarh, Gurugram & Rohtak.',
  'Post a Trip',
  'create_trip',
  'haryanaRoad',
  1,
  true
),
(
  'b0000000-0000-4000-8000-000000000003',
  'kyc',
  '⭐ VERIFIED TRAVELER',
  '#38BDF8',
  'Unlock 2x More Deliveries',
  'Complete instant DigiLocker & Aadhaar KYC for priority matching & fast payouts.',
  'Verify in 2 Mins',
  'open_kyc',
  'verifiedKyc',
  2,
  true
)
ON CONFLICT (id) DO NOTHING;
