/**
 * Bilingual legal and informational content for CarryGo.
 * 
 * IMPORTANT:
 * - English is the default and legally binding authority.
 * - Hindi text consists of draft translations prepared for convenience and must be
 *   reviewed and approved by qualified legal counsel prior to formal certification.
 */

export type LegalLanguage = 'en' | 'hi';

export const LEGAL_LANGUAGE_STORAGE_KEY = 'carrygo_legal_language';

export const DRAFT_DISCLAIMER = {
  en: 'Draft translation for convenience. The English version remains the legally binding authority.',
  hi: 'सुविधा के लिए प्रारूप अनुवाद। मूल अंग्रेज़ी संस्करण ही कानूनी रूप से बाध्यकारी अधिकार है।',
} as const;

export const BACK_BUTTON_LABEL = {
  en: 'Go back',
  hi: 'वापस जाएं',
} as const;

/* ─────────────────────────────────────────────────────────────
 * 1. PRIVACY POLICY
 * ───────────────────────────────────────────────────────────── */

export interface LegalSectionItem {
  title: string;
  body: string;
}

export interface PrivacyPolicyContent {
  headerTitle: string;
  effectiveDate: string;
  intro: string;
  sections: LegalSectionItem[];
  contact: string;
}

export const PRIVACY_CONTENT: Record<LegalLanguage, PrivacyPolicyContent> = {
  en: {
    headerTitle: 'Privacy Policy',
    effectiveDate: 'Effective Date: 29 August 2026',
    intro: 'This policy explains how CarryGo handles personal information when you use the mobile application.',
    sections: [
      {
        title: 'Information we collect',
        body: 'We collect account details, profile information, delivery details, messages, payment references, identity-verification documents, device tokens, and location only when a delivery feature requires it.',
      },
      {
        title: 'How we use information',
        body: 'We use this information to operate CarryGo, match routes, secure deliveries, process payments, prevent fraud, provide support, and meet legal obligations.',
      },
      {
        title: 'Sharing and processors',
        body: 'Information is shared only with delivery participants where necessary and with contracted providers such as Supabase, Expo, Cloudinary, and payment or identity-verification providers. We do not sell personal information.',
      },
      {
        title: 'Location and permissions',
        body: 'Precise location is requested only for enabled delivery tracking. Camera access is used for parcel and verification images. You can revoke permissions in device settings.',
      },
      {
        title: 'Retention and security',
        body: 'We retain records only as required for operations, disputes, fraud prevention, and applicable law. Sensitive credentials are stored using platform-protected storage and server access is restricted by authorization policies.',
      },
      {
        title: 'Your choices',
        body: 'You may request access or correction of your personal information. You can permanently delete your account in the app from Profile > Delete Account, subject to legal retention requirements.',
      },
    ],
    contact: 'For privacy inquiries or data deletion requests, contact us at support@carrygo.in or visit https://carrygo.in/delete-account.',
  },
  hi: {
    headerTitle: 'गोपनीयता नीति (Privacy Policy)',
    effectiveDate: 'प्रभावी तिथि: 29 अगस्त 2026',
    intro: 'यह नीति स्पष्ट करती है कि जब आप मोबाइल ऐप का उपयोग करते हैं तो CarryGo आपकी व्यक्तिगत जानकारी को किस प्रकार प्रबंधित करता है।',
    sections: [
      {
        title: 'जानकारी जो हम एकत्र करते हैं',
        body: 'हम खाता विवरण, प्रोफ़ाइल जानकारी, डिलीवरी विवरण, संदेश, भुगतान संदर्भ, पहचान सत्यापन दस्तावेज़, डिवाइस टोकन और केवल डिलीवरी सुविधा के लिए आवश्यक होने पर स्थान की जानकारी एकत्र करते हैं।',
      },
      {
        title: 'हम जानकारी का उपयोग कैसे करते हैं',
        body: 'हम इस जानकारी का उपयोग CarryGo के संचालन, मार्गों के मिलान, सुरक्षित डिलीवरी, भुगतान प्रसंस्करण, धोखाधड़ी रोकथाम, सहायता प्रदान करने और कानूनी दायित्वों को पूरा करने के लिए करते हैं।',
      },
      {
        title: 'साझाकरण और डेटा प्रोसेसर',
        body: 'जानकारी केवल डिलीवरी प्रतिभागियों के साथ आवश्यकतानुसार और Supabase, Expo, Cloudinary तथा भुगतान या पहचान सत्यापन प्रदाताओं जैसे अनुबंधित सेवा प्रदाताओं के साथ साझा की जाती है। हम व्यक्तिगत जानकारी नहीं बेचते हैं।',
      },
      {
        title: 'स्थान और अनुमतियां',
        body: 'सटीक स्थान केवल सक्रिय डिलीवरी ट्रैकिंग के लिए अनुरोध किया जाता है। पार्सल और सत्यापन छवियों के लिए कैमरा एक्सेस का उपयोग किया जाता है। आप डिवाइस सेटिंग्स में अनुमतियां वापस ले सकते हैं।',
      },
      {
        title: 'डेटा प्रतिधारण और सुरक्षा',
        body: 'हम रिकॉर्ड केवल संचालन, विवाद निवारण, धोखाधड़ी रोकथाम और लागू कानून द्वारा आवश्यक सीमा तक बनाए रखते हैं। संवेदनशील क्रेडेंशियल्स सुरक्षित स्टोरेज में रखे जाते हैं और सर्वर एक्सेस केवल अधिकृत नीतियों द्वारा सीमित होता है।',
      },
      {
        title: 'आपके विकल्प एवं अधिकार',
        body: 'आप अपनी व्यक्तिगत जानकारी तक पहुंच या सुधार का अनुरोध कर सकते हैं। कानूनी प्रतिधारण आवश्यकताओं के अधीन, आप प्रोफ़ाइल > खाता हटाएं (Profile > Delete Account) से ऐप में अपना खाता स्थायी रूप से हटा सकते हैं।',
      },
    ],
    contact: 'गोपनीयता पूछताछ या डेटा हटाने के अनुरोध के लिए support@carrygo.in पर संपर्क करें या https://carrygo.in/delete-account पर जाएं।',
  },
};

/* ─────────────────────────────────────────────────────────────
 * 2. REFUND & CANCELLATION POLICY
 * ───────────────────────────────────────────────────────────── */

export interface RefundPolicyContent {
  headerTitle: string;
  badgeText: string;
  intro: string;
  sections: LegalSectionItem[];
  contact: string;
}

export const REFUND_CONTENT: Record<LegalLanguage, RefundPolicyContent> = {
  en: {
    headerTitle: 'Refund & Cancellation',
    badgeText: 'Updated: August 2026',
    intro: 'This policy outlines cancellation eligibility, escrow refunds, and dispute resolution guidelines for peer-to-peer parcel carriage on CarryGo.',
    sections: [
      {
        title: 'Cancellation Before Pickup',
        body: 'If a sender cancels before parcel pickup is confirmed by the traveler, CarryGo initiates a full refund of the locked escrow amount back to the original payment method. Payment processing times depend on payment gateway and bank clearing cycles (typically 3-7 business days).',
      },
      {
        title: 'Cancellation by Traveler',
        body: 'If an accepted traveler cancels the journey before collecting the parcel, the sender is immediately notified and the full escrow deposit is automatically unreserved and refunded without cancellation penalties.',
      },
      {
        title: 'After Pickup and In-Transit Disputes',
        body: 'Once a parcel is picked up, cancellations cannot be performed automatically. Any cancellations or issues must be escalated through Support Desk or Dispute Resolution. CarryGo reviews digital handover signatures, chat logs, and delivery evidence to determine refund allocation.',
      },
      {
        title: 'Completed Deliveries and Final Release',
        body: 'Once the recipient confirms delivery via secure PIN handover and escrow funds are released to the traveler, refunds cannot be automatically reversed. Any allegations of policy violation or damaged goods must be submitted to Support for investigation.',
      },
      {
        title: 'Platform Fees and Chargebacks',
        body: 'Valid cancellations processed before parcel pickup receive a full refund of platform and escrow fees. Fraudulent chargebacks or payment disputes filed in bad faith will lead to permanent account suspension and potential legal recovery.',
      },
      {
        title: 'How to Request Cancellation or Refund',
        body: 'You can cancel pending requests directly in the CarryGo app from your Active Requests screen. For payment disputes or manual assistance, email support@carrygo.in with your request ID, tracking reference, and incident details.',
      },
    ],
    contact: 'For refund questions or dispute assistance, contact us anytime at support@carrygo.in.',
  },
  hi: {
    headerTitle: 'रिफंड एवं रद्दीकरण नीति (Refund & Cancellation)',
    badgeText: 'अद्यतन: अगस्त 2026',
    intro: 'यह नीति CarryGo पर पीयर-टू-पीयर पार्सल डिलीवरी के लिए रद्दीकरण पात्रता, एस्क्रो रिफंड और विवाद समाधान दिशानिर्देशों को स्पष्ट करती है।',
    sections: [
      {
        title: 'पिकअप से पहले रद्दीकरण',
        body: 'यदि प्रेषक (Sender) यात्री द्वारा पार्सल पिकअप की पुष्टि होने से पहले रद्द करता है, तो CarryGo लॉक की गई एस्क्रो राशि का पूरा रिफंड मूल भुगतान विधि में प्रारंभ करता है। बैंक व गेटवे प्रोसेसिंग में आम तौर पर 3-7 कार्यदिवस लगते हैं।',
      },
      {
        title: 'यात्री द्वारा रद्दीकरण',
        body: 'यदि स्वीकृत यात्री पार्सल प्राप्त करने से पहले यात्रा रद्द करता है, तो प्रेषक को तुरंत सूचित किया जाता है और पूरी एस्क्रो जमा राशि बिना किसी रद्दीकरण शुल्क के स्वतः रिफंड कर दी जाती है।',
      },
      {
        title: 'पिकअप के बाद और पारगमन में विवाद',
        body: 'पार्सल पिकअप होने के बाद स्वचालित रद्दीकरण संभव नहीं है। किसी भी समस्या या रद्दीकरण को सपोर्ट डेस्क या विवाद समाधान के माध्यम से आगे बढ़ाया जाना चाहिए। CarryGo हैंडओवर हस्ताक्षर, चैट और साक्ष्यों की समीक्षा करके निर्णय लेता है।',
      },
      {
        title: 'पूर्ण डिलीवरी और अंतिम भुगतान विमुक्ति',
        body: 'एक बार जब प्राप्तकर्ता सुरक्षित पिन हैंडओवर द्वारा डिलीवरी की पुष्टि करता है और यात्री को एस्क्रो राशि जारी हो जाती है, तो रिफंड स्वतः वापस नहीं किया जा सकता। नीति उल्लंघन या क्षतिग्रस्त सामान की शिकायत जांच के लिए सपोर्ट में दर्ज की जानी चाहिए।',
      },
      {
        title: 'प्लेटफ़ॉर्म शुल्क और चार्जबैक',
        body: 'पिकअप से पहले किए गए वैध रद्दीकरण पर प्लेटफ़ॉर्म और एस्क्रो शुल्क का पूरा रिफंड मिलता है। दुर्भावनापूर्ण या फर्जी चार्जबैक के परिणामस्वरूप खाता स्थायी रूप से निलंबित किया जाएगा और कानूनी कार्रवाई की जा सकती है।',
      },
      {
        title: 'रद्दीकरण या रिफंड का अनुरोध कैसे करें',
        body: 'आप अपनी सक्रिय अनुरोध स्क्रीन से सीधे CarryGo ऐप में लंबित अनुरोध रद्द कर सकते हैं। भुगतान विवाद या सहायता के लिए अपनी अनुरोध आईडी और घटना विवरण के साथ support@carrygo.in पर ईमेल करें।',
      },
    ],
    contact: 'रिफंड संबंधी प्रश्नों या विवाद सहायता के लिए किसी भी समय support@carrygo.in पर संपर्क करें।',
  },
};

/* ─────────────────────────────────────────────────────────────
 * 3. SHIPPING & DELIVERY POLICY
 * ───────────────────────────────────────────────────────────── */

export interface ShippingPolicyContent {
  headerTitle: string;
  badgeText: string;
  intro: string;
  sections: LegalSectionItem[];
  contact: string;
}

export const SHIPPING_CONTENT: Record<LegalLanguage, ShippingPolicyContent> = {
  en: {
    headerTitle: 'Shipping & Delivery',
    badgeText: 'Updated: August 2026',
    intro: 'This policy explains delivery terms, prohibited cargo, transit expectations, and handover protocols for peer-to-peer carriage on CarryGo.',
    sections: [
      {
        title: 'Service Model and Scope',
        body: 'CarryGo operates a peer-to-peer parcel carriage platform connecting senders with verified travelers already travelling along the same route. CarryGo is an intermediary technology platform facilitating connections, verification, and escrow payments between community members.',
      },
      {
        title: 'Delivery Timelines and Estimates',
        body: 'Delivery schedules are based on the individual traveler’s planned flight, train, bus, or road itinerary. Estimated delivery times provided in the app are indicative and subject to transit delays, traffic, weather events, and transport operator schedules.',
      },
      {
        title: 'Parcel Packaging and Declarations',
        body: 'Senders must inspect, package, and securely seal all parcels prior to handover. Senders must truthfully declare package contents, weight, dimensions, and fragility. Travelers have the legal right to visually inspect items before accepting custody.',
      },
      {
        title: 'Prohibited and Restricted Items',
        body: 'Dangerous goods, hazardous chemicals, flammables, explosives, contraband, illegal narcotics, unlicensed weapons, unregistered pharmaceuticals, and items prohibited under Indian transport laws or carrier regulations are strictly barred. Violations will be reported to law enforcement.',
      },
      {
        title: 'Pickup and Delivery Handover Protocols',
        body: 'Handover must be recorded inside the CarryGo app. Senders confirm handover with photo verification, and recipients receive and confirm delivery by providing a secure delivery PIN to the traveler. Escrow payment is only released upon verified delivery PIN confirmation.',
      },
      {
        title: 'Delayed, Damaged, or Missing Deliveries',
        body: 'If a traveler experiences unexpected travel delays, they must notify the sender immediately through in-app chat. In the event of lost or damaged items, either party can initiate a dispute through the Support Desk for evidence review and mediation.',
      },
    ],
    contact: 'For delivery assistance or incident escalation, contact our team at support@carrygo.in.',
  },
  hi: {
    headerTitle: 'शिपिंग एवं डिलीवरी नीति (Shipping & Delivery)',
    badgeText: 'अद्यतन: अगस्त 2026',
    intro: 'यह नीति CarryGo पर पीयर-टू-पीयर पार्सल डिलीवरी के लिए नियम, प्रतिबंधित सामान, पारगमन अपेक्षाओं और हैंडओवर प्रोटोकॉल की व्याख्या करती है।',
    sections: [
      {
        title: 'सेवा मॉडल और दायरा',
        body: 'CarryGo एक पीयर-टू-पीयर पार्सल कैरिज प्लेटफ़ॉर्म संचालित करता है जो प्रेषकों को उसी मार्ग पर यात्रा कर रहे सत्यापित यात्रियों से जोड़ता है। CarryGo एक मध्यस्थ प्रौद्योगिकी प्लेटफ़ॉर्म है जो केवल संपर्क, सत्यापन और एस्क्रो भुगतान की सुविधा देता है।',
      },
      {
        title: 'डिलीवरी समय-सीमा और अनुमान',
        body: 'डिलीवरी कार्यक्रम व्यक्तिगत यात्री के नियोजित उड़ान, ट्रेन, बस या सड़क मार्ग पर आधारित होता है। ऐप में प्रदान किया गया अनुमानित डिलीवरी समय सांकेतिक है और ट्रैफ़िक, मौसम या परिवहन ऑपरेटर की देरी के अधीन है।',
      },
      {
        title: 'पार्सल पैकेजिंग और घोषणाएं',
        body: 'प्रेषकों को हैंडओवर से पहले सभी पार्सल का निरीक्षण, सुरक्षित पैकेजिंग और सील करना अनिवार्य है। प्रेषकों को पैकेज की सामग्री, वजन, आकार और नाजुकता की सत्य घोषणा करनी होगी। यात्रियों को स्वीकार करने से पहले जांच करने का कानूनी अधिकार है।',
      },
      {
        title: 'प्रतिबंधित एवं वर्जित सामान',
        body: 'खतरनाक वस्तुएं, रसायन, ज्वलनशील पदार्थ, विस्फोटक, तस्करी का सामान, अवैध नशीले पदार्थ, बिना लाइसेंस वाले हथियार और भारतीय परिवहन कानूनों के तहत प्रतिबंधित वस्तुएं पूर्णतः वर्जित हैं। उल्लंघन की सूचना कानून प्रवर्तन एजेंसियों को दी जाएगी।',
      },
      {
        title: 'पिकअप और डिलीवरी हैंडओवर प्रोटोकॉल',
        body: 'हैंडओवर CarryGo ऐप में दर्ज होना चाहिए। प्रेषक फोटो सत्यापन से हैंडओवर की पुष्टि करते हैं, और प्राप्तकर्ता यात्री को सुरक्षित डिलीवरी पिन देकर प्राप्ति की पुष्टि करते हैं। एस्क्रो भुगतान केवल सत्यापित डिलीवरी पिन के बाद ही जारी होता है।',
      },
      {
        title: 'विलंबित, क्षतिग्रस्त या खोए हुए पार्सल',
        body: 'यदि यात्री को अप्रत्याशित यात्रा देरी का सामना करना पड़ता है, तो उन्हें तुरंत इन-ऐप चैट के माध्यम से प्रेषक को सूचित करना चाहिए। पार्सल खोने या क्षति होने की स्थिति में, कोई भी पक्ष साक्ष्य समीक्षा और मध्यस्थता के लिए सपोर्ट डेस्क में विवाद दर्ज कर सकता है।',
      },
    ],
    contact: 'डिलीवरी सहायता या घटना निवारण के लिए हमारी टीम से support@carrygo.in पर संपर्क करें।',
  },
};

/* ─────────────────────────────────────────────────────────────
 * 4. TERMS & CONDITIONS
 * ───────────────────────────────────────────────────────────── */

export interface TermsSection {
  number: string;
  title: string;
  paragraphs: string[];
  bullets?: string[];
  postBullets?: string[];
}

export interface TermsContent {
  headerTitle: string;
  effectiveDate: string;
  preamble: string;
  sections: TermsSection[];
  finalNote: string;
}

export const TERMS_CONTENT: Record<LegalLanguage, TermsContent> = {
  en: {
    headerTitle: 'Terms & Conditions',
    effectiveDate: 'Effective Date: 27 July 2026',
    preamble: 'Welcome to CarryGo. By using our platform, you agree to the following terms and conditions. CarryGo operates as a peer-to-peer (P2P) parcel delivery marketplace connecting senders with travelers who are already making a journey. Please read these terms carefully before using our services.',
    sections: [
      {
        number: '1',
        title: 'Platform Role & Nature of Service',
        paragraphs: [
          '1.1. CarryGo is a technology platform that connects senders (individuals who need parcels delivered) with travelers (individuals already traveling between cities who can carry parcels). CarryGo is NOT a courier service, logistics company, or postal service.',
          '1.2. CarryGo acts solely as an intermediary marketplace. We facilitate the connection between senders and travelers, provide escrow payment services, and offer a dispute resolution framework.',
          '1.3. CarryGo does not take physical possession of any parcel at any time. We do not inspect, verify, weigh, or otherwise handle any packages listed on our platform.',
          '1.4. The transportation contract is between the sender and the traveler directly. CarryGo is not a party to this contract except as a payment facilitator.',
        ],
      },
      {
        number: '2',
        title: 'Sender Responsibilities',
        paragraphs: [
          '2.1. Senders must accurately describe the contents, weight, and dimensions of their parcel. Misrepresentation constitutes a breach of these terms.',
          '2.2. Senders are solely responsible for packaging their items securely. This includes appropriate cushioning, waterproofing, and external labeling.',
          '2.3. Senders must ensure all items are legal to transport within India and comply with all applicable laws, including but not limited to the Indian Post Office Act, 1898 and the Carriage by Air Act, 1972.',
          '2.4. Senders must be present at the agreed handover location and time. Failure to appear within 30 minutes of the scheduled time may result in cancellation with applicable fees.',
          '2.5. Senders must provide photographic proof of the parcel condition at the time of handover. These photos serve as the baseline for any future damage claims.',
          '2.6. Senders must remain reachable by phone or in-app messaging throughout the delivery period until the parcel is confirmed delivered.',
          '2.7. Senders must pay the agreed price without negotiation after booking confirmation. Any payment disputes after acceptance will be handled through the platform’s mediation process.',
        ],
      },
      {
        number: '3',
        title: 'Traveler Responsibilities',
        paragraphs: [
          '3.1. Travelers must complete identity verification (KYC) before accepting any delivery requests.',
          '3.2. Travelers must handle all parcels with reasonable care during transit. This means protecting parcels from rain, extreme temperatures, crushing, and theft.',
          '3.3. Travelers must never open, tamper with, or inspect the contents of sealed parcels unless required by law enforcement.',
          '3.4. Travelers must deliver parcels within the agreed timeframe. If delays are expected, the traveler must proactively communicate with the sender via the platform.',
          '3.5. Travelers must confirm delivery through the app using OTP verification and photographic proof.',
          '3.6. Travelers may refuse a parcel at pickup if it appears to differ significantly from the sender’s description or if they have reasonable suspicion the contents are illegal.',
        ],
      },
      {
        number: '4',
        title: 'Prohibited Items',
        paragraphs: [
          '4.1. The following items are strictly prohibited on CarryGo:',
        ],
        bullets: [
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
        ],
        postBullets: [
          '4.2. Sending prohibited items constitutes a criminal offense and will result in immediate permanent account suspension, forfeiture of escrowed funds, and reporting to relevant law enforcement authorities.',
          '4.3. CarryGo reserves the right to update the prohibited items list at any time. Users will be notified of material changes.',
        ],
      },
      {
        number: '5',
        title: 'Fragile Items & Special Handling',
        paragraphs: [
          '5.1. Items marked as fragile must be packaged by the sender in industry-standard protective packaging (bubble wrap, foam, double-boxing as appropriate).',
          '5.2. Travelers are not required to provide special handling equipment (thermal bags, refrigeration, etc.) unless explicitly agreed upon and reflected in the delivery price.',
          '5.3. Damage to fragile items that were inadequately packaged (as determined by photographic evidence) will not be eligible for compensation claims against the traveler.',
          '5.4. Perishable food items are sent at the sender’s own risk. CarryGo does not guarantee temperature control during transit.',
        ],
      },
      {
        number: '6',
        title: 'Liability & Insurance',
        paragraphs: [
          '6.1. CarryGo’s liability is limited to facilitating dispute resolution and refunding escrowed payments where appropriate. CarryGo does not carry cargo insurance.',
          '6.2. Maximum compensation for lost or damaged items is capped at:',
        ],
        bullets: [
          'Standard parcels: Rs 5,000',
          'Electronics: Rs 15,000',
          'Documents: Rs 2,000',
        ],
        postBullets: [
          '6.3. CarryGo does NOT provide insurance coverage for any shipments. Users are strongly encouraged to purchase separate transit insurance for high-value items.',
          '6.4. CarryGo is not liable for indirect, incidental, special, or consequential damages arising from delayed or failed deliveries.',
          '6.5. In cases where the traveler can demonstrate that damage occurred due to inadequate sender packaging, the traveler shall not be liable for compensation.',
        ],
      },
      {
        number: '7',
        title: 'Dispute Resolution',
        paragraphs: [
          '7.1. All disputes must be reported through the CarryGo app within 48 hours of delivery (or expected delivery date for non-delivery claims).',
          '7.2. Dispute resolution follows a three-tier process: (a) direct communication between parties via in-app messaging; (b) mediation by CarryGo support staff; (c) binding arbitration under the Arbitration and Conciliation Act, 1996.',
          '7.3. During dispute resolution, escrowed funds will be held until a resolution is reached. Neither party may withdraw the disputed amount.',
          '7.4. Photographic evidence from both pickup and delivery is critical to dispute resolution. Parties who fail to provide photographic evidence will have a weaker position in claims.',
          '7.5. CarryGo’s dispute resolution decision is final and binding on both parties for claims under Rs 15,000. Claims above this amount may be escalated to arbitration.',
        ],
      },
      {
        number: '8',
        title: 'Identity Verification (KYC)',
        paragraphs: [
          '8.1. All users must complete Know Your Customer (KYC) verification to access core platform features. This includes government-issued photo ID and a live selfie for facial matching.',
          '8.2. KYC data is processed securely and stored in compliance with the Digital Personal Data Protection Act, 2023.',
          '8.3. Users found to have submitted fraudulent identity documents will be permanently banned and reported to authorities.',
          '8.4. CarryGo may re-verify identity periodically or when suspicious activity is detected.',
        ],
      },
      {
        number: '9',
        title: 'Delivery Verification',
        paragraphs: [
          '9.1. Delivery is confirmed only when the recipient enters the One-Time Password (OTP) provided to the sender into the traveler’s app.',
          '9.2. Photographic proof of delivery is required alongside OTP confirmation.',
          '9.3. The sender must not share the delivery OTP with anyone other than the intended recipient.',
          '9.4. Payment is released from escrow to the traveler only after successful OTP-based delivery confirmation.',
        ],
      },
      {
        number: '10',
        title: 'Payment & Escrow',
        paragraphs: [
          '10.1. All payments are processed through CarryGo’s secure escrow system. The sender pays upon booking, and funds are held until successful delivery.',
          '10.2. CarryGo charges a platform service fee (currently 10% of the delivery price) deducted from the traveler’s payout.',
          '10.3. Payouts to travelers are processed within 24 hours of confirmed delivery via UPI or bank transfer.',
          '10.4. In case of delivery failure or cancellation, refunds to senders are processed within 3-5 business days.',
        ],
      },
      {
        number: '11',
        title: 'Refund Policy',
        paragraphs: [
          '11.1. Full refund: if the traveler cancels before pickup, or if delivery fails due to traveler negligence.',
          '11.2. Partial refund: if the sender cancels after the traveler has already begun the journey (up to 50% may be retained as traveler compensation).',
          '11.3. No refund: if the sender sends prohibited items, provides false descriptions, or fails to appear at the agreed handover point.',
          '11.4. Damage claims are evaluated case-by-case through the dispute resolution process.',
        ],
      },
      {
        number: '12',
        title: 'Fraud Prevention',
        paragraphs: [
          '12.1. CarryGo employs automated fraud detection systems to identify suspicious activity including but not limited to: duplicate accounts, fake delivery confirmations, collusion between sender and traveler, and money laundering.',
          '12.2. Users engaging in fraudulent activity will face immediate account suspension, forfeiture of pending payouts, and potential criminal prosecution.',
          '12.3. Senders who repeatedly file false damage claims will be flagged and may lose access to the claims system.',
        ],
      },
      {
        number: '13',
        title: 'Cancellation Policy',
        paragraphs: [
          '13.1. Senders may cancel free of charge within 30 minutes of booking if no traveler has accepted.',
          '13.2. After traveler acceptance, sender cancellation incurs a fee of 15% of the delivery price (minimum Rs 50).',
          '13.3. Travelers may cancel up to 2 hours before the scheduled pickup without penalty. Late cancellation affects their reliability score.',
          '13.4. Repeated cancellations (more than 3 in 30 days) may result in temporary account restrictions.',
        ],
      },
      {
        number: '14',
        title: 'Account Suspension & Termination',
        paragraphs: [
          '14.1. CarryGo reserves the right to suspend or terminate user accounts for violations of these terms, including but not limited to:',
        ],
        bullets: [
          'Sending or attempting to send prohibited items',
          'Identity fraud or use of fake documents',
          'Repeated failure to meet delivery obligations',
          'Harassment, threats, or abusive behavior toward other users',
          'Manipulation of ratings or reviews',
          'Circumventing platform fees through off-platform transactions',
        ],
        postBullets: [
          '14.2. Suspended users may appeal within 30 days. Permanent bans are final and non-appealable.',
          '14.3. Upon termination, outstanding escrow balances will be settled according to the terms of any active deliveries.',
        ],
      },
      {
        number: '15',
        title: 'Force Majeure',
        paragraphs: [
          '15.1. Neither CarryGo nor any user shall be liable for failure to perform obligations due to circumstances beyond reasonable control, including but not limited to: natural disasters, pandemics, government orders, strikes, civil unrest, or transportation disruptions.',
          '15.2. In force majeure events, deliveries may be delayed or cancelled with full refund to the sender and no penalty to the traveler.',
        ],
      },
      {
        number: '16',
        title: 'Privacy & Data Protection',
        paragraphs: [
          '16.1. CarryGo collects and processes personal data in accordance with the Digital Personal Data Protection Act, 2023 (DPDP Act).',
          '16.2. Data collected includes: identity documents (for KYC), location data (for delivery tracking), communication logs (for dispute resolution), and payment information (for transactions).',
          '16.3. Users retain the right to access, correct, and request deletion of their personal data, subject to legal retention requirements.',
          '16.4. CarryGo does not sell personal data to third parties. Data may be shared with law enforcement upon valid legal request.',
          '16.5. Location data is collected only during active deliveries and is not retained beyond 90 days post-delivery.',
        ],
      },
      {
        number: '17',
        title: 'Indian Law Compliance',
        paragraphs: [
          '17.1. CarryGo operates in compliance with applicable Indian laws including: the Information Technology Act, 2000; the Consumer Protection Act, 2019; the Payment and Settlement Systems Act, 2007; and the Digital Personal Data Protection Act, 2023.',
          '17.2. Users must comply with all applicable laws of India while using the platform, including customs regulations for inter-state transport of goods.',
          '17.3. Any goods subject to GST must have appropriate documentation. CarryGo is not responsible for tax compliance of individual shipments.',
        ],
      },
      {
        number: '18',
        title: 'Governing Law & Jurisdiction',
        paragraphs: [
          '18.1. These Terms shall be governed by and construed in accordance with the laws of India.',
          '18.2. Any disputes arising from these Terms that cannot be resolved through the platform’s dispute resolution mechanism shall be subject to the exclusive jurisdiction of the courts in Bengaluru, Karnataka, India.',
          '18.3. For claims exceeding Rs 15,000, disputes shall be resolved through binding arbitration conducted in English, seated in Bengaluru, under the Arbitration and Conciliation Act, 1996.',
        ],
      },
      {
        number: '19',
        title: 'Amendments',
        paragraphs: [
          '19.1. CarryGo reserves the right to modify these Terms at any time. Material changes will be communicated via in-app notification and email at least 15 days before taking effect.',
          '19.2. Continued use of the platform after the effective date of changes constitutes acceptance of the modified Terms.',
          '19.3. Users who do not agree to modified Terms may close their account and request deletion of their data.',
        ],
      },
      {
        number: '20',
        title: 'Contact & Grievance Redressal',
        paragraphs: [
          '20.1. For queries, complaints, or grievances, contact our Grievance Officer at: grievance@carrygo.in',
          '20.2. Grievances will be acknowledged within 24 hours and resolved within 15 days in compliance with the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021.',
          '20.3. CarryGo Technologies Private Limited, registered in Bengaluru, Karnataka, India.',
        ],
      },
    ],
    finalNote: 'By using CarryGo, you acknowledge that you have read, understood, and agree to be bound by these Terms and Conditions.',
  },
  hi: {
    headerTitle: 'नियम एवं शर्तें (Terms & Conditions)',
    effectiveDate: 'प्रभावी तिथि: 27 जुलाई 2026',
    preamble: 'CarryGo में आपका स्वागत है। हमारे प्लेटफ़ॉर्म का उपयोग करके, आप निम्नलिखित नियमों और शर्तों से सहमत होते हैं। CarryGo एक पीयर-टू-पीयर (P2P) पार्सल डिलीवरी मार्केटप्लेस के रूप में कार्य करता है जो प्रेषकों को उन यात्रियों से जोड़ता है जो पहले से ही यात्रा कर रहे हैं। हमारी सेवाओं का उपयोग करने से पहले कृपया इन शर्तों को ध्यानपूर्वक पढ़ें।',
    sections: [
      {
        number: '1',
        title: 'प्लेटफ़ॉर्म की भूमिका एवं सेवा की प्रकृति',
        paragraphs: [
          '1.1. CarryGo एक प्रौद्योगिकी प्लेटफ़ॉर्म है जो प्रेषकों (जिन व्यक्तियों को पार्सल भेजना है) को यात्रियों (जो व्यक्ति पहले से शहरों के बीच यात्रा कर रहे हैं और पार्सल ले जा सकते हैं) से जोड़ता है। CarryGo कोई कूरियर सेवा, लॉजिस्टिक्स कंपनी या डाक सेवा नहीं है।',
          '1.2. CarryGo केवल एक मध्यस्थ बाज़ार के रूप में कार्य करता है। हम प्रेषकों और यात्रियों के बीच संपर्क की सुविधा प्रदान करते हैं, एस्क्रो भुगतान सेवाएं उपलब्ध कराते हैं और विवाद समाधान रूपरेखा प्रदान करते हैं।',
          '1.3. CarryGo किसी भी समय किसी भी पार्सल का भौतिक कब्ज़ा नहीं लेता है। हम अपने प्लेटफ़ॉर्म पर सूचीबद्ध किसी भी पैकेज का निरीक्षण, सत्यापन, वजन या प्रबंधन नहीं करते हैं।',
          '1.4. परिवहन अनुबंध सीधे प्रेषक और यात्री के बीच होता है। भुगतान सुविधा प्रदाता के अलावा CarryGo इस अनुबंध का पक्षकार नहीं है।',
        ],
      },
      {
        number: '2',
        title: 'प्रेषक के उत्तरदायित्व',
        paragraphs: [
          '2.1. प्रेषक को अपने पार्सल की सामग्री, वजन और आयामों का सटीक विवरण देना होगा। गलत बयानी इन शर्तों का उल्लंघन मानी जाएगी।',
          '2.2. प्रेषक अपने सामान को सुरक्षित रूप से पैक करने के लिए पूरी तरह उत्तरदायी हैं। इसमें उचित कुशनिंग, वॉटरप्रूफिंग और बाहरी लेबलिंग शामिल है।',
          '2.3. प्रेषक को यह सुनिश्चित करना होगा कि सभी सामान भारत के भीतर परिवहन के लिए कानूनी रूप से वैध हैं और भारतीय डाकघर अधिनियम, 1898 तथा वायु द्वारा वाहन अधिनियम, 1972 सहित सभी लागू कानूनों का अनुपालन करते हैं।',
          '2.4. प्रेषक को सहमत हैंडओवर स्थान और समय पर उपस्थित होना होगा। निर्धारित समय के 30 मिनट के भीतर उपस्थित न होने पर लागू शुल्क के साथ रद्दीकरण हो सकता है।',
          '2.5. प्रेषक को हैंडओवर के समय पार्सल की स्थिति का फोटोग्राफिक प्रमाण प्रदान करना होगा। ये तस्वीरें भविष्य के किसी भी क्षति के दावे के लिए आधार का काम करती हैं।',
          '2.6. पार्सल डिलीवरी की पुष्टि होने तक प्रेषक को फोन या इन-ऐप संदेश के माध्यम से संपर्क योग्य रहना होगा।',
          '2.7. बुकिंग पुष्टि के बाद प्रेषक को बिना किसी मोलभाव के सहमत मूल्य का भुगतान करना होगा। स्वीकृति के बाद किसी भी भुगतान विवाद का समाधान प्लेटफ़ॉर्म की मध्यस्थता प्रक्रिया के माध्यम से किया जाएगा।',
        ],
      },
      {
        number: '3',
        title: 'यात्री के उत्तरदायित्व',
        paragraphs: [
          '3.1. यात्रियों को किसी भी डिलीवरी अनुरोध को स्वीकार करने से पहले अपनी पहचान सत्यापन (KYC) पूरा करना होगा।',
          '3.2. पारगमन के दौरान यात्रियों को सभी पार्सल को उचित सावधानी से संभालना होगा। इसका अर्थ है पार्सल को बारिश, अत्यधिक तापमान, दबने और चोरी से बचाना।',
          '3.3. जब तक कानून प्रवर्तन एजेंसियों द्वारा अनिवार्य न किया जाए, यात्री कभी भी सीलबंद पार्सल की सामग्री को खोलेंगे, छेड़छाड़ नहीं करेंगे या निरीक्षण नहीं करेंगे।',
          '3.4. यात्रियों को सहमत समय-सीमा के भीतर पार्सल पहुंचाना होगा। यदि देरी होने की संभावना है, तो यात्री को प्लेटफ़ॉर्म के माध्यम से प्रेषक से सक्रिय रूप से संवाद करना होगा।',
          '3.5. यात्रियों को ओटीपी सत्यापन और फोटोग्राफिक प्रमाण का उपयोग करके ऐप के माध्यम से डिलीवरी की पुष्टि करनी होगी।',
          '3.6. यदि पार्सल प्रेषक के विवरण से काफी भिन्न प्रतीत होता है या यदि यात्री को उचित संदेह है कि सामग्री अवैध है, तो वे पिकअप पर पार्सल अस्वीकार कर सकते हैं।',
        ],
      },
      {
        number: '4',
        title: 'प्रतिबंधित वस्तुएं',
        paragraphs: [
          '4.1. CarryGo पर निम्नलिखित वस्तुएं सख्त रूप से प्रतिबंधित हैं:',
        ],
        bullets: [
          'मादक पदार्थ, नियंत्रित पदार्थ और अवैध दवाएं',
          'हथियार, आग्नेयास्त्र, गोला-बारूद और विस्फोटक',
          'ज्वलनशील सामग्री और खतरनाक रसायन',
          'जीवित जानवर या जैविक नमूने',
          'मुद्रा, परक्राम्य लिखत या नकली सामान',
          'चोरी की संपत्ति या अज्ञात स्रोत का सामान',
          'अश्लील या आपत्तिजनक सामग्री',
          'वन्यजीव संरक्षण अधिनियम, 1972 के तहत प्रतिबंधित वस्तुएं',
          'नकली पहचान दस्तावेज या सरकारी मुहरें',
          '100Wh से अधिक क्षमता वाली खुली लिथियम बैटरी',
          'रेडियोधर्मी सामग्री',
          'मानव अवशेष या अंग',
        ],
        postBullets: [
          '4.2. प्रतिबंधित वस्तुएं भेजना एक आपराधिक कृत्य है और इसके परिणामस्वरूप तत्काल स्थायी खाता निलंबन, एस्क्रो राशि की जब्ती और संबंधित कानून प्रवर्तन अधिकारियों को सूचना दी जाएगी।',
          '4.3. CarryGo किसी भी समय प्रतिबंधित वस्तुओं की सूची को अद्यतन करने का अधिकार सुरक्षित रखता है। उपयोगकर्ताओं को महत्वपूर्ण परिवर्तनों की सूचना दी जाएगी।',
        ],
      },
      {
        number: '5',
        title: 'नाजुक वस्तुएं एवं विशेष रखरखाव',
        paragraphs: [
          '5.1. नाजुक के रूप में चिह्नित वस्तुओं को प्रेषक द्वारा उद्योग-मानक सुरक्षात्मक पैकेजिंग (बबल रैप, फोम, डबल-बॉक्सिंग आदि) में पैक किया जाना चाहिए।',
          '5.2. यात्रियों को विशेष उपकरण (थर्मल बैग, प्रशीतन आदि) प्रदान करने की आवश्यकता नहीं है, जब तक कि स्पष्ट रूप से सहमति न दी गई हो और डिलीवरी मूल्य में शामिल न हो।',
          '5.3. अपर्याप्त रूप से पैक की गई नाजुक वस्तुओं (जैसा कि फोटोग्राफिक साक्ष्य द्वारा निर्धारित किया गया हो) के नुकसान के लिए यात्री के खिलाफ मुआवजे के दावे स्वीकार्य नहीं होंगे।',
          '5.4. खराब होने वाले खाद्य पदार्थ प्रेषक के अपने जोखिम पर भेजे जाते हैं। CarryGo पारगमन के दौरान तापमान नियंत्रण की गारंटी नहीं देता है।',
        ],
      },
      {
        number: '6',
        title: 'दायित्व एवं बीमा',
        paragraphs: [
          '6.1. CarryGo का दायित्व विवाद समाधान की सुविधा प्रदान करने और जहां उपयुक्त हो एस्क्रो भुगतान वापस करने तक सीमित है। CarryGo कार्गो बीमा नहीं रखता है।',
          '6.2. खोई या क्षतिग्रस्त वस्तुओं के लिए अधिकतम मुआवजा निम्नलिखित सीमाओं तक सीमित है:',
        ],
        bullets: [
          'मानक पार्सल: रु 5,000',
          'इलेक्ट्रॉनिक्स: रु 15,000',
          'दस्तावेज़: रु 2,000',
        ],
        postBullets: [
          '6.3. CarryGo किसी भी शिपमेंट के लिए बीमा कवरेज प्रदान नहीं करता है। उपयोगकर्ताओं को उच्च मूल्य वाली वस्तुओं के लिए अलग से पारगमन बीमा लेने की सख्त सलाह दी जाती है।',
          '6.4. CarryGo विलंबित या विफल डिलीवरी से उत्पन्न होने वाले अप्रत्यक्ष, आकस्मिक, विशेष या परिणामी नुकसान के लिए उत्तरदायी नहीं है।',
          '6.5. ऐसे मामलों में जहां यात्री यह प्रदर्शित कर सकता है कि प्रेषक की अपर्याप्त पैकेजिंग के कारण क्षति हुई है, यात्री मुआवजे के लिए उत्तरदायी नहीं होगा।',
        ],
      },
      {
        number: '7',
        title: 'विवाद समाधान प्रक्रिया',
        paragraphs: [
          '7.1. सभी विवादों की सूचना डिलीवरी के 48 घंटों के भीतर (या गैर-डिलीवरी दावों के लिए अपेक्षित डिलीवरी तिथि के भीतर) CarryGo ऐप के माध्यम से दी जानी चाहिए।',
          '7.2. विवाद समाधान तीन-स्तरीय प्रक्रिया का पालन करता है: (क) इन-ऐप संदेश द्वारा पक्षों के बीच सीधा संवाद; (ख) CarryGo सहायता कर्मचारियों द्वारा मध्यस्थता; (ग) मध्यस्थता एवं सुलह अधिनियम, 1996 के तहत बाध्यकारी मध्यस्थता।',
          '7.3. विवाद समाधान के दौरान, समाधान होने तक एस्क्रो राशि रोकी जाएगी। कोई भी पक्ष विवादित राशि नहीं निकाल सकता।',
          '7.4. पिकअप और डिलीवरी दोनों का फोटोग्राफिक साक्ष्य विवाद समाधान के लिए महत्वपूर्ण है। जो पक्ष फोटोग्राफिक साक्ष्य प्रस्तुत करने में विफल रहते हैं, दावों में उनकी स्थिति कमजोर होगी।',
          '7.5. रु 15,000 से कम के दावों के लिए CarryGo का विवाद समाधान निर्णय अंतिम और दोनों पक्षों पर बाध्यकारी है। इस राशि से अधिक के दावों को मध्यस्थता के लिए आगे बढ़ाया जा सकता है।',
        ],
      },
      {
        number: '8',
        title: 'पहचान सत्यापन (KYC)',
        paragraphs: [
          '8.1. मुख्य प्लेटफ़ॉर्म सुविधाओं तक पहुंचने के लिए सभी उपयोगकर्ताओं को अपने ग्राहक को जानें (KYC) सत्यापन पूरा करना होगा। इसमें सरकार द्वारा जारी फोटो आईडी और चेहरे के मिलान के लिए लाइव सेल्फी शामिल है।',
          '8.2. केवाईसी डेटा डिजिटल पर्सनल डेटा प्रोटेक्शन एक्ट, 2023 के अनुपालन में सुरक्षित रूप से संसाधित और संग्रहीत किया जाता है।',
          '8.3. फर्जी पहचान दस्तावेज जमा करने वाले उपयोगकर्ताओं को स्थायी रूप से प्रतिबंधित किया जाएगा और अधिकारियों को सूचित किया जाएगा।',
          '8.4. CarryGo समय-समय पर या संदिग्ध गतिविधि पाए जाने पर पहचान का पुनः सत्यापन कर सकता है।',
        ],
      },
      {
        number: '9',
        title: 'डिलीवरी सत्यापन',
        paragraphs: [
          '9.1. डिलीवरी की पुष्टि तभी होती है जब प्राप्तकर्ता प्रेषक को प्रदान किया गया वन-टाइम पासवर्ड (ओटीपी) यात्री के ऐप में दर्ज करता है।',
          '9.2. ओटीपी पुष्टि के साथ-साथ डिलीवरी का फोटोग्राफिक प्रमाण आवश्यक है।',
          '9.3. प्रेषक को डिलीवरी ओटीपी केवल अभीष्ट प्राप्तकर्ता के अलावा किसी अन्य के साथ साझा नहीं करना चाहिए।',
          '9.4. सफल ओटीपी-आधारित डिलीवरी पुष्टि के बाद ही यात्री को एस्क्रो से भुगतान जारी किया जाता है।',
        ],
      },
      {
        number: '10',
        title: 'भुगतान एवं एस्क्रो प्रणाली',
        paragraphs: [
          '10.1. सभी भुगतान CarryGo के सुरक्षित एस्क्रो सिस्टम के माध्यम से संसाधित किए जाते हैं। प्रेषक बुकिंग पर भुगतान करता है, और सफल डिलीवरी तक धनराशि सुरक्षित रखी जाती है।',
          '10.2. CarryGo यात्री के भुगतान से काटी जाने वाली प्लेटफ़ॉर्म सेवा शुल्क (वर्तमान में डिलीवरी मूल्य का 10%) लेता है।',
          '10.3. यात्रियों को भुगतान यूपीआई या बैंक हस्तांतरण के माध्यम से पुष्टि की गई डिलीवरी के 24 घंटों के भीतर संसाधित किया जाता है।',
          '10.4. डिलीवरी विफलता या रद्दीकरण के मामले में, प्रेषकों को रिफंड 3-5 कार्यदिवसों के भीतर संसाधित किया जाता है।',
        ],
      },
      {
        number: '11',
        title: 'रिफंड नीति',
        paragraphs: [
          '11.1. पूर्ण रिफंड: यदि यात्री पिकअप से पहले रद्द करता है, या यदि यात्री की लापरवाही के कारण डिलीवरी विफल हो जाती है।',
          '11.2. आंशिक रिफंड: यदि प्रेषक यात्री द्वारा यात्रा शुरू करने के बाद रद्द करता है (यात्री मुआवजे के रूप में 50% तक रोका जा सकता है)।',
          '11.3. कोई रिफंड नहीं: यदि प्रेषक प्रतिबंधित वस्तुएं भेजता है, गलत विवरण देता है, या सहमत हैंडओवर बिंदु पर उपस्थित होने में विफल रहता है।',
          '11.4. क्षति के दावों का मूल्यांकन विवाद समाधान प्रक्रिया के माध्यम से मामला-दर-मामला आधार पर किया जाता है।',
        ],
      },
      {
        number: '12',
        title: 'धोखाधड़ी रोकथाम',
        paragraphs: [
          '12.1. CarryGo संदिग्ध गतिविधि की पहचान करने के लिए स्वचालित धोखाधड़ी पहचान प्रणालियों का उपयोग करता है, जिसमें नकली खाते, झूठी डिलीवरी पुष्टि, प्रेषक और यात्री के बीच मिलीभगत और मनी लॉन्ड्रिंग शामिल हैं।',
          '12.2. कपटपूर्ण गतिविधियों में शामिल उपयोगकर्ताओं को तत्काल खाता निलंबन, लंबित भुगतानों की जब्ती और संभावित आपराधिक मुकदमे का सामना करना पड़ेगा।',
          '12.3. बार-बार झूठे क्षति दावे दर्ज करने वाले प्रेषकों को चिह्नित किया जाएगा और वे दावा प्रणाली तक पहुंच खो सकते हैं।',
        ],
      },
      {
        number: '13',
        title: 'रद्दीकरण नीति',
        paragraphs: [
          '13.1. यदि किसी यात्री ने स्वीकार नहीं किया है, तो प्रेषक बुकिंग के 30 मिनट के भीतर निःशुल्क रद्द कर सकते हैं।',
          '13.2. यात्री की स्वीकृति के बाद प्रेषक के रद्दीकरण पर डिलीवरी मूल्य का 15% शुल्क (न्यूनतम रु 50) लगेगा।',
          '13.3. यात्री निर्धारित पिकअप से 2 घंटे पहले तक बिना किसी जुर्माने के रद्द कर सकते हैं। देर से रद्दीकरण उनके विश्वसनीयता स्कोर को प्रभावित करता है।',
          '13.4. बार-बार रद्दीकरण (30 दिनों में 3 से अधिक) के परिणामस्वरूप अस्थायी खाता प्रतिबंध हो सकता है।',
        ],
      },
      {
        number: '14',
        title: 'खाता निलंबन एवं समाप्ति',
        paragraphs: [
          '14.1. CarryGo इन शर्तों के उल्लंघन के लिए उपयोगकर्ता खातों को निलंबित या समाप्त करने का अधिकार सुरक्षित रखता है, जिसमें शामिल हैं:',
        ],
        bullets: [
          'प्रतिबंधित वस्तुओं को भेजना या भेजने का प्रयास करना',
          'पहचान की धोखाधड़ी या नकली दस्तावेजों का उपयोग',
          'डिलीवरी दायित्वों को पूरा करने में बार-बार विफलता',
          'अन्य उपयोगकर्ताओं के प्रति उत्पीड़न, धमकी या अपमानजनक व्यवहार',
          'रेटिंग या समीक्षाओं में हेरफेर',
          'ऑफ़-प्लेटफ़ॉर्म लेनदेन के माध्यम से प्लेटफ़ॉर्म शुल्क से बचना',
        ],
        postBullets: [
          '14.2. निलंबित उपयोगकर्ता 30 दिनों के भीतर अपील कर सकते हैं। स्थायी प्रतिबंध अंतिम और गैर-अपील योग्य हैं।',
          '14.3. समाप्ति पर, किसी भी सक्रिय डिलीवरी की शर्तों के अनुसार बकाया एस्क्रो शेष राशि का निपटान किया जाएगा।',
        ],
      },
      {
        number: '15',
        title: 'अप्रत्याशित घटना (Force Majeure)',
        paragraphs: [
          '15.1. न तो CarryGo और न ही कोई उपयोगकर्ता उचित नियंत्रण से परे परिस्थितियों के कारण दायित्वों को पूरा करने में विफलता के लिए उत्तरदायी होगा, जिसमें प्राकृतिक आपदाएं, महामारी, सरकारी आदेश, हड़ताल, नागरिक अशांति या परिवहन व्यवधान शामिल हैं।',
          '15.2. अप्रत्याशित घटनाओं में, प्रेषक को पूर्ण रिफंड और यात्री पर बिना किसी जुर्माने के डिलीवरी में देरी या रद्दीकरण हो सकता है।',
        ],
      },
      {
        number: '16',
        title: 'गोपनीयता एवं डेटा सुरक्षा',
        paragraphs: [
          '16.1. CarryGo डिजिटल पर्सनल डेटा प्रोटेक्शन एक्ट, 2023 (DPDP Act) के अनुसार व्यक्तिगत डेटा एकत्र और संसाधित करता है।',
          '16.2. एकत्र किए गए डेटा में पहचान दस्तावेज (केवाईसी के लिए), स्थान डेटा (डिलीवरी ट्रैकिंग के लिए), संचार लॉग (विवाद समाधान के लिए) और भुगतान जानकारी शामिल हैं।',
          '16.3. उपयोगकर्ता कानूनी प्रतिधारण आवश्यकताओं के अधीन अपने व्यक्तिगत डेटा तक पहुंचने, सुधारने और हटाने का अनुरोध करने का अधिकार रखते हैं।',
          '16.4. CarryGo तीसरे पक्षों को व्यक्तिगत डेटा नहीं बेचता है। वैध कानूनी अनुरोध पर डेटा कानून प्रवर्तन एजेंसियों के साथ साझा किया जा सकता है।',
          '16.5. स्थान डेटा केवल सक्रिय डिलीवरी के दौरान एकत्र किया जाता है और डिलीवरी के 90 दिनों के बाद बनाए नहीं रखा जाता है।',
        ],
      },
      {
        number: '17',
        title: 'भारतीय कानून का अनुपालन',
        paragraphs: [
          '17.1. CarryGo लागू भारतीय कानूनों के अनुपालन में संचालित होता है, जिसमें सूचना प्रौद्योगिकी अधिनियम, 2000; उपभोक्ता संरक्षण अधिनियम, 2019; भुगतान और निपटान प्रणाली अधिनियम, 2007; और डिजिटल पर्सनल डेटा प्रोटेक्शन एक्ट, 2023 शामिल हैं।',
          '17.2. उपयोगकर्ताओं को प्लेटफ़ॉर्म का उपयोग करते समय भारत के सभी लागू कानूनों का पालन करना होगा, जिसमें माल के अंतर-राज्यीय परिवहन के लिए सीमा शुल्क नियम शामिल हैं।',
          '17.3. जीएसटी के अधीन किसी भी सामान के पास उचित दस्तावेज होने चाहिए। CarryGo व्यक्तिगत शिपमेंट के कर अनुपालन के लिए उत्तरदायी नहीं है।',
        ],
      },
      {
        number: '18',
        title: 'लागू कानून एवं अधिकार क्षेत्र',
        paragraphs: [
          '18.1. ये शर्तें भारत के कानूनों द्वारा शासित होंगी और उनके अनुसार व्याख्यायित की जाएंगी।',
          '18.2. इन शर्तों से उत्पन्न होने वाला कोई भी विवाद जिसे प्लेटफ़ॉर्म के विवाद समाधान तंत्र के माध्यम से हल नहीं किया जा सकता, बेंगलुरु, कर्नाटक, भारत में अदालतों के अनन्य अधिकार क्षेत्र के अधीन होगा।',
          '18.3. रु 15,000 से अधिक के दावों के लिए, मध्यस्थता और सुलह अधिनियम, 1996 के तहत बेंगलुरु में अंग्रेजी में आयोजित बाध्यकारी मध्यस्थता के माध्यम से विवादों का समाधान किया जाएगा।',
        ],
      },
      {
        number: '19',
        title: 'संशोधन एवं परिवर्तन',
        paragraphs: [
          '19.1. CarryGo किसी भी समय इन शर्तों को संशोधित करने का अधिकार सुरक्षित रखता है। महत्वपूर्ण परिवर्तनों की सूचना प्रभावी होने से कम से कम 15 दिन पहले इन-ऐप अधिसूचना और ईमेल के माध्यम से दी जाएगी।',
          '19.2. परिवर्तनों की प्रभावी तिथि के बाद प्लेटफ़ॉर्म का निरंतर उपयोग संशोधित शर्तों की स्वीकृति माना जाएगा।',
          '19.3. जो उपयोगकर्ता संशोधित शर्तों से सहमत नहीं हैं, वे अपना खाता बंद कर सकते हैं और अपना डेटा हटाने का अनुरोध कर सकते हैं।',
        ],
      },
      {
        number: '20',
        title: 'संपर्क एवं शिकायत निवारण अधिकारी',
        paragraphs: [
          '20.1. प्रश्नों, शिकायतों या समस्याओं के लिए हमारे शिकायत अधिकारी से संपर्क करें: grievance@carrygo.in',
          '20.2. सूचना प्रौद्योगिकी नियम, 2021 के अनुपालन में शिकायतों को 24 घंटों के भीतर स्वीकार किया जाएगा और 15 दिनों के भीतर हल किया जाएगा।',
          '20.3. CarryGo Technologies Private Limited, पंजीकृत कार्यालय: बेंगलुरु, कर्नाटक, भारत।',
        ],
      },
    ],
    finalNote: 'CarryGo का उपयोग करके, आप स्वीकार करते हैं कि आपने इन नियमों और शर्तों को पढ़ लिया है, समझ लिया है और इनसे बाध्य होने के लिए सहमत हैं।',
  },
};
