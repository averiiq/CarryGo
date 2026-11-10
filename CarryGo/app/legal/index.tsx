import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
} from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '@/hooks/useThemeColors';
import { BorderRadius, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { BACK_BUTTON_LABEL } from '@/constants/legal-bilingual-content';
import {
  LanguageToggle,
  DraftLegalBanner,
  useLegalLanguage,
} from '@/components/ui/LanguageToggle';
import { Haptic } from '@/services/haptics.service';

interface LegalDocMeta {
  id: string;
  route?: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  titleEn: string;
  titleHi: string;
  badgeEn: string;
  badgeHi: string;
  descEn: string;
  descHi: string;
  actionType: 'navigate' | 'modal';
  modalType?: 'prohibited' | 'safety';
}

const LEGAL_DOCUMENTS: LegalDocMeta[] = [
  {
    id: 'terms',
    route: '/legal/terms',
    icon: 'gavel',
    titleEn: 'Terms of Service',
    titleHi: 'सेवा की शर्तें',
    badgeEn: 'Core Contract',
    badgeHi: 'मुख्य अनुबंध',
    descEn: 'Platform agreement, peer-to-peer transport conditions, user responsibilities, and limitation of liability.',
    descHi: 'प्लेटफ़ॉर्म अनुबंध, पीयर-टू-पीयर परिवहन नियम, उपयोगकर्ता की जिम्मेदारियां और देयता सीमाएं।',
    actionType: 'navigate',
  },
  {
    id: 'privacy',
    route: '/legal/privacy',
    icon: 'lock',
    titleEn: 'Privacy Policy',
    titleHi: 'गोपनीयता नीति',
    badgeEn: 'DPDP Act 2023',
    badgeHi: 'डीपीडीपी अधिनियम 2023',
    descEn: 'How personal information, identity credentials, masked communications, and location data are protected.',
    descHi: 'व्यक्तिगत जानकारी, पहचान विवरण, सुरक्षित संचार और लोकेशन डेटा की सुरक्षा कैसे की जाती है।',
    actionType: 'navigate',
  },
  {
    id: 'refund',
    route: '/legal/refund-policy',
    icon: 'replay',
    titleEn: 'Refund & Cancellation Policy',
    titleHi: 'रिफंड एवं रद्दीकरण नीति',
    badgeEn: 'Safe Pay Protection',
    badgeHi: 'सुरक्षित भुगतान सुरक्षा',
    descEn: 'Cancellation timelines, instant booking refunds, dispute arbitration, and fee protection guidelines.',
    descHi: 'रद्दीकरण समय-सीमा, बुकिंग रिफंड, विवाद निवारण और सुरक्षित भुगतान सुरक्षा नियम।',
    actionType: 'navigate',
  },
  {
    id: 'shipping',
    route: '/legal/shipping-policy',
    icon: 'local-shipping',
    titleEn: 'Shipping & Delivery Policy',
    titleHi: 'शिपिंग एवं डिलीवरी नीति',
    badgeEn: 'Handover Protocol',
    badgeHi: 'हैंडओवर प्रोटोकॉल',
    descEn: 'In-person OTP validation, parcel inspection rights, delivery deadlines, and packaging criteria.',
    descHi: 'आमने-सामने ओटीपी सत्यापन, पार्सल जांच का अधिकार, डिलीवरी समय-सीमा और पैकेजिंग मानक।',
    actionType: 'navigate',
  },
  {
    id: 'prohibited',
    icon: 'block',
    titleEn: 'Prohibited & Restricted Items',
    titleHi: 'प्रतिबंधित एवं वर्जित वस्तुएं',
    badgeEn: 'Zero Tolerance',
    badgeHi: 'शून्य सहनशीलता',
    descEn: 'Comprehensive list of banned goods: hazardous items, contraband, flammables, weapons, and narcotics.',
    descHi: 'प्रतिबंधित वस्तुओं की सूची: खतरनाक सामान, अवैध वस्तुएं, ज्वलनशील पदार्थ, हथियार और नशीले पदार्थ।',
    actionType: 'modal',
    modalType: 'prohibited',
  },
  {
    id: 'safety',
    icon: 'verified-user',
    titleEn: 'Community Safety Guidelines',
    titleHi: 'सामुदायिक सुरक्षा मानक',
    badgeEn: 'Trust & Safety',
    badgeHi: 'विश्वास एवं सुरक्षा',
    descEn: 'Traveler-sender conduct, physical verification requirements, mutual respect, and incident protocols.',
    descHi: 'यात्री-प्रेषक आचरण, पहचान सत्यापन की आवश्यकता, आपसी सम्मान और सुरक्षा प्रोटोकॉल।',
    actionType: 'modal',
    modalType: 'safety',
  },
];

export default function LegalCenterScreen() {
  const { C } = useThemeColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { language, setLanguage } = useLegalLanguage();

  const [activeModal, setActiveModal] = useState<'prohibited' | 'safety' | null>(null);

  const isHindi = language === 'hi';

  const handleDocPress = (doc: LegalDocMeta) => {
    Haptic.select();
    if (doc.actionType === 'navigate' && doc.route) {
      router.push(doc.route as any);
    } else if (doc.actionType === 'modal' && doc.modalType) {
      setActiveModal(doc.modalType);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: C.background, paddingTop: insets.top }]}>
      {/* Header Bar */}
      <View style={[styles.header, { borderBottomColor: C.surfaceBorder }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={BACK_BUTTON_LABEL[language]}
          onPress={() => router.back()}
          style={[styles.backButton, { backgroundColor: C.surfaceElevated }]}
          hitSlop={12}
        >
          <MaterialIcons name="arrow-back" size={20} color={C.textPrimary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: C.textPrimary }]} numberOfLines={1}>
          {isHindi ? 'कानूनी एवं नीतियां' : 'Legal & Policies'}
        </Text>
        <LanguageToggle currentLanguage={language} onLanguageChange={setLanguage} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.xxl }]}
        showsVerticalScrollIndicator={false}
      >
        <DraftLegalBanner language={language} />

        {/* Hero Banner */}
        <View style={[styles.heroCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
          <View style={[styles.badge, { backgroundColor: C.primarySubtle }]}>
            <MaterialIcons name="shield" size={16} color={C.primary} />
            <Text style={[styles.badgeText, { color: C.primary }]}>
              {isHindi ? 'CaryGoo कानूनी एवं अनुपालन केंद्र' : 'CaryGoo Legal & Compliance Hub'}
            </Text>
          </View>
          <Text style={[styles.heroTitle, { color: C.textPrimary }]}>
            {isHindi ? 'विश्वास, सुरक्षा एवं नियामक अनुपालन' : 'Trust, Safety & Regulatory Policies'}
          </Text>
          <Text style={[styles.heroDesc, { color: C.textSecondary }]}>
            {isHindi
              ? 'CaryGoo पीयर-टू-पीयर प्लेटफॉर्म का संचालन पूरी पारदर्शिता, सुरक्षा और भारतीय कानूनों के तहत करता है। नीचे हमारे सभी आधिकारिक नियम और नीतियां उपलब्ध हैं।'
              : 'CaryGoo operates a secure, compliant peer-to-peer transport network. Below are the official policies, legal terms, and community codes that protect every journey.'}
          </Text>

          {/* Trust Highlights */}
          <View style={styles.highlightsRow}>
            <View style={[styles.highlightPill, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }]}>
              <MaterialIcons name="lock" size={14} color={C.primary} />
              <Text style={[styles.highlightText, { color: C.textPrimary }]}>
                {isHindi ? 'डीपीडीपी 2023 अनुपालन' : 'DPDP Act, 2023'}
              </Text>
            </View>
            <View style={[styles.highlightPill, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }]}>
              <MaterialIcons name="check-circle" size={14} color={C.success} />
              <Text style={[styles.highlightText, { color: C.textPrimary }]}>
                {isHindi ? '100% सत्यापित उपयोगकर्ता' : '100% Verified Users'}
              </Text>
            </View>
            <View style={[styles.highlightPill, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }]}>
              <MaterialIcons name="security" size={14} color={C.accent} />
              <Text style={[styles.highlightText, { color: C.textPrimary }]}>
                {isHindi ? 'सुरक्षित भुगतान सुरक्षा' : 'Safe Pay Protected'}
              </Text>
            </View>
          </View>
        </View>

        {/* Section Title */}
        <Text style={[styles.sectionHeading, { color: C.textMuted }]}>
          {isHindi ? 'आधिकारिक कानूनी दस्तावेज' : 'Official Legal Documents'}
        </Text>

        {/* Legal Cards */}
        <View style={styles.cardsGrid}>
          {LEGAL_DOCUMENTS.map((doc) => {
            const title = isHindi ? doc.titleHi : doc.titleEn;
            const badge = isHindi ? doc.badgeHi : doc.badgeEn;
            const desc = isHindi ? doc.descHi : doc.descEn;

            return (
              <Pressable
                key={doc.id}
                style={({ pressed }) => [
                  styles.docCard,
                  {
                    backgroundColor: C.surface,
                    borderColor: C.surfaceBorder,
                    opacity: pressed ? 0.9 : 1,
                  },
                ]}
                onPress={() => handleDocPress(doc)}
              >
                <View style={styles.docHeader}>
                  <View style={[styles.iconBox, { backgroundColor: C.primarySubtle }]}>
                    <MaterialIcons name={doc.icon} size={22} color={C.primary} />
                  </View>
                  <View style={styles.docHeaderMeta}>
                    <View style={styles.titleRow}>
                      <Text style={[styles.docTitle, { color: C.textPrimary }]}>{title}</Text>
                      <View style={[styles.docBadge, { backgroundColor: C.surfaceElevated }]}>
                        <Text style={[styles.docBadgeText, { color: C.primary }]}>{badge}</Text>
                      </View>
                    </View>
                    <Text style={[styles.docDesc, { color: C.textSecondary }]}>{desc}</Text>
                  </View>
                  <MaterialIcons name="chevron-right" size={22} color={C.textMuted} style={styles.chevron} />
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* Grievance & Regulatory Details */}
        <View style={[styles.disclosureCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
          <View style={styles.disclosureHeader}>
            <MaterialIcons name="business" size={18} color={C.primary} />
            <Text style={[styles.disclosureTitle, { color: C.textPrimary }]}>
              {isHindi ? 'नियामक प्रकटीकरण एवं शिकायत निवारण' : 'Regulatory Disclosures & Grievance Redressal'}
            </Text>
          </View>
          <Text style={[styles.disclosureText, { color: C.textSecondary }]}>
            {isHindi
              ? 'सूचना प्रौद्योगिकी अधिनियम, 2000 और उपभोक्ता संरक्षण नियमों के अनुपालन में, किसी भी कानूनी या शिकायत पूछताछ के लिए संपर्क करें:'
              : 'In accordance with the Information Technology Act, 2000 and Digital Personal Data Protection Act, 2023, reach out to our legal officer:'}
          </Text>
          <View style={[styles.infoRow, { borderTopColor: C.surfaceBorder }]}>
            <Text style={[styles.infoLabel, { color: C.textMuted }]}>
              {isHindi ? 'कंपनी:' : 'Entity:'}
            </Text>
            <Text style={[styles.infoVal, { color: C.textPrimary }]}>CaryGoo Technologies Pvt. Ltd.</Text>
          </View>
          <View style={[styles.infoRow, { borderTopColor: C.surfaceBorder }]}>
            <Text style={[styles.infoLabel, { color: C.textMuted }]}>
              {isHindi ? 'अधिकार क्षेत्र:' : 'Jurisdiction:'}
            </Text>
            <Text style={[styles.infoVal, { color: C.textPrimary }]}>New Delhi, India</Text>
          </View>
          <View style={[styles.infoRow, { borderTopColor: C.surfaceBorder }]}>
            <Text style={[styles.infoLabel, { color: C.textMuted }]}>
              {isHindi ? 'शिकायत अधिकारी:' : 'Grievance Officer:'}
            </Text>
            <Text style={[styles.infoVal, { color: C.primary }]}>grievance@carrygo.com</Text>
          </View>
          <View style={[styles.infoRow, { borderTopColor: C.surfaceBorder }]}>
            <Text style={[styles.infoLabel, { color: C.textMuted }]}>
              {isHindi ? 'कानूनी डेस्क:' : 'Legal Desk:'}
            </Text>
            <Text style={[styles.infoVal, { color: C.primary }]}>legal@carrygo.com</Text>
          </View>
          <Text style={[styles.turnaroundText, { color: C.textMuted }]}>
            {isHindi
              ? 'आधिकारिक शिकायतों का निवारण 48 व्यावसायिक घंटों के भीतर किया जाता है।'
              : 'Official inquiries and grievances are acknowledged and addressed within 48 business hours.'}
          </Text>
        </View>
      </ScrollView>

      {/* Prohibited Items Info Modal */}
      <Modal
        visible={activeModal === 'prohibited'}
        animationType="slide"
        transparent
        onRequestClose={() => setActiveModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
            <View style={styles.modalHeader}>
              <View style={[styles.modalIconWrap, { backgroundColor: C.errorSubtle }]}>
                <MaterialIcons name="block" size={24} color={C.error} />
              </View>
              <Text style={[styles.modalTitle, { color: C.textPrimary }]}>
                {isHindi ? 'प्रतिबंधित वस्तुएं नीति' : 'Prohibited Items Policy'}
              </Text>
              <Pressable
                onPress={() => setActiveModal(null)}
                style={[styles.closeBtn, { backgroundColor: C.surfaceElevated }]}
                hitSlop={8}
              >
                <Ionicons name="close" size={20} color={C.textPrimary} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.modalScroll}>
              <Text style={[styles.modalDesc, { color: C.textSecondary }]}>
                {isHindi
                  ? 'CaryGoo पर निम्नलिखित वस्तुओं का परिवहन सख्त वर्जित है। किसी भी उल्लंघन पर खाता तुरंत निलंबित कर दिया जाएगा और पुलिस को सूचित किया जाएगा:'
                  : 'Transporting any of the following items on CaryGoo is strictly prohibited by law. Violations result in immediate permanent account suspension, secure payment hold forfeiture, and law enforcement escalation:'}
              </Text>

              <View style={styles.bulletList}>
                {[
                  {
                    titleEn: 'Explosives & Flammables',
                    titleHi: 'विस्फोटक एवं ज्वलनशील पदार्थ',
                    descEn: 'Fireworks, ammunition, fuels, lighter gas, matchboxes, and volatile solvents.',
                    descHi: 'पटाखे, गोला-बारूद, ईंधन, लाइटर गैस और ज्वलनशील तरल।',
                  },
                  {
                    titleEn: 'Illegal Narcotics & Contraband',
                    titleHi: 'अवैध नशीले पदार्थ एवं तस्करी वस्तुएं',
                    descEn: 'Narcotics, banned psychotropic substances, smuggled luxury items, and undeclared cash beyond statutory limits.',
                    descHi: 'नशीले पदार्थ, प्रतिबंधित दवाएं और कानून द्वारा वर्जित वस्तुएं।',
                  },
                  {
                    titleEn: 'Weapons & Sharp Tactical Instruments',
                    titleHi: 'हथियार एवं नुकीले सामरिक उपकरण',
                    descEn: 'Firearms, replica guns, tasers, tactical knives, and unlicensed defense sprays.',
                    descHi: 'आग्नेयास्त्र, नकली बंदूकें, चाकू और बिना लाइसेंस वाले हथियार।',
                  },
                  {
                    titleEn: 'Hazardous Chemicals & Biological Matter',
                    titleHi: 'खतरनाक रसायन एवं जैविक सामग्री',
                    descEn: 'Toxic poisons, acids, corrosive reagents, biohazard clinical samples, and radioactive isotopes.',
                    descHi: 'जहरीले रसायन, एसिड, संक्षारक पदार्थ और बायोहाज़र्ड नमूने।',
                  },
                  {
                    titleEn: 'Wildlife & Flora Protected Goods',
                    titleHi: 'वन्यजीव एवं संरक्षित वनस्पति उत्पाद',
                    descEn: 'Items prohibited under the Wildlife Protection Act, 1972, including animal hides, tusks, and rare herbs.',
                    descHi: 'वन्यजीव संरक्षण अधिनियम के तहत प्रतिबंधित पशु उत्पाद और दुर्लभ वनस्पतियां।',
                  },
                  {
                    titleEn: 'Perishable Bio-Hazards & Unpackaged Food',
                    titleHi: 'खराब होने वाली सामग्रियां एवं कच्चा भोजन',
                    descEn: 'Raw meat, non-refrigerated perishables prone to rot, and leaking liquids.',
                    descHi: 'कच्चा मांस, सड़ने वाली वस्तुएं और लीक होने वाले तरल पदार्थ।',
                  },
                ].map((item, idx) => (
                  <View key={idx} style={[styles.prohibitedItemCard, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }]}>
                    <View style={styles.prohibitedItemHeader}>
                      <MaterialIcons name="cancel" size={16} color={C.error} />
                      <Text style={[styles.prohibitedItemTitle, { color: C.textPrimary }]}>
                        {isHindi ? item.titleHi : item.titleEn}
                      </Text>
                    </View>
                    <Text style={[styles.prohibitedItemDesc, { color: C.textSecondary }]}>
                      {isHindi ? item.descHi : item.descEn}
                    </Text>
                  </View>
                ))}
              </View>
            </ScrollView>

            <Pressable
              style={[styles.modalActionBtn, { backgroundColor: C.primary }]}
              onPress={() => setActiveModal(null)}
            >
              <Text style={styles.modalActionBtnText}>
                {isHindi ? 'मैं समझता हूं एवं सहमत हूं' : 'I Understand & Acknowledge'}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Community Safety Modal */}
      <Modal
        visible={activeModal === 'safety'}
        animationType="slide"
        transparent
        onRequestClose={() => setActiveModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
            <View style={styles.modalHeader}>
              <View style={[styles.modalIconWrap, { backgroundColor: C.primarySubtle }]}>
                <MaterialIcons name="verified-user" size={24} color={C.primary} />
              </View>
              <Text style={[styles.modalTitle, { color: C.textPrimary }]}>
                {isHindi ? 'सामुदायिक सुरक्षा दिशानिर्देश' : 'Community Safety Guidelines'}
              </Text>
              <Pressable
                onPress={() => setActiveModal(null)}
                style={[styles.closeBtn, { backgroundColor: C.surfaceElevated }]}
                hitSlop={8}
              >
                <Ionicons name="close" size={20} color={C.textPrimary} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.modalScroll}>
              <Text style={[styles.modalDesc, { color: C.textSecondary }]}>
                {isHindi
                  ? 'CaryGoo पर हर यात्रा और डिलीवरी में सुरक्षा सर्वोच्च प्राथमिकता है। कृपया इन मूलभूत दिशानिर्देशों का पालन करें:'
                  : 'Safety is the foundation of CaryGoo. All participants agree to uphold these essential community safety principles:'}
              </Text>

              <View style={styles.bulletList}>
                {[
                  {
                    titleEn: 'Right to Inspect Prior to Handover',
                    titleHi: 'हैंडओवर से पहले पार्सल जांच का अधिकार',
                    descEn: 'Travelers have the legal right and responsibility to visually verify the contents of any parcel before accepting it into their care.',
                    descHi: 'यात्रियों को पार्सल स्वीकार करने से पहले उसकी सामग्री की भौतिक जांच करने का पूरा कानूनी अधिकार है।',
                  },
                  {
                    titleEn: 'Mandatory In-Person OTP Verification',
                    titleHi: 'आमने-सामने अनिवार्य ओटीपी सत्यापन',
                    descEn: 'Never share the delivery completion OTP over phone or chat. The recipient must only provide the OTP upon inspecting and receiving the parcel.',
                    descHi: 'ओटीपी कभी फोन या चैट पर साझा न करें। पार्सल प्राप्त करने के बाद ही इसे दर्ज करें।',
                  },
                  {
                    titleEn: 'Strictly No Offline Unrecorded Payments',
                    titleHi: 'ऑफलाइन भुगतान पूरी तरह वर्जित',
                    descEn: 'All deliveries must be reserved through CaryGoo Safe Pay. Offline cash transactions violate community rules and void all dispute protection.',
                    descHi: 'सभी भुगतान केवल CaryGoo Safe Pay के माध्यम से होने चाहिए ताकि आपकी सुरक्षा सुनिश्चित रहे।',
                  },
                  {
                    titleEn: 'Public & Well-Lit Meeting Locations',
                    titleHi: 'सुरक्षित एवं सार्वजनिक मिलन स्थल',
                    descEn: 'Pickups and drop-offs should always occur at busy, public locations such as transit stations, metro gates, or shopping centers.',
                    descHi: 'पिकअप और ड्रॉप हमेशा सार्वजनिक और रोशनी वाली जगहों (जैसे मेट्रो स्टेशन या बस स्टैंड) पर करें।',
                  },
                ].map((item, idx) => (
                  <View key={idx} style={[styles.prohibitedItemCard, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }]}>
                    <View style={styles.prohibitedItemHeader}>
                      <MaterialIcons name="check-circle" size={16} color={C.success} />
                      <Text style={[styles.prohibitedItemTitle, { color: C.textPrimary }]}>
                        {isHindi ? item.titleHi : item.titleEn}
                      </Text>
                    </View>
                    <Text style={[styles.prohibitedItemDesc, { color: C.textSecondary }]}>
                      {isHindi ? item.descHi : item.descEn}
                    </Text>
                  </View>
                ))}
              </View>
            </ScrollView>

            <Pressable
              style={[styles.modalActionBtn, { backgroundColor: C.primary }]}
              onPress={() => setActiveModal(null)}
            >
              <Text style={styles.modalActionBtnText}>
                {isHindi ? 'मैं सहमत हूं' : 'Understood'}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    gap: Spacing.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  content: {
    padding: Spacing.md,
    gap: Spacing.md,
  },

  // Hero Card
  heroCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  badgeText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  heroTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    letterSpacing: -0.3,
  },
  heroDesc: {
    fontSize: FontSize.sm,
    lineHeight: 20,
  },
  highlightsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  highlightPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  highlightText: {
    fontSize: 11,
    fontWeight: FontWeight.semibold,
  },

  sectionHeading: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: Spacing.xs,
    marginLeft: Spacing.xs,
  },

  // Cards Grid
  cardsGrid: {
    gap: Spacing.sm,
  },
  docCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
  },
  docHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docHeaderMeta: {
    flex: 1,
    gap: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.xs,
  },
  docTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    flexShrink: 1,
  },
  docBadge: {
    paddingHorizontal: Spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  docBadgeText: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
  },
  docDesc: {
    fontSize: FontSize.xs,
    lineHeight: 17,
  },
  chevron: {
    marginLeft: 2,
  },

  // Regulatory Disclosures
  disclosureCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  disclosureHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: 4,
  },
  disclosureTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  disclosureText: {
    fontSize: FontSize.xs,
    lineHeight: 18,
    marginBottom: Spacing.xs,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xs,
    borderTopWidth: 1,
  },
  infoLabel: {
    fontSize: FontSize.xs,
  },
  infoVal: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  turnaroundText: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: Spacing.xs,
    fontStyle: 'italic',
  },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    maxHeight: '85%',
    borderTopLeftRadius: BorderRadius.xxl,
    borderTopRightRadius: BorderRadius.xxl,
    borderTopWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  modalIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    flex: 1,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalScroll: {
    maxHeight: 380,
  },
  modalDesc: {
    fontSize: FontSize.sm,
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  bulletList: {
    gap: Spacing.sm,
  },
  prohibitedItemCard: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: 4,
  },
  prohibitedItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  prohibitedItemTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  prohibitedItemDesc: {
    fontSize: FontSize.xs,
    lineHeight: 17,
  },
  modalActionBtn: {
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.xs,
  },
  modalActionBtnText: {
    color: '#ffffff',
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
});
