import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/useThemeColors';
import { FontSize, FontWeight, Spacing, BorderRadius } from '@/constants/theme';
import { formatScheduleDate } from './SevenDaySchedulePicker';

interface DigitalWaybillCardProps {
  type: 'parcel' | 'trip';
  fromCity: string;
  toCity: string;
  date: string;
  time?: string;
  categoryOrVehicle: string;
  categoryOrVehicleIcon: keyof typeof MaterialIcons.glyphMap;
  weightOrCapacity: string;
  priceOrOffer: string;
  images?: string[];
  description?: string;
  onEditRoute: () => void;
  onEditDetails: () => void;
  hasKyc?: boolean;
}

export function DigitalWaybillCard({
  type,
  fromCity,
  toCity,
  date,
  time,
  categoryOrVehicle,
  categoryOrVehicleIcon,
  weightOrCapacity,
  priceOrOffer,
  images = [],
  description,
  onEditRoute,
  onEditDetails,
  hasKyc,
}: DigitalWaybillCardProps) {
  const { C } = useThemeColors();

  return (
    <View style={styles.container}>
      {/* Ticket / Waybill Container */}
      <View
        style={[
          styles.ticketCard,
          {
            backgroundColor: C.card,
            borderColor: C.surfaceBorder,
          },
        ]}
      >
        {/* Ticket Header */}
        <View style={[styles.ticketHeader, { backgroundColor: C.surfaceElevated }]}>
          <View style={styles.ticketBadgeRow}>
            <View style={[styles.ticketTypeBadge, { backgroundColor: C.primarySubtle }]}>
              <MaterialIcons
                name={type === 'parcel' ? 'local-shipping' : 'alt-route'}
                size={14}
                color={C.primary}
              />
              <Text style={[styles.ticketTypeBadgeText, { color: C.primary }]}>
                {type === 'parcel' ? 'PARCEL WAYBILL' : 'TRAVELLER ITINERARY'}
              </Text>
            </View>
            <View style={styles.liveIndicator}>
              <View style={[styles.liveDot, { backgroundColor: C.success }]} />
              <Text style={[styles.liveText, { color: C.success }]}>Ready to Match</Text>
            </View>
          </View>
        </View>

        {/* Route Section */}
        <View style={styles.routeSection}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionLabel, { color: C.textMuted }]}>SCHEDULED ROUTE</Text>
            <Pressable
              onPress={onEditRoute}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={styles.editBtn}
              accessibilityRole="button"
              accessibilityLabel="Edit scheduled route"
            >
              <MaterialIcons name="edit" size={14} color={C.primary} />
              <Text style={[styles.editText, { color: C.primary }]}>Edit</Text>
            </Pressable>
          </View>

          <View style={styles.routeMainRow}>
            <View style={styles.cityBlock}>
              <Text style={[styles.cityCode, { color: C.textPrimary }]} numberOfLines={1}>
                {fromCity || 'Origin'}
              </Text>
              <Text style={[styles.citySub, { color: C.textMuted }]}>Pickup Location</Text>
            </View>

            <View style={styles.routeArrowBox}>
              <View style={[styles.arrowTrack, { backgroundColor: C.surfaceBorderLight }]} />
              <View style={[styles.arrowCircle, { backgroundColor: C.primarySubtle, borderColor: C.primary }]}>
                <MaterialIcons name="east" size={14} color={C.primary} />
              </View>
            </View>

            <View style={[styles.cityBlock, { alignItems: 'flex-end' }]}>
              <Text style={[styles.cityCode, { color: C.textPrimary }]} numberOfLines={1}>
                {toCity || 'Destination'}
              </Text>
              <Text style={[styles.citySub, { color: C.textMuted }]}>Dropoff Location</Text>
            </View>
          </View>

          {/* Date & Time Strip */}
          <View style={[styles.scheduleStrip, { backgroundColor: C.surfaceElevated }]}>
            <MaterialIcons name="event" size={16} color={C.primary} />
            <Text style={[styles.scheduleText, { color: C.textPrimary }]}>
              {formatScheduleDate(date)}
              {time ? `  •  ${time}` : ''}
            </Text>
          </View>
        </View>

        {/* Perforated Divider Line */}
        <View style={styles.perforatedLineRow}>
          <View style={[styles.notchLeft, { backgroundColor: C.background, borderColor: C.surfaceBorder }]} />
          <View style={styles.dashedLine}>
            {Array.from({ length: 18 }).map((_, i) => (
              <View key={i} style={[styles.dash, { backgroundColor: C.surfaceBorder }]} />
            ))}
          </View>
          <View style={[styles.notchRight, { backgroundColor: C.background, borderColor: C.surfaceBorder }]} />
        </View>

        {/* Details Section */}
        <View style={styles.detailsSection}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionLabel, { color: C.textMuted }]}>
              {type === 'parcel' ? 'PARCEL SPECIFICATIONS' : 'TRAVEL CAPACITY & FARE'}
            </Text>
            <Pressable
              onPress={onEditDetails}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={styles.editBtn}
              accessibilityRole="button"
              accessibilityLabel="Edit specifications"
            >
              <MaterialIcons name="edit" size={14} color={C.primary} />
              <Text style={[styles.editText, { color: C.primary }]}>Edit</Text>
            </Pressable>
          </View>

          {/* Photos Preview if parcel */}
          {images.length > 0 && (
            <View style={styles.photosRow}>
              {images.map((uri, index) => (
                <View key={index} style={[styles.photoThumb, { borderColor: C.surfaceBorder }]}>
                  <Image source={{ uri }} style={styles.photoImg} contentFit="cover" />
                  {index === 0 && (
                    <View style={[styles.primaryPhotoBadge, { backgroundColor: C.primary }]}>
                      <Text style={styles.primaryPhotoBadgeText}>Cover</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}

          {/* Specs Grid */}
          <View style={styles.specsGrid}>
            <View style={[styles.specCard, { backgroundColor: C.surfaceElevated }]}>
              <MaterialIcons name={categoryOrVehicleIcon} size={20} color={C.primary} />
              <Text style={[styles.specLabel, { color: C.textMuted }]}>
                {type === 'parcel' ? 'Category' : 'Vehicle'}
              </Text>
              <Text style={[styles.specValue, { color: C.textPrimary }]} numberOfLines={1}>
                {categoryOrVehicle}
              </Text>
            </View>

            <View style={[styles.specCard, { backgroundColor: C.surfaceElevated }]}>
              <MaterialIcons name="fitness-center" size={20} color={C.info} />
              <Text style={[styles.specLabel, { color: C.textMuted }]}>
                {type === 'parcel' ? 'Weight' : 'Space'}
              </Text>
              <Text style={[styles.specValue, { color: C.textPrimary }]}>
                {weightOrCapacity} kg
              </Text>
            </View>

            <View style={[styles.specCard, { backgroundColor: C.surfaceElevated }]}>
              <MaterialIcons name="currency-rupee" size={20} color={C.success} />
              <Text style={[styles.specLabel, { color: C.textMuted }]}>
                {type === 'parcel' ? 'Offer' : 'Rate'}
              </Text>
              <Text style={[styles.specValue, { color: C.success }]}>
                ₹{priceOrOffer}
                {type === 'trip' ? '/kg' : ''}
              </Text>
            </View>
          </View>

          {/* Description Snippet */}
          {description ? (
            <View style={[styles.descriptionCard, { backgroundColor: C.surfaceElevated }]}>
              <MaterialIcons name="notes" size={14} color={C.textMuted} />
              <Text style={[styles.descriptionText, { color: C.textSecondary }]} numberOfLines={2}>
                {description}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Cost & Settlement Breakdown */}
        <View style={[styles.costSummary, { borderTopColor: C.surfaceBorder }]}>
          <View style={styles.costRow}>
            <Text style={[styles.costLabel, { color: C.textSecondary }]}>
              {type === 'parcel' ? 'Parcel Delivery Offer' : 'Potential Full-Trip Payout'}
            </Text>
            <Text style={[styles.costValue, { color: C.textPrimary }]}>
              ₹
              {type === 'parcel'
                ? priceOrOffer || '0'
                : (Number(weightOrCapacity || 0) * Number(priceOrOffer || 0)).toFixed(0)}
            </Text>
          </View>
          <View style={styles.costRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <MaterialIcons name="verified-user" size={13} color={C.success} />
              <Text style={[styles.costLabel, { color: C.textSecondary }]}>
                100% Escrow Protection & Insurance
              </Text>
            </View>
            <Text style={[styles.freeTag, { color: C.success }]}>FREE (₹0)</Text>
          </View>
        </View>
      </View>

      {/* Trust & Verification Badges */}
      <View style={[styles.trustCard, { backgroundColor: C.card, borderColor: C.surfaceBorder }]}>
        <View style={styles.trustItem}>
          <View style={[styles.trustIconBox, { backgroundColor: C.primarySubtle }]}>
            <MaterialIcons name="security" size={18} color={C.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.trustTitle, { color: C.textPrimary }]}>
              6-Digit Handshake OTP
            </Text>
            <Text style={[styles.trustSub, { color: C.textMuted }]}>
              Delivery confirmed only when recipient enters the unique code.
            </Text>
          </View>
        </View>

        <View style={styles.trustItem}>
          <View style={[styles.trustIconBox, { backgroundColor: C.successSubtle }]}>
            <MaterialIcons name="account-balance-wallet" size={18} color={C.success} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.trustTitle, { color: C.textPrimary }]}>
              Automated Escrow Vault
            </Text>
            <Text style={[styles.trustSub, { color: C.textMuted }]}>
              Funds held securely and released instantly upon successful dropoff.
            </Text>
          </View>
        </View>
      </View>

      {/* KYC Reminder Banner if unverified */}
      {!hasKyc ? (
        <View style={[styles.kycBanner, { backgroundColor: C.warningSubtle, borderColor: C.warningBorder }]}>
          <MaterialIcons name="fingerprint" size={18} color={C.warning} />
          <Text style={[styles.kycText, { color: C.textPrimary }]}>
            UIDAI Aadhaar verification ensures full trust across the CarryGo network. You will be prompted to verify before your listing goes live.
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.md,
  },
  ticketCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1.2,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  ticketHeader: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
  },
  ticketBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ticketTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  ticketTypeBadgeText: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.6,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  liveText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  routeSection: {
    padding: Spacing.md + 2,
    gap: Spacing.sm,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.8,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  editText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  routeMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xs,
  },
  cityBlock: {
    flex: 1,
  },
  cityCode: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    letterSpacing: -0.3,
  },
  citySub: {
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  routeArrowBox: {
    width: 60,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  arrowTrack: {
    position: 'absolute',
    height: 2,
    width: '100%',
  },
  arrowCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  scheduleStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs + 2,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.md,
  },
  scheduleText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
  },
  perforatedLineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 20,
    marginVertical: -2,
    overflow: 'hidden',
  },
  notchLeft: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.2,
    marginLeft: -10,
  },
  notchRight: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.2,
    marginRight: -10,
  },
  dashedLine: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
  },
  dash: {
    width: 5,
    height: 1.5,
    borderRadius: 1,
  },
  detailsSection: {
    padding: Spacing.md + 2,
    gap: Spacing.sm,
  },
  photosRow: {
    flexDirection: 'row',
    gap: Spacing.xs + 2,
  },
  photoThumb: {
    width: 54,
    height: 54,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  photoImg: {
    width: '100%',
    height: '100%',
  },
  primaryPhotoBadge: {
    position: 'absolute',
    bottom: 2,
    left: 2,
    right: 2,
    paddingVertical: 1,
    borderRadius: 2,
    alignItems: 'center',
  },
  primaryPhotoBadgeText: {
    fontSize: 8,
    fontWeight: FontWeight.bold,
    color: '#FFF',
  },
  specsGrid: {
    flexDirection: 'row',
    gap: Spacing.xs + 2,
  },
  specCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: 4,
    borderRadius: BorderRadius.lg,
    gap: 3,
  },
  specLabel: {
    fontSize: 10,
  },
  specValue: {
    fontSize: FontSize.xs + 1,
    fontWeight: FontWeight.bold,
  },
  descriptionCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.xs,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  descriptionText: {
    flex: 1,
    fontSize: FontSize.xs,
    lineHeight: 16,
  },
  costSummary: {
    borderTopWidth: 1,
    paddingHorizontal: Spacing.md + 2,
    paddingVertical: Spacing.sm + 2,
    gap: 6,
  },
  costRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  costLabel: {
    fontSize: FontSize.xs,
  },
  costValue: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  freeTag: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.5,
  },
  trustCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1.2,
    padding: Spacing.md,
    gap: Spacing.sm + 2,
  },
  trustItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  trustIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trustTitle: {
    fontSize: FontSize.xs + 1,
    fontWeight: FontWeight.semibold,
  },
  trustSub: {
    fontSize: 11,
    lineHeight: 14,
    marginTop: 1,
  },
  kycBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
  },
  kycText: {
    flex: 1,
    fontSize: FontSize.xs,
    lineHeight: 16,
  },
});
