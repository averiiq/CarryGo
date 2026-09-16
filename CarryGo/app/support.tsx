import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Linking,
  Platform,
  RefreshControl,
  LayoutAnimation,
  Platform as RNPlatform,
  UIManager,
  Modal,
  KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useAuth } from '@/hooks/useAuth';
import { useAlert } from '@/template';
import { useResponsive } from '@/hooks/useResponsive';
import { Haptic } from '@/services/haptics.service';
import {
  BorderRadius,
  FontSize,
  FontWeight,
  Spacing,
  TouchTarget,
  ThemeColors,
} from '@/constants/theme';
import {
  SupportTicketCategory,
  SupportTicketStatus,
  Request,
} from '@/types';
import {
  SUPPORT_CATEGORIES,
  validateTicketInput,
  ShipmentContext,
} from '@/services/support.service';
import {
  useSupportTicketsQuery,
  useSupportTicketsRealtime,
  useCreateSupportTicketMutation,
} from '@/features/support/queries';
import { useRequestsQuery } from '@/features/requests/queries';

if (
  RNPlatform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type SupportTab = 'faq' | 'raise' | 'tickets';
type TicketFilter = 'all' | 'active' | 'resolved';

interface FaqArticle {
  id: string;
  category: 'delivery' | 'payment' | 'cancellation' | 'safety' | 'kyc';
  ticketCategory: SupportTicketCategory;
  question: string;
  answer: string;
}

const FAQ_ARTICLES: FaqArticle[] = [
  {
    id: 'f1',
    category: 'delivery',
    ticketCategory: 'delivery_issue',
    question: 'How does OTP verification secure parcel handover?',
    answer:
      'CarryGo uses a dual-verification process. When a traveler picks up your parcel, pickup is confirmed in the app. At the destination, the sender/recipient receives a secret 6-digit delivery OTP. The traveler enters this OTP to unlock and confirm delivery, ensuring goods are never marked delivered prematurely.',
  },
  {
    id: 'f2',
    category: 'payment',
    ticketCategory: 'payment_refund',
    question: 'When is escrow payment released to the traveler?',
    answer:
      'When you accept a delivery request, payment is held safely in escrow via Razorpay. The traveler is only paid after the destination OTP is verified and delivery is confirmed. This guarantees senders are protected from no-shows and travelers receive immediate payment upon completion.',
  },
  {
    id: 'f3',
    category: 'delivery',
    ticketCategory: 'delivery_issue',
    question: 'What if the traveler is delayed or unreachable?',
    answer:
      'You can monitor real-time tracking in the app and coordinate via chat. If a traveler is over 3 hours delayed or stops responding, you can raise an escalation ticket or cancel the request. Escrow funds will be refunded according to our cancellation policies.',
  },
  {
    id: 'f4',
    category: 'payment',
    ticketCategory: 'payment_refund',
    question: 'How are refunds processed for cancelled requests?',
    answer:
      'If a booking is cancelled before parcel pickup has occurred, a full refund is initiated automatically to your original payment method. Depending on your bank or UPI provider, the refund typically reflects within 2 to 4 business days.',
  },
  {
    id: 'f5',
    category: 'kyc',
    ticketCategory: 'kyc_account',
    question: 'Why is government ID verification mandatory?',
    answer:
      'To safeguard our peer-to-peer community and prevent fraudulent activity, all users sending or carrying parcels must complete ID verification (Aadhaar or Driving License). This ensures verified identities for all parties during handovers.',
  },
  {
    id: 'f6',
    category: 'safety',
    ticketCategory: 'safety_conduct',
    question: 'What items are strictly prohibited on CarryGo?',
    answer:
      'Illegal narcotics, firearms, ammunition, flammable liquids, hazardous chemicals, cash/currency notes above legal limits, and perishable contraband are strictly prohibited. Travelers have the legal right to inspect parcels at pickup before accepting.',
  },
  {
    id: 'f7',
    category: 'cancellation',
    ticketCategory: 'payment_refund',
    question: 'Can I cancel after the parcel has been picked up?',
    answer:
      'Once a parcel is in transit, automatic cancellation is disabled because the parcel is with the traveler. If an emergency arises, both parties must coordinate via chat and contact Support immediately to arrange safe return.',
  },
  {
    id: 'f8',
    category: 'safety',
    ticketCategory: 'delivery_issue',
    question: 'What should I do if a parcel arrives damaged?',
    answer:
      'Do not share the delivery OTP. Take clear photos of the damaged packaging immediately and submit a support ticket under "Delivery Issue". Our trust and safety team will freeze escrow payment and investigate.',
  },
];

const CATEGORY_ICONS: Record<SupportTicketCategory, keyof typeof MaterialIcons.glyphMap> = {
  delivery_issue: 'local-shipping',
  payment_refund: 'account-balance-wallet',
  kyc_account: 'verified-user',
  safety_conduct: 'shield',
  technical_bug: 'bug-report',
  general: 'help-outline',
};

interface ChatMessage {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  timestamp: string;
  action?: {
    label: string;
    tab?: SupportTab;
  };
}

const CHATBOT_PROMPTS = [
  'How does delivery OTP work?',
  'What items are prohibited?',
  'How do escrow refunds work?',
  'Where can I track my parcel?',
  'Speak with human ops team',
];

const BOT_KNOWLEDGE_BASE = [
  {
    keywords: ['otp', 'pin', 'code', 'handover', 'secret', 'release', 'verification'],
    answer:
      'CarryGo protects transactions with a dual-OTP protocol. At pickup, a handover OTP is confirmed. At final delivery, the recipient shares a secret 6-digit OTP with the traveler. Escrow payment is only released once this delivery OTP is successfully validated in the app.',
    actionLabel: 'Report an OTP Dispute',
  },
  {
    keywords: ['prohibit', 'allowed', 'liquid', 'item', 'rule', 'battery', 'batteries', 'food', 'gold', 'contraband', 'restrictions'],
    answer:
      'For airline and surface safety, prohibited items include: flammable liquids, aerosols, unpackaged perishables, batteries exceeding airline watt-hour limits, valuable untracked bullion, and contraband. All packages must be inspected by the traveler before acceptance.',
    actionLabel: 'View Safety Policies',
  },
  {
    keywords: ['refund', 'money', 'cancel', 'escrow', 'charge', 'cost', 'fee', 'payout', 'bank'],
    answer:
      'All payments are held securely in CarryGo Escrow. If a delivery is cancelled before the physical parcel handover takes place, 100% of your escrow payment is automatically refunded to your original payment method within 24 to 48 hours.',
    actionLabel: 'Report Payment Issue',
  },
  {
    keywords: ['track', 'where', 'location', 'status', 'transit', 'update', 'package'],
    answer:
      'You can track active deliveries under the Activity tab ("My Deliveries"). You can also open the direct in-app Coordination Chat with your traveler or sender to coordinate exact pickup timings and drop-off points.',
    actionLabel: 'Need Help Finding Partner?',
  },
  {
    keywords: ['kyc', 'id', 'aadhaar', 'passport', 'verify', 'document', 'badge'],
    answer:
      'Government ID verification (Aadhaar, Driving License, or Passport) is required for both travelers and senders. Once verified, a green badge appears on your profile and unlocks unlimited delivery matching.',
    actionLabel: 'Complete Verification',
  },
  {
    keywords: ['human', 'agent', 'ticket', 'support', 'dispute', 'person', 'representative', 'talk', 'complaint', 'stuck', 'fraud', 'stolen', 'help'],
    answer:
      'Our dedicated operations team is standing by to investigate any active delivery or dispute. If this requires human assistance, you can open an incident ticket directly with all details.',
    actionLabel: 'Submit Ticket Now',
  },
];

function getBotResponse(userQuery: string): { answer: string; hasTicketEscalation: boolean } {
  const query = userQuery.toLowerCase().trim();
  for (const item of BOT_KNOWLEDGE_BASE) {
    if (item.keywords.some((kw) => query.includes(kw))) {
      return { answer: item.answer, hasTicketEscalation: true };
    }
  }
  return {
    answer:
      "I'm here to assist with deliveries, OTP handovers, luggage guidelines, and platform policies! If your issue requires specialized investigation, you can submit a formal incident ticket directly to our operations team.",
    hasTicketEscalation: true,
  };
}

function StatusPill({ status, C }: { status: SupportTicketStatus; C: ThemeColors }) {
  const config = {
    open: { label: 'Open', color: '#D97706', bg: '#FEF3C7' },
    in_progress: { label: 'In Progress', color: '#0284C7', bg: '#E0F2FE' },
    resolved: { label: 'Resolved', color: '#059669', bg: '#D1FAE5' },
    closed: { label: 'Closed', color: '#64748B', bg: '#F1F5F9' },
  }[status] || { label: status, color: '#64748B', bg: '#F1F5F9' };

  return (
    <View style={[styles.statusPill, { backgroundColor: config.bg }]}>
      <Text style={[styles.statusPillText, { color: config.color }]}>
        {config.label}
      </Text>
    </View>
  );
}

export default function SupportScreen() {
  const { C } = useThemeColors();
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isTablet } = useResponsive();

  const [activeTab, setActiveTab] = useState<SupportTab>('faq');
  const [faqSearch, setFaqSearch] = useState('');
  const [selectedFaqCategory, setSelectedFaqCategory] = useState<string>('all');
  const [expandedFaqId, setExpandedFaqId] = useState<string | null>(null);

  // Form State
  const [category, setCategory] = useState<SupportTicketCategory>('delivery_issue');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [selectedShipment, setSelectedShipment] = useState<Request | null>(null);
  const [showShipmentPicker, setShowShipmentPicker] = useState(false);
  const [isDraftRestored, setIsDraftRestored] = useState(false);

  // Ticket history filter
  const [ticketFilter, setTicketFilter] = useState<TicketFilter>('all');
  const [expandedTicketId, setExpandedTicketId] = useState<string | null>(null);
  const [copiedTicketId, setCopiedTicketId] = useState<string | null>(null);

  // Email copy state
  const [copiedEmail, setCopiedEmail] = useState(false);

  // FAQ feedback state
  const [faqFeedback, setFaqFeedback] = useState<Record<string, 'yes' | 'no'>>({});

  // ChatBot state
  const [showChatBotModal, setShowChatBotModal] = useState(false);
  const [chatBotMessages, setChatBotMessages] = useState<ChatMessage[]>([
    {
      id: 'm-init',
      sender: 'bot',
      text: 'Hi there! 👋 I am your CarryGo Support Assistant. How can I assist you with your shipments, OTP verification, escrow payments, or platform rules today?',
      timestamp: 'Just now',
    },
  ]);
  const [chatBotInput, setChatBotInput] = useState('');
  const [isBotTyping, setIsBotTyping] = useState(false);
  const chatBotScrollRef = useRef<ScrollView>(null);

  // Live real-time sync
  useSupportTicketsRealtime(user?.id);

  const ticketsQuery = useSupportTicketsQuery(user?.id);
  const requestsQuery = useRequestsQuery(user?.id);
  const createTicketMutation = useCreateSupportTicketMutation();

  const tickets = ticketsQuery.data ?? [];
  const userRequests = requestsQuery.data ?? [];
  const activeShipments = userRequests.filter(
    (r) => r.status === 'accepted' || r.status === 'pending'
  );

  const openTicketsCount = tickets.filter(
    (t) => t.status === 'open' || t.status === 'in_progress'
  ).length;

  const draftKey = user?.id ? `@carrygo_support_draft_${user.id}` : null;

  // Restore draft
  useEffect(() => {
    if (!draftKey) return;
    async function loadDraft() {
      try {
        const raw = await AsyncStorage.getItem(draftKey!);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.subject || parsed.description) {
            setSubject(parsed.subject || '');
            setDescription(parsed.description || '');
            if (parsed.category) setCategory(parsed.category);
            setIsDraftRestored(true);
          }
        }
      } catch {
        // Ignore draft loading errors
      }
    }
    loadDraft();
  }, [draftKey]);

  // Save draft (debounced)
  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!draftKey) return;
    if (draftTimerRef.current) clearTimeout(draftTimerRef.current);

    draftTimerRef.current = setTimeout(async () => {
      try {
        if (subject.trim() || description.trim()) {
          await AsyncStorage.setItem(
            draftKey,
            JSON.stringify({ subject, description, category })
          );
        }
      } catch {
        // Ignore draft saving errors
      }
    }, 600);

    return () => {
      if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    };
  }, [draftKey, subject, description, category]);

  const clearDraft = async () => {
    Haptic.tap();
    setSubject('');
    setDescription('');
    setSelectedShipment(null);
    setIsDraftRestored(false);
    if (draftKey) {
      await AsyncStorage.removeItem(draftKey);
    }
  };

  const toggleFaq = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedFaqId((prev) => (prev === id ? null : id));
    Haptic.select();
  };

  const toggleTicket = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedTicketId((prev) => (prev === id ? null : id));
    Haptic.select();
  };

  const handleCopyTicketId = async (id: string) => {
    Haptic.confirm();
    await Clipboard.setStringAsync(id);
    setCopiedTicketId(id);
    setTimeout(() => setCopiedTicketId(null), 2000);
  };

  const handleFaqFeedback = (faqId: string, rating: 'yes' | 'no') => {
    Haptic.select();
    setFaqFeedback((prev) => ({ ...prev, [faqId]: rating }));
  };

  const filteredFaqs = useMemo(() => {
    return FAQ_ARTICLES.filter((article) => {
      const matchesCategory =
        selectedFaqCategory === 'all' || article.category === selectedFaqCategory;
      const query = faqSearch.toLowerCase().trim();
      const matchesSearch =
        !query ||
        article.question.toLowerCase().includes(query) ||
        article.answer.toLowerCase().includes(query);
      return matchesCategory && matchesSearch;
    });
  }, [selectedFaqCategory, faqSearch]);

  const filteredTickets = useMemo(() => {
    if (ticketFilter === 'active') {
      return tickets.filter((t) => t.status === 'open' || t.status === 'in_progress');
    }
    if (ticketFilter === 'resolved') {
      return tickets.filter((t) => t.status === 'resolved' || t.status === 'closed');
    }
    return tickets;
  }, [tickets, ticketFilter]);

  const handleEmailSupport = async () => {
    Haptic.tap();
    const appVer = 'v1.2.2';
    const osVer = Platform.OS === 'ios' ? 'iOS' : 'Android';
    const userRef = user?.id ? `User ID: ${user.id}\nEmail: ${user.email}` : 'Anonymous';
    const body = encodeURIComponent(
      `\n\n--- Device Diagnostics ---\nApp Version: ${appVer}\nPlatform: ${osVer}\n${userRef}`
    );
    const url = `mailto:support@carrygo.in?subject=CarryGo%20Support%20Request&body=${body}`;
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
    } else {
      showAlert('Contact Support', 'You can reach us directly at support@carrygo.in', [
        { text: 'OK' },
      ]);
    }
  };

  const handleCopyEmail = async () => {
    Haptic.select();
    await Clipboard.setStringAsync('support@carrygo.in');
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2500);
  };

  const handleSendChatBotMessage = (textToSend?: string) => {
    const text = (textToSend || chatBotInput).trim();
    if (!text) return;
    Haptic.tap();

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: 'Just now',
    };

    setChatBotMessages((prev) => [...prev, userMsg]);
    setChatBotInput('');
    setIsBotTyping(true);

    setTimeout(() => {
      chatBotScrollRef.current?.scrollToEnd({ animated: true });
    }, 80);

    setTimeout(() => {
      const { answer, hasTicketEscalation } = getBotResponse(text);
      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: answer,
        timestamp: 'Just now',
        action: hasTicketEscalation
          ? {
              label: 'Submit Incident Ticket',
              tab: 'raise',
            }
          : undefined,
      };

      setIsBotTyping(false);
      setChatBotMessages((prev) => [...prev, botMsg]);
      Haptic.select();

      setTimeout(() => {
        chatBotScrollRef.current?.scrollToEnd({ animated: true });
      }, 80);
    }, 550);
  };

  const handleSubmitTicket = async () => {
    if (!user) {
      showAlert('Sign In Required', 'Please sign in to submit a support ticket.', [
        { text: 'OK' },
      ]);
      return;
    }

    const validation = validateTicketInput({
      userId: user.id,
      subject,
      description,
      category,
    });

    if (!validation.valid) {
      Haptic.warning();
      showAlert('Please Check', validation.error || 'Please fill in all required fields.', [
        { text: 'OK' },
      ]);
      return;
    }

    Haptic.tap();

    const shipmentContext: ShipmentContext | undefined = selectedShipment
      ? {
          requestId: selectedShipment.id,
          parcelId: selectedShipment.parcelId,
          tripId: selectedShipment.tripId,
          route:
            selectedShipment.fromCity && selectedShipment.toCity
              ? `${selectedShipment.fromCity} → ${selectedShipment.toCity}`
              : undefined,
          role: selectedShipment.senderId === user.id ? 'Sender' : 'Traveler',
        }
      : undefined;

    try {
      await createTicketMutation.mutateAsync({
        userId: user.id,
        subject,
        description,
        category,
        shipmentContext,
      });

      Haptic.success();
      showAlert(
        'Ticket Submitted',
        'Your support request has been logged. Our operations team will review it and update you shortly.',
        [{ text: 'View Tickets', onPress: () => setActiveTab('tickets') }]
      );

      // Reset form & remove draft
      setSubject('');
      setDescription('');
      setSelectedShipment(null);
      setCategory('delivery_issue');
      setIsDraftRestored(false);
      if (draftKey) {
        await AsyncStorage.removeItem(draftKey);
      }
      setActiveTab('tickets');
    } catch (err: any) {
      Haptic.error();
      showAlert(
        'Submission Error',
        err?.message || 'Unable to submit ticket. Please check your connection and try again.',
        [{ text: 'OK' }]
      );
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: C.background, paddingTop: insets.top }]}>
      {/* Top App Bar */}
      <View style={[styles.topBar, { borderBottomColor: C.surfaceBorder }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => {
            Haptic.tap();
            router.back();
          }}
          style={[styles.iconButton, { backgroundColor: C.surfaceElevated }]}
          hitSlop={TouchTarget.smallHitSlop}
        >
          <MaterialIcons name="arrow-back" size={20} color={C.textPrimary} />
        </Pressable>

        <View style={styles.topBarTitleCenter}>
          <Text style={[styles.topBarTitle, { color: C.textPrimary }]}>Help & Support</Text>
        </View>

        <View
          style={[
            styles.topLiveBadge,
            { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder },
          ]}
        >
          <View style={styles.topLiveDot} />
          <Text style={[styles.topLiveText, { color: C.textSecondary }]}>Live 24/7</Text>
        </View>
      </View>

      {/* Floating Segmented Navigation */}
      <View style={styles.segmentedNavWrap}>
        <View style={[styles.segmentedNav, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
          <Pressable
            style={[
              styles.segmentItem,
              activeTab === 'faq' && [styles.segmentItemActive, { backgroundColor: C.primarySubtle }],
            ]}
            onPress={() => {
              Haptic.select();
              setActiveTab('faq');
            }}
          >
            <Text
              style={[
                styles.segmentText,
                { color: activeTab === 'faq' ? C.primary : C.textMuted },
                activeTab === 'faq' && styles.segmentTextActive,
              ]}
            >
              Help Center
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.segmentItem,
              activeTab === 'raise' && [styles.segmentItemActive, { backgroundColor: C.primarySubtle }],
            ]}
            onPress={() => {
              Haptic.select();
              setActiveTab('raise');
            }}
          >
            <Text
              style={[
                styles.segmentText,
                { color: activeTab === 'raise' ? C.primary : C.textMuted },
                activeTab === 'raise' && styles.segmentTextActive,
              ]}
            >
              Raise Ticket
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.segmentItem,
              activeTab === 'tickets' && [styles.segmentItemActive, { backgroundColor: C.primarySubtle }],
            ]}
            onPress={() => {
              Haptic.select();
              setActiveTab('tickets');
            }}
          >
            <View style={styles.tabTextWithBadge}>
              <Text
                style={[
                  styles.segmentText,
                  { color: activeTab === 'tickets' ? C.primary : C.textMuted },
                  activeTab === 'tickets' && styles.segmentTextActive,
                ]}
              >
                My Tickets
              </Text>
              {openTicketsCount > 0 && (
                <View style={[styles.tabBadgeDot, { backgroundColor: C.warning }]} />
              )}
            </View>
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + Spacing.xxl + 30 },
          isTablet && styles.tabletScrollContent,
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          activeTab === 'tickets' ? (
            <RefreshControl
              refreshing={ticketsQuery.isRefetching}
              onRefresh={() => ticketsQuery.refetch()}
              tintColor={C.primary}
            />
          ) : undefined
        }
      >
        {/* TAB 1: HELP CENTER */}
        {activeTab === 'faq' && (
          <View style={styles.sectionBlock}>
            {/* Module 1: Direct Support Desk Hub */}
            <View
              style={[
                styles.modularHubCard,
                { backgroundColor: C.surface, borderColor: C.surfaceBorder },
              ]}
            >
              {/* Official Email Row */}
              <Pressable
                style={[
                  styles.modularEmailRow,
                  { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder },
                ]}
                onPress={handleCopyEmail}
                accessibilityRole="button"
                accessibilityLabel="Copy official support email"
              >
                <View style={[styles.modularEmailIconWrap, { backgroundColor: C.primarySubtle }]}>
                  <MaterialIcons name="mail-outline" size={16} color={C.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.modularEmailLabel, { color: C.textMuted }]}>
                    Official Support Email
                  </Text>
                  <Text style={[styles.modularEmailAddress, { color: C.textPrimary }]}>
                    support@carrygo.in
                  </Text>
                </View>
                <View
                  style={[
                    styles.modularCopyBadge,
                    {
                      backgroundColor: copiedEmail ? C.primarySubtle : C.surface,
                      borderColor: copiedEmail ? C.primary : C.surfaceBorder,
                    },
                  ]}
                >
                  <MaterialIcons
                    name={copiedEmail ? 'check' : 'content-copy'}
                    size={12}
                    color={copiedEmail ? C.primary : C.textMuted}
                  />
                  <Text
                    style={[
                      styles.modularCopyBadgeText,
                      { color: copiedEmail ? C.primary : C.textSecondary },
                    ]}
                  >
                    {copiedEmail ? 'Copied' : 'Copy'}
                  </Text>
                </View>
              </Pressable>

              {/* Action Buttons: AI Assistant & Submit Ticket */}
              <View style={styles.modularActionSplit}>
                <Pressable
                  style={({ pressed }) => [
                    styles.modularActionBtn,
                    { backgroundColor: C.primary },
                    pressed && { opacity: 0.9 },
                  ]}
                  onPress={() => {
                    Haptic.select();
                    setShowChatBotModal(true);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Ask CarryGo AI Assistant"
                >
                  <MaterialIcons name="smart-toy" size={17} color="#FFFFFF" />
                  <Text style={styles.modularActionBtnTextWhite}>Ask AI Assistant</Text>
                </Pressable>

                <Pressable
                  style={({ pressed }) => [
                    styles.modularActionBtn,
                    { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder, borderWidth: 1 },
                    pressed && { opacity: 0.9 },
                  ]}
                  onPress={() => {
                    Haptic.select();
                    setActiveTab('raise');
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Raise Support Ticket"
                >
                  <MaterialIcons name="assignment" size={17} color={C.textPrimary} />
                  <Text style={[styles.modularActionBtnText, { color: C.textPrimary }]}>
                    Raise Ticket
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* Module 2: Search Input */}
            <View
              style={[
                styles.searchCard,
                { backgroundColor: C.surface, borderColor: C.surfaceBorder },
              ]}
            >
              <Ionicons name="search" size={16} color={C.textMuted} />
              <TextInput
                style={[styles.searchInput, { color: C.textPrimary }]}
                placeholder="Search verified answers (OTP, refunds, tracking)..."
                placeholderTextColor={C.textMuted}
                value={faqSearch}
                onChangeText={setFaqSearch}
                clearButtonMode="while-editing"
              />
              {faqSearch.length > 0 && (
                <Pressable onPress={() => setFaqSearch('')} hitSlop={TouchTarget.smallHitSlop}>
                  <Ionicons name="close-circle" size={16} color={C.textMuted} />
                </Pressable>
              )}
            </View>

            {/* Category Filter Chips */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalChips}
            >
              {[
                { key: 'all', label: 'All Questions', icon: 'apps' as const },
                { key: 'delivery', label: 'Delivery & OTP', icon: 'local-shipping' as const },
                { key: 'payment', label: 'Escrow & Payouts', icon: 'account-balance-wallet' as const },
                { key: 'safety', label: 'Safety & ID Rules', icon: 'shield' as const },
              ].map((chip) => {
                const isSelected = selectedFaqCategory === chip.key;
                return (
                  <Pressable
                    key={chip.key}
                    style={[
                      styles.chipItem,
                      {
                        backgroundColor: isSelected ? C.primary : C.surface,
                        borderColor: isSelected ? C.primary : C.surfaceBorder,
                      },
                    ]}
                    onPress={() => {
                      Haptic.select();
                      setSelectedFaqCategory(chip.key);
                    }}
                  >
                    <MaterialIcons
                      name={chip.icon}
                      size={13}
                      color={isSelected ? '#FFFFFF' : C.textMuted}
                    />
                    <Text
                      style={[
                        styles.chipText,
                        { color: isSelected ? '#FFFFFF' : C.textSecondary },
                        isSelected && { fontWeight: FontWeight.bold },
                      ]}
                    >
                      {chip.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Module 3: FAQ Accordion List */}
            <View style={styles.faqCardStack}>
              {filteredFaqs.length === 0 ? (
                <View
                  style={[
                    styles.emptyBox,
                    { backgroundColor: C.surface, borderColor: C.surfaceBorder },
                  ]}
                >
                  <MaterialIcons name="search-off" size={32} color={C.textMuted} />
                  <Text style={[styles.emptyBoxTitle, { color: C.textPrimary }]}>
                    No matching answers
                  </Text>
                  <Text style={[styles.emptyBoxDesc, { color: C.textMuted }]}>
                    Try searching with simpler terms or raise a ticket directly with our ops desk.
                  </Text>
                  <Pressable
                    style={[styles.primaryActionPill, { backgroundColor: C.primary }]}
                    onPress={() => setActiveTab('raise')}
                  >
                    <Text style={styles.primaryActionPillText}>Raise a Ticket</Text>
                  </Pressable>
                </View>
              ) : (
                filteredFaqs.map((faq) => {
                  const isExpanded = expandedFaqId === faq.id;
                  const feedback = faqFeedback[faq.id];

                  return (
                    <Pressable
                      key={faq.id}
                      style={[
                        styles.faqRowCard,
                        { backgroundColor: C.surface, borderColor: C.surfaceBorder },
                        isExpanded && {
                          borderColor: C.primaryBorder,
                          borderLeftWidth: 3,
                          borderLeftColor: C.primary,
                        },
                      ]}
                      onPress={() => toggleFaq(faq.id)}
                    >
                      <View style={styles.faqQuestionRow}>
                        <Text style={[styles.faqQuestionText, { color: C.textPrimary }]}>
                          {faq.question}
                        </Text>
                        <View
                          style={[
                            styles.faqChevronCircle,
                            { backgroundColor: C.surfaceElevated },
                          ]}
                        >
                          <MaterialIcons
                            name={isExpanded ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                            size={18}
                            color={isExpanded ? C.primary : C.textMuted}
                          />
                        </View>
                      </View>

                      {isExpanded && (
                        <View style={styles.faqAnswerContainer}>
                          <Text style={[styles.faqAnswerParagraph, { color: C.textSecondary }]}>
                            {faq.answer}
                          </Text>

                          {/* Interactive Helpfulness Feedback Strip */}
                          <View style={[styles.faqFeedbackRow, { borderTopColor: C.surfaceBorder }]}>
                            <Text style={[styles.faqFeedbackLabel, { color: C.textMuted }]}>
                              Was this helpful?
                            </Text>

                            <View style={styles.faqFeedbackButtonGroup}>
                              <Pressable
                                style={[
                                  styles.faqFeedbackBtn,
                                  { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder },
                                  feedback === 'yes' && { backgroundColor: '#D1FAE5', borderColor: '#A7F3D0' },
                                ]}
                                onPress={() => handleFaqFeedback(faq.id, 'yes')}
                              >
                                <Text
                                  style={[
                                    styles.faqFeedbackBtnText,
                                    { color: feedback === 'yes' ? '#065F46' : C.textSecondary },
                                  ]}
                                >
                                  👍 Yes
                                </Text>
                              </Pressable>

                              <Pressable
                                style={[
                                  styles.faqFeedbackBtn,
                                  { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder },
                                  feedback === 'no' && { backgroundColor: '#FEE2E2', borderColor: '#FECACA' },
                                ]}
                                onPress={() => handleFaqFeedback(faq.id, 'no')}
                              >
                                <Text
                                  style={[
                                    styles.faqFeedbackBtnText,
                                    { color: feedback === 'no' ? '#991B1B' : C.textSecondary },
                                  ]}
                                >
                                  👎 No
                                </Text>
                              </Pressable>
                            </View>
                          </View>

                          {/* Reassurance prompt when user votes 'No' */}
                          {feedback === 'no' && (
                            <Pressable
                              style={[styles.faqHelpEscalateCard, { backgroundColor: C.primarySubtle }]}
                              onPress={() => {
                                Haptic.select();
                                setActiveTab('raise');
                              }}
                            >
                              <MaterialIcons name="support-agent" size={16} color={C.primary} />
                              <Text style={[styles.faqHelpEscalateText, { color: C.primary }]}>
                                Still have questions? Submit an incident ticket ➔
                              </Text>
                            </Pressable>
                          )}
                        </View>
                      )}
                    </Pressable>
                  );
                })
              )}
            </View>
          </View>
        )}

        {/* TAB 2: RAISE A TICKET */}
        {activeTab === 'raise' && (
          <View style={styles.sectionBlock}>
            {/* Draft Notice */}
            {isDraftRestored && (
              <View
                style={[
                  styles.draftBanner,
                  { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder },
                ]}
              >
                <View style={styles.draftBannerLeft}>
                  <MaterialIcons name="restore" size={15} color={C.primary} />
                  <Text style={[styles.draftBannerText, { color: C.textSecondary }]}>
                    Unsaved draft restored
                  </Text>
                </View>
                <Pressable onPress={clearDraft} hitSlop={TouchTarget.smallHitSlop}>
                  <Text style={[styles.draftBannerAction, { color: C.error }]}>Discard</Text>
                </Pressable>
              </View>
            )}

            <View
              style={[
                styles.ticketFormCard,
                { backgroundColor: C.surface, borderColor: C.surfaceBorder },
              ]}
            >
              <View>
                <Text style={[styles.formTitle, { color: C.textPrimary }]}>Submit an Issue</Text>
                <Text style={[styles.formSubtitle, { color: C.textMuted }]}>
                  Describe what happened and our ops agents will respond promptly.
                </Text>
              </View>

              {/* Step 1: Topic Selector */}
              <View style={styles.formFieldGroup}>
                <Text style={[styles.fieldLabel, { color: C.textSecondary }]}>Select Topic</Text>
                <View style={styles.categoryPillsRow}>
                  {(Object.keys(SUPPORT_CATEGORIES) as SupportTicketCategory[]).map((catKey) => {
                    const isSelected = category === catKey;
                    const item = SUPPORT_CATEGORIES[catKey];
                    const iconName = CATEGORY_ICONS[catKey];

                    return (
                      <Pressable
                        key={catKey}
                        style={[
                          styles.categoryPillItem,
                          {
                            backgroundColor: isSelected ? C.primarySubtle : C.surfaceElevated,
                            borderColor: isSelected ? C.primary : C.surfaceBorder,
                          },
                        ]}
                        onPress={() => {
                          Haptic.select();
                          setCategory(catKey);
                        }}
                      >
                        <MaterialIcons
                          name={iconName}
                          size={15}
                          color={isSelected ? C.primary : C.textMuted}
                        />
                        <Text
                          style={[
                            styles.categoryPillLabel,
                            {
                              color: isSelected ? C.primary : C.textPrimary,
                              fontWeight: isSelected ? FontWeight.bold : FontWeight.medium,
                            },
                          ]}
                        >
                          {item.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Step 2: Optional Shipment Attachment */}
              {activeShipments.length > 0 && (
                <View style={styles.formFieldGroup}>
                  <Pressable
                    style={styles.shipmentToggleRow}
                    onPress={() => {
                      Haptic.select();
                      setShowShipmentPicker((prev) => !prev);
                    }}
                  >
                    <Text style={[styles.fieldLabel, { color: C.textSecondary, marginBottom: 0 }]}>
                      Link to an Active Shipment (Optional)
                    </Text>
                    <MaterialIcons
                      name={showShipmentPicker ? 'expand-less' : 'expand-more'}
                      size={18}
                      color={C.textMuted}
                    />
                  </Pressable>

                  {showShipmentPicker && (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.shipmentScrollList}
                    >
                      {activeShipments.map((req) => {
                        const isSelected = selectedShipment?.id === req.id;
                        const label =
                          req.fromCity && req.toCity
                            ? `${req.fromCity} → ${req.toCity}`
                            : `Request #${req.id.slice(0, 6)}`;

                        return (
                          <Pressable
                            key={req.id}
                            style={[
                              styles.shipmentChipBox,
                              {
                                backgroundColor: isSelected ? C.primarySubtle : C.surfaceElevated,
                                borderColor: isSelected ? C.primary : C.surfaceBorder,
                              },
                            ]}
                            onPress={() => {
                              Haptic.select();
                              setSelectedShipment(isSelected ? null : req);
                            }}
                          >
                            <MaterialIcons
                              name={isSelected ? 'check-circle' : 'local-shipping'}
                              size={14}
                              color={isSelected ? C.primary : C.textMuted}
                            />
                            <Text
                              style={[
                                styles.shipmentChipLabel,
                                {
                                  color: isSelected ? C.primary : C.textSecondary,
                                  fontWeight: isSelected ? FontWeight.bold : FontWeight.regular,
                                },
                              ]}
                            >
                              {label}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  )}
                </View>
              )}

              {/* Step 3: Subject Input */}
              <View style={styles.formFieldGroup}>
                <View style={styles.fieldHeader}>
                  <Text style={[styles.fieldLabel, { color: C.textSecondary }]}>Subject</Text>
                  <Text style={[styles.fieldCounter, { color: C.textMuted }]}>
                    {subject.length}/100
                  </Text>
                </View>
                <TextInput
                  style={[
                    styles.textInputControl,
                    {
                      backgroundColor: C.surfaceElevated,
                      borderColor: C.surfaceBorder,
                      color: C.textPrimary,
                    },
                  ]}
                  placeholder="Summary of the issue..."
                  placeholderTextColor={C.textMuted}
                  value={subject}
                  maxLength={100}
                  onChangeText={setSubject}
                />
              </View>

              {/* Step 4: Description Input */}
              <View style={styles.formFieldGroup}>
                <View style={styles.fieldHeader}>
                  <Text style={[styles.fieldLabel, { color: C.textSecondary }]}>Description</Text>
                  <Text
                    style={[
                      styles.fieldCounter,
                      { color: description.length < 15 ? C.warning : C.textMuted },
                    ]}
                  >
                    {description.length}/2000 (min 15)
                  </Text>
                </View>
                <TextInput
                  style={[
                    styles.textInputControl,
                    styles.textAreaControl,
                    {
                      backgroundColor: C.surfaceElevated,
                      borderColor: C.surfaceBorder,
                      color: C.textPrimary,
                    },
                  ]}
                  placeholder="Provide specific details, meetup points, dates, or relevant transaction numbers..."
                  placeholderTextColor={C.textMuted}
                  value={description}
                  maxLength={2000}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  onChangeText={setDescription}
                />
              </View>

              {/* On-the-spot Live Form Diagnostics */}
              {(() => {
                const subTrim = subject.trim();
                const descTrim = description.trim();
                const isErr = createTicketMutation.isError;
                const errMsg = (createTicketMutation.error as any)?.message;

                if (isErr) {
                  return (
                    <View style={[styles.inlineStatusBanner, { backgroundColor: '#FEE2E2', borderColor: '#FCA5A5' }]}>
                      <MaterialIcons name="error-outline" size={16} color="#DC2626" />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.inlineStatusTitle, { color: '#DC2626' }]}>Submission Error</Text>
                        <Text style={[styles.inlineStatusDesc, { color: '#B91C1C' }]}>
                          {errMsg || 'Unable to log ticket due to a network error. Tap below to retry.'}
                        </Text>
                      </View>
                    </View>
                  );
                }

                if (!subTrim) {
                  return (
                    <View style={[styles.inlineStatusBanner, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }]}>
                      <MaterialIcons name="info-outline" size={16} color={C.textMuted} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.inlineStatusTitle, { color: C.textSecondary }]}>Subject Required</Text>
                        <Text style={[styles.inlineStatusDesc, { color: C.textMuted }]}>
                          Enter a brief subject summarizing what happened (at least 5 characters).
                        </Text>
                      </View>
                    </View>
                  );
                }

                if (subTrim.length < 5) {
                  const needed = 5 - subTrim.length;
                  return (
                    <View style={[styles.inlineStatusBanner, { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }]}>
                      <MaterialIcons name="edit" size={16} color="#D97706" />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.inlineStatusTitle, { color: '#D97706' }]}>Subject Too Short</Text>
                        <Text style={[styles.inlineStatusDesc, { color: '#B45309' }]}>
                          Please add {needed} more character{needed > 1 ? 's' : ''} to make the subject clear.
                        </Text>
                      </View>
                    </View>
                  );
                }

                if (descTrim.length < 15) {
                  const needed = 15 - descTrim.length;
                  return (
                    <View style={[styles.inlineStatusBanner, { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }]}>
                      <MaterialIcons name="subject" size={16} color="#D97706" />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.inlineStatusTitle, { color: '#D97706' }]}>Detailed Context Needed</Text>
                        <Text style={[styles.inlineStatusDesc, { color: '#B45309' }]}>
                          Please add {needed} more character{needed > 1 ? 's' : ''} to describe the situation for our support team.
                        </Text>
                      </View>
                    </View>
                  );
                }

                return (
                  <View style={[styles.inlineStatusBanner, { backgroundColor: '#D1FAE5', borderColor: '#A7F3D0' }]}>
                    <MaterialIcons name="check-circle" size={16} color="#059669" />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.inlineStatusTitle, { color: '#059669' }]}>Ready for Submission</Text>
                      <Text style={[styles.inlineStatusDesc, { color: '#047857' }]}>
                        All required details provided. Tap below to submit your incident ticket.
                      </Text>
                    </View>
                  </View>
                );
              })()}

              {/* Submit Button */}
              <Pressable
                style={({ pressed }) => [
                  styles.submitActionBtn,
                  { backgroundColor: C.primary },
                  (createTicketMutation.isPending || subject.trim().length < 5 || description.trim().length < 15) &&
                    styles.submitActionBtnDisabled,
                  pressed && { opacity: 0.9 },
                ]}
                onPress={handleSubmitTicket}
                disabled={
                  createTicketMutation.isPending ||
                  subject.trim().length < 5 ||
                  description.trim().length < 15
                }
              >
                {createTicketMutation.isPending ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <MaterialIcons name="send" size={16} color="#FFFFFF" />
                    <Text style={styles.submitActionBtnText}>Submit Incident Ticket</Text>
                  </>
                )}
              </Pressable>
            </View>
          </View>
        )}

        {/* TAB 3: MY TICKETS */}
        {activeTab === 'tickets' && (
          <View style={styles.sectionBlock}>
            {/* Filter Pills */}
            <View style={styles.ticketFilterNav}>
              {[
                { key: 'all', label: `All (${tickets.length})` },
                { key: 'active', label: `Active (${openTicketsCount})` },
                { key: 'resolved', label: `Resolved (${tickets.length - openTicketsCount})` },
              ].map((f) => {
                const isSelected = ticketFilter === f.key;
                return (
                  <Pressable
                    key={f.key}
                    style={[
                      styles.ticketFilterPill,
                      {
                        backgroundColor: isSelected ? C.primary : C.surface,
                        borderColor: isSelected ? C.primary : C.surfaceBorder,
                      },
                    ]}
                    onPress={() => {
                      Haptic.select();
                      setTicketFilter(f.key as TicketFilter);
                    }}
                  >
                    <Text
                      style={[
                        styles.ticketFilterPillText,
                        { color: isSelected ? '#FFFFFF' : C.textSecondary },
                        isSelected && { fontWeight: FontWeight.bold },
                      ]}
                    >
                      {f.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {ticketsQuery.isLoading ? (
              <View style={styles.centeredLoading}>
                <ActivityIndicator size="large" color={C.primary} />
                <Text style={[styles.centeredLoadingText, { color: C.textMuted }]}>
                  Loading your tickets...
                </Text>
              </View>
            ) : filteredTickets.length === 0 ? (
              <View
                style={[
                  styles.emptyBox,
                  { backgroundColor: C.surface, borderColor: C.surfaceBorder },
                ]}
              >
                <MaterialIcons name="assignment-turned-in" size={38} color={C.primary} />
                <Text style={[styles.emptyBoxTitle, { color: C.textPrimary }]}>
                  {ticketFilter === 'all'
                    ? 'No support tickets yet'
                    : `No ${ticketFilter} tickets`}
                </Text>
                <Text style={[styles.emptyBoxDesc, { color: C.textMuted }]}>
                  {ticketFilter === 'all'
                    ? 'All your reported inquiries, escrow disputes, and delivery tickets will appear here.'
                    : 'No tickets match the selected status filter.'}
                </Text>
                <Pressable
                  style={[styles.primaryActionPill, { backgroundColor: C.primary }]}
                  onPress={() => setActiveTab('raise')}
                >
                  <Text style={styles.primaryActionPillText}>Submit New Ticket</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.ticketCardStack}>
                {filteredTickets.map((t) => {
                  const isExpanded = expandedTicketId === t.id;
                  const catInfo = t.category ? SUPPORT_CATEGORIES[t.category] : null;
                  const dateStr = new Date(t.createdAt).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <Pressable
                      key={t.id}
                      style={[
                        styles.ticketCardItem,
                        { backgroundColor: C.surface, borderColor: C.surfaceBorder },
                        isExpanded && { borderColor: C.primaryBorder },
                      ]}
                      onPress={() => toggleTicket(t.id)}
                    >
                      <View style={styles.ticketCardHeader}>
                        <View style={styles.ticketBadgeRow}>
                          <StatusPill status={t.status} C={C} />
                          {catInfo && (
                            <View
                              style={[
                                styles.ticketCategoryTag,
                                { backgroundColor: C.surfaceElevated },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.ticketCategoryTagText,
                                  { color: C.textSecondary },
                                ]}
                              >
                                {catInfo.label}
                              </Text>
                            </View>
                          )}
                        </View>

                        <Text style={[styles.ticketTimestamp, { color: C.textMuted }]}>
                          {dateStr}
                        </Text>
                      </View>

                      <Text style={[styles.ticketSubjectHeading, { color: C.textPrimary }]}>
                        {t.subject}
                      </Text>

                      <View style={styles.ticketCardBottom}>
                        <Pressable
                          style={styles.ticketIdPill}
                          onPress={(e) => {
                            e.stopPropagation();
                            handleCopyTicketId(t.id);
                          }}
                        >
                          <Text style={[styles.ticketIdCode, { color: C.textMuted }]}>
                            #{t.id.slice(0, 8)}
                          </Text>
                          <MaterialIcons
                            name={copiedTicketId === t.id ? 'check' : 'content-copy'}
                            size={11}
                            color={copiedTicketId === t.id ? C.success : C.textMuted}
                          />
                        </Pressable>

                        <View style={styles.ticketDetailsLink}>
                          <Text style={[styles.ticketDetailsLinkLabel, { color: C.primary }]}>
                            {isExpanded ? 'Hide' : 'Details'}
                          </Text>
                          <MaterialIcons
                            name={isExpanded ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                            size={16}
                            color={C.primary}
                          />
                        </View>
                      </View>

                      {isExpanded && (
                        <View style={styles.ticketBodyExpanded}>
                          <View
                            style={[
                              styles.ticketDividerLine,
                              { backgroundColor: C.surfaceBorder },
                            ]}
                          />
                          <Text style={[styles.ticketBodyHeading, { color: C.textMuted }]}>
                            Report Details
                          </Text>
                          <Text style={[styles.ticketBodyContent, { color: C.textSecondary }]}>
                            {t.description}
                          </Text>
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* CarryGo AI Support Assistant Modal */}
      <Modal
        visible={showChatBotModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowChatBotModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={[styles.chatBotModalContainer, { backgroundColor: C.background }]}
        >
          {/* Modal Header */}
          <View style={[styles.chatBotHeader, { borderBottomColor: C.surfaceBorder, backgroundColor: C.surface }]}>
            <View style={styles.chatBotHeaderLeft}>
              <View style={[styles.chatBotAvatarWrap, { backgroundColor: C.primarySubtle }]}>
                <MaterialIcons name="smart-toy" size={22} color={C.primary} />
                <View style={[styles.chatBotActiveDot, { backgroundColor: '#10B981', borderColor: C.surface }]} />
              </View>
              <View>
                <Text style={[styles.chatBotHeaderTitle, { color: C.textPrimary }]}>
                  CarryGo Assistant
                </Text>
                <Text style={[styles.chatBotHeaderSub, { color: C.textMuted }]}>
                  Instant 24/7 Automated Guide
                </Text>
              </View>
            </View>

            <Pressable
              style={[styles.chatBotCloseBtn, { backgroundColor: C.surfaceElevated }]}
              onPress={() => setShowChatBotModal(false)}
              hitSlop={TouchTarget.smallHitSlop}
              accessibilityRole="button"
              accessibilityLabel="Close Chat Bot"
            >
              <Ionicons name="close" size={18} color={C.textPrimary} />
            </Pressable>
          </View>

          {/* Prompt Suggestion Chips */}
          <View style={{ backgroundColor: C.surface }}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chatBotPromptsScroll}
            >
              {CHATBOT_PROMPTS.map((prompt) => (
                <Pressable
                  key={prompt}
                  style={[
                    styles.chatBotPromptChip,
                    { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder },
                  ]}
                  onPress={() => handleSendChatBotMessage(prompt)}
                >
                  <Text style={[styles.chatBotPromptChipText, { color: C.textSecondary }]}>
                    {prompt}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          {/* Messages Scroll Area */}
          <ScrollView
            ref={chatBotScrollRef}
            style={styles.chatBotMessagesList}
            contentContainerStyle={{ paddingBottom: Spacing.xl, gap: Spacing.md }}
            showsVerticalScrollIndicator={false}
          >
            {chatBotMessages.map((msg) => {
              const isBot = msg.sender === 'bot';
              return (
                <View
                  key={msg.id}
                  style={[
                    styles.chatMsgRow,
                    isBot ? styles.chatMsgRowBot : styles.chatMsgRowUser,
                  ]}
                >
                  <View
                    style={[
                      styles.chatMsgBubble,
                      isBot
                        ? [styles.chatMsgBubbleBot, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]
                        : [styles.chatMsgBubbleUser, { backgroundColor: C.primary }],
                    ]}
                  >
                    <Text
                      style={[
                        styles.chatMsgText,
                        { color: isBot ? C.textPrimary : '#FFFFFF' },
                      ]}
                    >
                      {msg.text}
                    </Text>

                    {/* Optional Ticket Action inside Bot Message */}
                    {isBot && msg.action && (
                      <Pressable
                        style={[styles.chatBotActionPill, { backgroundColor: C.primarySubtle }]}
                        onPress={() => {
                          Haptic.select();
                          setShowChatBotModal(false);
                          setActiveTab('raise');
                        }}
                      >
                        <MaterialIcons name="edit" size={13} color={C.primary} />
                        <Text style={[styles.chatBotActionPillText, { color: C.primary }]}>
                          {msg.action.label} ➔
                        </Text>
                      </Pressable>
                    )}

                    <Text
                      style={[
                        styles.chatMsgTime,
                        { color: isBot ? C.textMuted : 'rgba(255,255,255,0.7)' },
                      ]}
                    >
                      {msg.timestamp}
                    </Text>
                  </View>
                </View>
              );
            })}

            {/* Typing Indicator */}
            {isBotTyping && (
              <View
                style={[
                  styles.typingIndicatorWrap,
                  { backgroundColor: C.surface, borderColor: C.surfaceBorder },
                ]}
              >
                <ActivityIndicator size="small" color={C.primary} />
                <Text style={[styles.typingIndicatorText, { color: C.textMuted }]}>
                  CarryGo Assistant is replying...
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Input Bar */}
          <View
            style={[
              styles.chatBotInputBar,
              {
                borderTopColor: C.surfaceBorder,
                backgroundColor: C.surface,
                paddingBottom: insets.bottom > 0 ? insets.bottom : Spacing.sm,
              },
            ]}
          >
            <TextInput
              style={[
                styles.chatBotTextInput,
                {
                  backgroundColor: C.surfaceElevated,
                  borderColor: C.surfaceBorder,
                  color: C.textPrimary,
                },
              ]}
              placeholder="Ask about OTP, refunds, baggage, tracking..."
              placeholderTextColor={C.textMuted}
              value={chatBotInput}
              onChangeText={setChatBotInput}
              onSubmitEditing={() => handleSendChatBotMessage()}
              returnKeyType="send"
            />
            <Pressable
              style={[
                styles.chatBotSendBtn,
                { backgroundColor: chatBotInput.trim() ? C.primary : C.surfaceElevated },
              ]}
              disabled={!chatBotInput.trim()}
              onPress={() => handleSendChatBotMessage()}
              hitSlop={TouchTarget.smallHitSlop}
              accessibilityRole="button"
              accessibilityLabel="Send message"
            >
              <Ionicons
                name="send"
                size={16}
                color={chatBotInput.trim() ? '#FFFFFF' : C.textMuted}
              />
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Round Floating ChatBot Action Button */}
      {!showChatBotModal && (
        <Pressable
          style={({ pressed }) => [
            styles.floatingChatBotBtn,
            {
              backgroundColor: C.primary,
              bottom: insets.bottom + Spacing.lg,
            },
            pressed && styles.floatingChatBotBtnPressed,
          ]}
          onPress={() => {
            Haptic.select();
            setShowChatBotModal(true);
          }}
          accessibilityRole="button"
          accessibilityLabel="Open CarryGo AI Assistant"
        >
          <MaterialIcons name="smart-toy" size={26} color="#FFFFFF" />
          <View style={[styles.floatingActiveBadge, { borderColor: '#FFFFFF' }]} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.lg,
  },
  tabletScrollContent: {
    maxWidth: 640,
    width: '100%',
    alignSelf: 'center',
  },

  // Top App Bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 4,
    borderBottomWidth: 1,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitleCenter: {
    alignItems: 'center',
  },
  topBarTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    letterSpacing: -0.2,
  },
  topLiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  topLiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  topLiveText: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
  },

  // Segmented Navigation
  segmentedNavWrap: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm + 2,
    paddingBottom: Spacing.xs,
  },
  segmentedNav: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
  },
  segmentItem: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.lg,
  },
  segmentItemActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
  },
  segmentText: {
    fontSize: FontSize.xs + 1,
    fontWeight: FontWeight.medium,
  },
  segmentTextActive: {
    fontWeight: FontWeight.bold,
  },
  tabTextWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  tabBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  // Section Block
  sectionBlock: {
    gap: Spacing.md,
  },

  // Modular Assistance Hub Card
  modularHubCard: {
    borderRadius: BorderRadius.xxl,
    padding: Spacing.md + 2,
    borderWidth: 1,
    gap: Spacing.sm + 2,
  },
  modularEmailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
  },
  modularEmailIconWrap: {
    width: 34,
    height: 34,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  modularEmailLabel: {
    fontSize: 10,
    fontWeight: FontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modularEmailAddress: {
    fontSize: FontSize.xs + 1,
    fontWeight: FontWeight.bold,
    marginTop: 1,
  },
  modularCopyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 5,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  modularCopyBadgeText: {
    fontSize: 11,
    fontWeight: FontWeight.bold,
  },
  modularActionSplit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  modularActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.sm + 3,
    borderRadius: BorderRadius.xl,
  },
  modularActionBtnTextWhite: {
    color: '#FFFFFF',
    fontSize: FontSize.xs + 1,
    fontWeight: FontWeight.bold,
  },
  modularActionBtnText: {
    fontSize: FontSize.xs + 1,
    fontWeight: FontWeight.bold,
  },

  // Search Card
  searchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSize.sm,
    padding: 0,
  },

  // Chips
  horizontalChips: {
    gap: Spacing.xs + 2,
    paddingVertical: 2,
  },
  chipItem: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  chipText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
  },

  // FAQ Accordion Stack
  faqCardStack: {
    gap: Spacing.sm,
  },
  faqRowCard: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.md + 2,
    borderWidth: 1,
  },
  faqQuestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  faqQuestionText: {
    flex: 1,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    lineHeight: 21,
  },
  faqChevronCircle: {
    width: 28,
    height: 28,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  faqAnswerContainer: {
    marginTop: Spacing.sm + 2,
    paddingTop: Spacing.sm,
  },
  faqAnswerParagraph: {
    fontSize: FontSize.xs + 1,
    lineHeight: 22,
  },
  faqFeedbackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    marginTop: Spacing.md,
    paddingTop: Spacing.sm + 2,
  },
  faqFeedbackLabel: {
    fontSize: 11,
    fontWeight: FontWeight.medium,
  },
  faqFeedbackButtonGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs + 2,
  },
  faqFeedbackBtn: {
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  faqFeedbackBtnText: {
    fontSize: 11,
    fontWeight: FontWeight.semibold,
  },
  faqHelpEscalateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
  },
  faqHelpEscalateText: {
    fontSize: 11,
    fontWeight: FontWeight.bold,
  },

  // Assistance Card
  assistanceCard: {
    borderRadius: BorderRadius.xxl,
    padding: Spacing.lg,
    borderWidth: 1,
    marginTop: Spacing.sm,
    gap: Spacing.md,
  },
  assistanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm + 2,
  },
  assistanceIconWrap: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  assistanceTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  assistanceSubtitle: {
    fontSize: FontSize.xs,
    marginTop: 1,
  },

  // Email Strip
  emailStripContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
  },
  emailStripLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm + 2,
    flex: 1,
  },
  emailIconCircle: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emailStripLabel: {
    fontSize: 10,
    fontWeight: FontWeight.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  emailStripAddress: {
    fontSize: FontSize.xs + 1,
    fontWeight: FontWeight.bold,
    marginTop: 1,
  },
  emailCopyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 5,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  emailCopyBadgeText: {
    fontSize: 11,
    fontWeight: FontWeight.bold,
  },

  // Assistance Action Row (Chat Bot & Ticket)
  assistanceActionRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: Spacing.sm + 2,
  },
  assistanceActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.xl,
    gap: Spacing.sm,
  },
  assistanceChatBotBtn: {
    // Primary background set inline
  },
  assistanceTicketBtn: {
    borderWidth: 1,
  },
  actionBtnTextCol: {
    flex: 1,
  },
  assistanceActionBtnTitle: {
    fontSize: FontSize.xs + 1,
    fontWeight: FontWeight.bold,
    color: '#FFFFFF',
  },
  assistanceActionBtnSub: {
    fontSize: 10,
    marginTop: 1,
    color: 'rgba(255, 255, 255, 0.82)',
  },

  // Chat Bot Modal
  chatBotModalContainer: {
    flex: 1,
  },
  chatBotHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  chatBotHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm + 2,
  },
  chatBotAvatarWrap: {
    position: 'relative',
    width: 38,
    height: 38,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatBotActiveDot: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
  },
  chatBotHeaderTitle: {
    fontSize: FontSize.sm + 1,
    fontWeight: FontWeight.bold,
  },
  chatBotHeaderSub: {
    fontSize: 11,
    marginTop: 1,
  },
  chatBotCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatBotPromptsScroll: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    gap: Spacing.xs + 2,
  },
  chatBotPromptChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  chatBotPromptChipText: {
    fontSize: 11,
    fontWeight: FontWeight.medium,
  },
  chatBotMessagesList: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  chatMsgRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.xs + 2,
    maxWidth: '88%',
  },
  chatMsgRowBot: {
    alignSelf: 'flex-start',
  },
  chatMsgRowUser: {
    alignSelf: 'flex-end',
    flexDirection: 'row-reverse',
  },
  chatMsgBubble: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.xl,
  },
  chatMsgBubbleBot: {
    borderBottomLeftRadius: 4,
    borderWidth: 1,
  },
  chatMsgBubbleUser: {
    borderBottomRightRadius: 4,
  },
  chatMsgText: {
    fontSize: FontSize.xs + 1,
    lineHeight: 21,
  },
  chatMsgTime: {
    fontSize: 9,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  chatBotActionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.md,
    alignSelf: 'flex-start',
  },
  chatBotActionPillText: {
    fontSize: 11,
    fontWeight: FontWeight.bold,
  },
  typingIndicatorWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    alignSelf: 'flex-start',
    borderWidth: 1,
  },
  typingIndicatorText: {
    fontSize: 11,
    fontStyle: 'italic',
  },
  chatBotInputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm + 2,
    borderTopWidth: 1,
    gap: Spacing.sm,
  },
  chatBotTextInput: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    fontSize: FontSize.xs + 1,
    maxHeight: 90,
  },
  chatBotSendBtn: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Ticket Form
  ticketFormCard: {
    borderRadius: BorderRadius.xxl,
    padding: Spacing.lg,
    borderWidth: 1,
    gap: Spacing.lg,
  },
  formTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    letterSpacing: -0.2,
  },
  formSubtitle: {
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  formFieldGroup: {
    gap: 6,
  },
  fieldHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fieldLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  fieldCounter: {
    fontSize: 11,
  },
  categoryPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs + 2,
    marginTop: 2,
  },
  categoryPillItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: Spacing.md - 2,
    paddingVertical: Spacing.sm - 1,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  categoryPillLabel: {
    fontSize: FontSize.xs,
  },
  shipmentToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xs,
  },
  shipmentScrollList: {
    gap: Spacing.xs,
    paddingTop: Spacing.xs,
  },
  shipmentChipBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm - 2,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  shipmentChipLabel: {
    fontSize: 11,
  },
  textInputControl: {
    borderWidth: 1,
    borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 3,
    fontSize: FontSize.sm,
  },
  textAreaControl: {
    minHeight: 110,
    lineHeight: 21,
  },
  submitActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.xl,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  submitActionBtnDisabled: {
    opacity: 0.45,
    shadowOpacity: 0,
  },
  submitActionBtnText: {
    color: '#FFFFFF',
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },

  // Draft Banner
  draftBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  draftBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  draftBannerText: {
    fontSize: FontSize.xs,
  },
  draftBannerAction: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },

  // My Tickets
  ticketFilterNav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs + 2,
  },
  ticketFilterPill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  ticketFilterPillText: {
    fontSize: FontSize.xs,
  },
  ticketCardStack: {
    gap: Spacing.sm + 2,
  },
  ticketCardItem: {
    borderRadius: BorderRadius.xxl,
    padding: Spacing.md + 2,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  ticketCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ticketBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs + 2,
  },
  statusPill: {
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 2.5,
    borderRadius: BorderRadius.full,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
  },
  ticketCategoryTag: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.md,
  },
  ticketCategoryTagText: {
    fontSize: 10,
    fontWeight: FontWeight.medium,
  },
  ticketTimestamp: {
    fontSize: 11,
  },
  ticketSubjectHeading: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    lineHeight: 20,
  },
  ticketCardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.xs,
  },
  ticketIdPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ticketIdCode: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  ticketDetailsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  ticketDetailsLinkLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  ticketBodyExpanded: {
    gap: Spacing.xs,
    marginTop: 2,
  },
  ticketDividerLine: {
    height: 1,
    marginVertical: Spacing.xs,
  },
  ticketBodyHeading: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  ticketBodyContent: {
    fontSize: FontSize.xs + 1,
    lineHeight: 21,
  },

  // Empty Box
  emptyBox: {
    borderRadius: BorderRadius.xxl,
    padding: Spacing.xl + 4,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginVertical: Spacing.sm,
  },
  emptyBoxTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  emptyBoxDesc: {
    fontSize: FontSize.xs,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 19,
  },
  primaryActionPill: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm + 1,
    borderRadius: BorderRadius.xl,
    marginTop: Spacing.xs,
  },
  primaryActionPillText: {
    color: '#FFFFFF',
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },

  // Loading
  centeredLoading: {
    padding: Spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  centeredLoadingText: {
    fontSize: FontSize.xs,
  },

  // Round Floating ChatBot Button
  floatingChatBotBtn: {
    position: 'absolute',
    right: Spacing.lg,
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.38,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 99,
  },
  floatingChatBotBtnPressed: {
    transform: [{ scale: 0.92 }],
    opacity: 0.95,
  },
  floatingActiveBadge: {
    position: 'absolute',
    top: 3,
    right: 3,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
    borderWidth: 2,
  },
  inlineStatusBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginTop: Spacing.xs,
  },
  inlineStatusTitle: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    marginBottom: 2,
  },
  inlineStatusDesc: {
    fontSize: FontSize.xs - 1,
    lineHeight: 16,
  },
});
