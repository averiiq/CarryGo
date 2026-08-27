import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useThemeColors } from '@/hooks/useThemeColors';
import { BorderRadius, FontSize, FontWeight, Spacing } from '@/constants/theme';

export default function TermsScreen() {
  const { C } = useThemeColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={[styles.container, { backgroundColor: C.background, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: C.surfaceBorder }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => router.back()}
          style={[styles.backButton, { backgroundColor: C.surfaceElevated }]}
          hitSlop={12}
        >
          <MaterialIcons name="arrow-back" size={20} color={C.textPrimary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: C.textPrimary }]}>Terms & Conditions</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + Spacing.xxl }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Preamble */}
        <View style={[styles.badge, { backgroundColor: C.primarySubtle }]}>
          <MaterialIcons name="gavel" size={16} color={C.primary} />
          <Text style={[styles.badgeText, { color: C.primary }]}>Effective Date: 27 July 2026</Text>
        </View>

        <Text style={[styles.bodyText, { color: C.textSecondary }]}>
          Welcome to CarryGo. By using our platform, you agree to the following terms and conditions. CarryGo operates as a peer-to-peer (P2P) parcel delivery marketplace connecting senders with travelers who are already making a journey. Please read these terms carefully before using our services.
        </Text>

        {/* Section 1 */}
        <Section number="1" title="Platform Role & Nature of Service" C={C}>
          <Paragraph C={C}>
            1.1. CarryGo is a technology platform that connects senders (individuals who need parcels delivered) with travelers (individuals already traveling between cities who can carry parcels). CarryGo is NOT a courier service, logistics company, or postal service.
          </Paragraph>
          <Paragraph C={C}>
            1.2. CarryGo acts solely as an intermediary marketplace. We facilitate the connection between senders and travelers, provide escrow payment services, and offer a dispute resolution framework.
          </Paragraph>
          <Paragraph C={C}>
            1.3. CarryGo does not take physical possession of any parcel at any time. We do not inspect, verify, weigh, or otherwise handle any packages listed on our platform.
          </Paragraph>
          <Paragraph C={C}>
            1.4. The transportation contract is between the sender and the traveler directly. CarryGo is not a party to this contract except as a payment facilitator.
          </Paragraph>
        </Section>

        {/* Section 2 */}
        <Section number="2" title="Sender Responsibilities" C={C}>
          <Paragraph C={C}>
            2.1. Senders must accurately describe the contents, weight, and dimensions of their parcel. Misrepresentation constitutes a breach of these terms.
          </Paragraph>
          <Paragraph C={C}>
            2.2. Senders are solely responsible for packaging their items securely. This includes appropriate cushioning, waterproofing, and external labeling.
          </Paragraph>
          <Paragraph C={C}>
            2.3. Senders must ensure all items are legal to transport within India and comply with all applicable laws, including but not limited to the Indian Post Office Act, 1898 and the Carriage by Air Act, 1972.
          </Paragraph>
          <Paragraph C={C}>
            2.4. Senders must be present at the agreed handover location and time. Failure to appear within 30 minutes of the scheduled time may result in cancellation with applicable fees.
          </Paragraph>
          <Paragraph C={C}>
            2.5. Senders must provide photographic proof of the parcel condition at the time of handover. These photos serve as the baseline for any future damage claims.
          </Paragraph>
          <Paragraph C={C}>
            2.6. Senders must remain reachable by phone or in-app messaging throughout the delivery period until the parcel is confirmed delivered.
          </Paragraph>
          <Paragraph C={C}>
            2.7. Senders must pay the agreed price without negotiation after booking confirmation. Any payment disputes after acceptance will be handled through the platform’s mediation process.
          </Paragraph>
        </Section>

        {/* Section 3 */}
        <Section number="3" title="Traveler Responsibilities" C={C}>
          <Paragraph C={C}>
            3.1. Travelers must complete identity verification (KYC) before accepting any delivery requests.
          </Paragraph>
          <Paragraph C={C}>
            3.2. Travelers must handle all parcels with reasonable care during transit. This means protecting parcels from rain, extreme temperatures, crushing, and theft.
          </Paragraph>
          <Paragraph C={C}>
            3.3. Travelers must never open, tamper with, or inspect the contents of sealed parcels unless required by law enforcement.
          </Paragraph>
          <Paragraph C={C}>
            3.4. Travelers must deliver parcels within the agreed timeframe. If delays are expected, the traveler must proactively communicate with the sender via the platform.
          </Paragraph>
          <Paragraph C={C}>
            3.5. Travelers must confirm delivery through the app using OTP verification and photographic proof.
          </Paragraph>
          <Paragraph C={C}>
            3.6. Travelers may refuse a parcel at pickup if it appears to differ significantly from the sender’s description or if they have reasonable suspicion the contents are illegal.
          </Paragraph>
        </Section>

        {/* Section 4 */}
        <Section number="4" title="Prohibited Items" C={C}>
          <Paragraph C={C}>
            4.1. The following items are strictly prohibited on CarryGo:
          </Paragraph>
          <BulletList C={C} items={[
            'Narcotics, controlled substances, and illegal drugs',
            'Weapons, firearms, ammunition, and explosives',
            'Flammable materials and hazardous chemicals',
            'Live animals or biological specimens',
            'Currency, negotiable instruments, or counterfeit goods',
            'Stolen property or items of unknown provenance',
            'Pornographic or obscene materials',
            'Items prohibited under the Wildlife Protection Act, 1972',
            'Fake identification documents or government seals',
            'Loose lithium batteries exceeding 100Wh',
            'Radioactive materials',
            'Human remains or organs',
          ]} />
          <Paragraph C={C}>
            4.2. Sending prohibited items constitutes a criminal offense and will result in immediate permanent account suspension, forfeiture of escrowed funds, and reporting to relevant law enforcement authorities.
          </Paragraph>
          <Paragraph C={C}>
            4.3. CarryGo reserves the right to update the prohibited items list at any time. Users will be notified of material changes.
          </Paragraph>
        </Section>

        {/* Section 5 */}
        <Section number="5" title="Fragile Items & Special Handling" C={C}>
          <Paragraph C={C}>
            5.1. Items marked as fragile must be packaged by the sender in industry-standard protective packaging (bubble wrap, foam, double-boxing as appropriate).
          </Paragraph>
          <Paragraph C={C}>
            5.2. Travelers are not required to provide special handling equipment (thermal bags, refrigeration, etc.) unless explicitly agreed upon and reflected in the delivery price.
          </Paragraph>
          <Paragraph C={C}>
            5.3. Damage to fragile items that were inadequately packaged (as determined by photographic evidence) will not be eligible for compensation claims against the traveler.
          </Paragraph>
          <Paragraph C={C}>
            5.4. Perishable food items are sent at the sender’s own risk. CarryGo does not guarantee temperature control during transit.
          </Paragraph>
        </Section>

        {/* Section 6 */}
        <Section number="6" title="Liability & Insurance" C={C}>
          <Paragraph C={C}>
            6.1. CarryGo’s liability is limited to facilitating dispute resolution and refunding escrowed payments where appropriate. CarryGo does not carry cargo insurance.
          </Paragraph>
          <Paragraph C={C}>
            6.2. Maximum compensation for lost or damaged items is capped at:
          </Paragraph>
          <BulletList C={C} items={[
            'Standard parcels: Rs 5,000',
            'Electronics: Rs 15,000',
            'Documents: Rs 2,000',
          ]} />
          <Paragraph C={C}>
            6.3. CarryGo does NOT provide insurance coverage for any shipments. Users are strongly encouraged to purchase separate transit insurance for high-value items.
          </Paragraph>
          <Paragraph C={C}>
            6.4. CarryGo is not liable for indirect, incidental, special, or consequential damages arising from delayed or failed deliveries.
          </Paragraph>
          <Paragraph C={C}>
            6.5. In cases where the traveler can demonstrate that damage occurred due to inadequate sender packaging, the traveler shall not be liable for compensation.
          </Paragraph>
        </Section>

        {/* Section 7 */}
        <Section number="7" title="Dispute Resolution" C={C}>
          <Paragraph C={C}>
            7.1. All disputes must be reported through the CarryGo app within 48 hours of delivery (or expected delivery date for non-delivery claims).
          </Paragraph>
          <Paragraph C={C}>
            7.2. Dispute resolution follows a three-tier process: (a) direct communication between parties via in-app messaging; (b) mediation by CarryGo support staff; (c) binding arbitration under the Arbitration and Conciliation Act, 1996.
          </Paragraph>
          <Paragraph C={C}>
            7.3. During dispute resolution, escrowed funds will be held until a resolution is reached. Neither party may withdraw the disputed amount.
          </Paragraph>
          <Paragraph C={C}>
            7.4. Photographic evidence from both pickup and delivery is critical to dispute resolution. Parties who fail to provide photographic evidence will have a weaker position in claims.
          </Paragraph>
          <Paragraph C={C}>
            7.5. CarryGo’s dispute resolution decision is final and binding on both parties for claims under Rs 15,000. Claims above this amount may be escalated to arbitration.
          </Paragraph>
        </Section>

        {/* Section 8 */}
        <Section number="8" title="Identity Verification (KYC)" C={C}>
          <Paragraph C={C}>
            8.1. All users must complete Know Your Customer (KYC) verification to access core platform features. This includes government-issued photo ID and a live selfie for facial matching.
          </Paragraph>
          <Paragraph C={C}>
            8.2. KYC data is processed securely and stored in compliance with the Digital Personal Data Protection Act, 2023.
          </Paragraph>
          <Paragraph C={C}>
            8.3. Users found to have submitted fraudulent identity documents will be permanently banned and reported to authorities.
          </Paragraph>
          <Paragraph C={C}>
            8.4. CarryGo may re-verify identity periodically or when suspicious activity is detected.
          </Paragraph>
        </Section>

        {/* Section 9 */}
        <Section number="9" title="Delivery Verification" C={C}>
          <Paragraph C={C}>
            9.1. Delivery is confirmed only when the recipient enters the One-Time Password (OTP) provided to the sender into the traveler’s app.
          </Paragraph>
          <Paragraph C={C}>
            9.2. Photographic proof of delivery is required alongside OTP confirmation.
          </Paragraph>
          <Paragraph C={C}>
            9.3. The sender must not share the delivery OTP with anyone other than the intended recipient.
          </Paragraph>
          <Paragraph C={C}>
            9.4. Payment is released from escrow to the traveler only after successful OTP-based delivery confirmation.
          </Paragraph>
        </Section>

        {/* Section 10 */}
        <Section number="10" title="Payment & Escrow" C={C}>
          <Paragraph C={C}>
            10.1. All payments are processed through CarryGo’s secure escrow system. The sender pays upon booking, and funds are held until successful delivery.
          </Paragraph>
          <Paragraph C={C}>
            10.2. CarryGo charges a platform service fee (currently 10% of the delivery price) deducted from the traveler’s payout.
          </Paragraph>
          <Paragraph C={C}>
            10.3. Payouts to travelers are processed within 24 hours of confirmed delivery via UPI or bank transfer.
          </Paragraph>
          <Paragraph C={C}>
            10.4. In case of delivery failure or cancellation, refunds to senders are processed within 3-5 business days.
          </Paragraph>
        </Section>

        {/* Section 11 */}
        <Section number="11" title="Refund Policy" C={C}>
          <Paragraph C={C}>
            11.1. Full refund: if the traveler cancels before pickup, or if delivery fails due to traveler negligence.
          </Paragraph>
          <Paragraph C={C}>
            11.2. Partial refund: if the sender cancels after the traveler has already begun the journey (up to 50% may be retained as traveler compensation).
          </Paragraph>
          <Paragraph C={C}>
            11.3. No refund: if the sender sends prohibited items, provides false descriptions, or fails to appear at the agreed handover point.
          </Paragraph>
          <Paragraph C={C}>
            11.4. Damage claims are evaluated case-by-case through the dispute resolution process.
          </Paragraph>
        </Section>

        {/* Section 12 */}
        <Section number="12" title="Fraud Prevention" C={C}>
          <Paragraph C={C}>
            12.1. CarryGo employs automated fraud detection systems to identify suspicious activity including but not limited to: duplicate accounts, fake delivery confirmations, collusion between sender and traveler, and money laundering.
          </Paragraph>
          <Paragraph C={C}>
            12.2. Users engaging in fraudulent activity will face immediate account suspension, forfeiture of pending payouts, and potential criminal prosecution.
          </Paragraph>
          <Paragraph C={C}>
            12.3. Senders who repeatedly file false damage claims will be flagged and may lose access to the claims system.
          </Paragraph>
        </Section>

        {/* Section 13 */}
        <Section number="13" title="Cancellation Policy" C={C}>
          <Paragraph C={C}>
            13.1. Senders may cancel free of charge within 30 minutes of booking if no traveler has accepted.
          </Paragraph>
          <Paragraph C={C}>
            13.2. After traveler acceptance, sender cancellation incurs a fee of 15% of the delivery price (minimum Rs 50).
          </Paragraph>
          <Paragraph C={C}>
            13.3. Travelers may cancel up to 2 hours before the scheduled pickup without penalty. Late cancellation affects their reliability score.
          </Paragraph>
          <Paragraph C={C}>
            13.4. Repeated cancellations (more than 3 in 30 days) may result in temporary account restrictions.
          </Paragraph>
        </Section>

        {/* Section 14 */}
        <Section number="14" title="Account Suspension & Termination" C={C}>
          <Paragraph C={C}>
            14.1. CarryGo reserves the right to suspend or terminate user accounts for violations of these terms, including but not limited to:
          </Paragraph>
          <BulletList C={C} items={[
            'Sending or attempting to send prohibited items',
            'Identity fraud or use of fake documents',
            'Repeated failure to meet delivery obligations',
            'Harassment, threats, or abusive behavior toward other users',
            'Manipulation of ratings or reviews',
            'Circumventing platform fees through off-platform transactions',
          ]} />
          <Paragraph C={C}>
            14.2. Suspended users may appeal within 30 days. Permanent bans are final and non-appealable.
          </Paragraph>
          <Paragraph C={C}>
            14.3. Upon termination, outstanding escrow balances will be settled according to the terms of any active deliveries.
          </Paragraph>
        </Section>

        {/* Section 15 */}
        <Section number="15" title="Force Majeure" C={C}>
          <Paragraph C={C}>
            15.1. Neither CarryGo nor any user shall be liable for failure to perform obligations due to circumstances beyond reasonable control, including but not limited to: natural disasters, pandemics, government orders, strikes, civil unrest, or transportation disruptions.
          </Paragraph>
          <Paragraph C={C}>
            15.2. In force majeure events, deliveries may be delayed or cancelled with full refund to the sender and no penalty to the traveler.
          </Paragraph>
        </Section>

        {/* Section 16 */}
        <Section number="16" title="Privacy & Data Protection" C={C}>
          <Paragraph C={C}>
            16.1. CarryGo collects and processes personal data in accordance with the Digital Personal Data Protection Act, 2023 (DPDP Act).
          </Paragraph>
          <Paragraph C={C}>
            16.2. Data collected includes: identity documents (for KYC), location data (for delivery tracking), communication logs (for dispute resolution), and payment information (for transactions).
          </Paragraph>
          <Paragraph C={C}>
            16.3. Users retain the right to access, correct, and request deletion of their personal data, subject to legal retention requirements.
          </Paragraph>
          <Paragraph C={C}>
            16.4. CarryGo does not sell personal data to third parties. Data may be shared with law enforcement upon valid legal request.
          </Paragraph>
          <Paragraph C={C}>
            16.5. Location data is collected only during active deliveries and is not retained beyond 90 days post-delivery.
          </Paragraph>
        </Section>

        {/* Section 17 */}
        <Section number="17" title="Indian Law Compliance" C={C}>
          <Paragraph C={C}>
            17.1. CarryGo operates in compliance with applicable Indian laws including: the Information Technology Act, 2000; the Consumer Protection Act, 2019; the Payment and Settlement Systems Act, 2007; and the Digital Personal Data Protection Act, 2023.
          </Paragraph>
          <Paragraph C={C}>
            17.2. Users must comply with all applicable laws of India while using the platform, including customs regulations for inter-state transport of goods.
          </Paragraph>
          <Paragraph C={C}>
            17.3. Any goods subject to GST must have appropriate documentation. CarryGo is not responsible for tax compliance of individual shipments.
          </Paragraph>
        </Section>

        {/* Section 18 */}
        <Section number="18" title="Governing Law & Jurisdiction" C={C}>
          <Paragraph C={C}>
            18.1. These Terms shall be governed by and construed in accordance with the laws of India.
          </Paragraph>
          <Paragraph C={C}>
            18.2. Any disputes arising from these Terms that cannot be resolved through the platform’s dispute resolution mechanism shall be subject to the exclusive jurisdiction of the courts in Bengaluru, Karnataka, India.
          </Paragraph>
          <Paragraph C={C}>
            18.3. For claims exceeding Rs 15,000, disputes shall be resolved through binding arbitration conducted in English, seated in Bengaluru, under the Arbitration and Conciliation Act, 1996.
          </Paragraph>
        </Section>

        {/* Section 19 */}
        <Section number="19" title="Amendments" C={C}>
          <Paragraph C={C}>
            19.1. CarryGo reserves the right to modify these Terms at any time. Material changes will be communicated via in-app notification and email at least 15 days before taking effect.
          </Paragraph>
          <Paragraph C={C}>
            19.2. Continued use of the platform after the effective date of changes constitutes acceptance of the modified Terms.
          </Paragraph>
          <Paragraph C={C}>
            19.3. Users who do not agree to modified Terms may close their account and request deletion of their data.
          </Paragraph>
        </Section>

        {/* Section 20 */}
        <Section number="20" title="Contact & Grievance Redressal" C={C}>
          <Paragraph C={C}>
            20.1. For queries, complaints, or grievances, contact our Grievance Officer at: grievance@carrygo.in
          </Paragraph>
          <Paragraph C={C}>
            20.2. Grievances will be acknowledged within 24 hours and resolved within 15 days in compliance with the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021.
          </Paragraph>
          <Paragraph C={C}>
            20.3. CarryGo Technologies Private Limited, registered in Bengaluru, Karnataka, India.
          </Paragraph>
        </Section>

        <View style={[styles.finalNote, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }]}>
          <MaterialIcons name="info-outline" size={16} color={C.textMuted} />
          <Text style={[styles.finalNoteText, { color: C.textMuted }]}>
            By using CarryGo, you acknowledge that you have read, understood, and agree to be bound by these Terms and Conditions.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

/* ─── Sub-Components ─── */

function Section({ number, title, children, C }: {
  number: string;
  title: string;
  children: React.ReactNode;
  C: any;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={[styles.sectionBadge, { backgroundColor: C.primarySubtle }]}>
          <Text style={[styles.sectionBadgeText, { color: C.primary }]}>{number}</Text>
        </View>
        <Text style={[styles.sectionTitle, { color: C.textPrimary }]}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function Paragraph({ children, C }: { children: React.ReactNode; C: any }) {
  return (
    <Text style={[styles.paragraph, { color: C.textSecondary }]}>{children}</Text>
  );
}

function BulletList({ items, C }: { items: string[]; C: any }) {
  return (
    <View style={styles.bulletList}>
      {items.map((item, i) => (
        <View key={i} style={styles.bulletItem}>
          <View style={[styles.bulletDot, { backgroundColor: C.primary }]} />
          <Text style={[styles.bulletItemText, { color: C.textSecondary }]}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

/* ─── Styles ─── */

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 36,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    gap: Spacing.lg,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.full,
  },
  badgeText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  bodyText: {
    fontSize: FontSize.md,
    lineHeight: 24,
  },
  section: {
    gap: Spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  sectionBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionBadgeText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    flex: 1,
  },
  paragraph: {
    fontSize: FontSize.sm,
    lineHeight: 22,
    paddingLeft: Spacing.xs,
  },
  bulletList: {
    gap: Spacing.xs,
    paddingLeft: Spacing.md,
  },
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 8,
  },
  bulletItemText: {
    flex: 1,
    fontSize: FontSize.sm,
    lineHeight: 22,
  },
  finalNote: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'flex-start',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    marginTop: Spacing.md,
  },
  finalNoteText: {
    flex: 1,
    fontSize: FontSize.sm,
    lineHeight: 20,
  },
});
