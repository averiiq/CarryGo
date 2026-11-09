import {
  PRIVACY_CONTENT,
  REFUND_CONTENT,
  SHIPPING_CONTENT,
  TERMS_CONTENT,
  DRAFT_DISCLAIMER,
  BACK_BUTTON_LABEL,
  LEGAL_LANGUAGE_STORAGE_KEY,
} from '../constants/legal-bilingual-content';

describe('Bilingual Legal and Informational Content Suite', () => {
  describe('Constants & Configuration', () => {
    it('defines expected storage key', () => {
      expect(LEGAL_LANGUAGE_STORAGE_KEY).toBe('carrygo_legal_language');
    });

    it('provides both English and Hindi draft legal disclaimers', () => {
      expect(DRAFT_DISCLAIMER.en).toContain('legally binding authority');
      expect(DRAFT_DISCLAIMER.hi).toContain('प्रारूप अनुवाद');
      expect(BACK_BUTTON_LABEL.en).toBe('Go back');
      expect(BACK_BUTTON_LABEL.hi).toBe('वापस जाएं');
    });
  });

  describe('Privacy Policy Content', () => {
    it('has identical section count between EN and HI', () => {
      expect(PRIVACY_CONTENT.en.sections.length).toBe(6);
      expect(PRIVACY_CONTENT.hi.sections.length).toBe(6);
    });

    it('contains non-empty fields in both languages', () => {
      (['en', 'hi'] as const).forEach((lang) => {
        const doc = PRIVACY_CONTENT[lang];
        expect(doc.headerTitle.length).toBeGreaterThan(0);
        expect(doc.effectiveDate.length).toBeGreaterThan(0);
        expect(doc.intro.length).toBeGreaterThan(0);
        expect(doc.contact.length).toBeGreaterThan(0);
        doc.sections.forEach((sec) => {
          expect(sec.title.length).toBeGreaterThan(0);
          expect(sec.body.length).toBeGreaterThan(0);
        });
      });
    });

    it('preserves verbatim original English texts', () => {
      expect(PRIVACY_CONTENT.en.headerTitle).toBe('Privacy Policy');
      expect(PRIVACY_CONTENT.en.effectiveDate).toBe('Effective Date: 29 August 2026');
      expect(PRIVACY_CONTENT.en.sections[0].title).toBe('Information we collect');
      expect(PRIVACY_CONTENT.en.sections[5].title).toBe('Your choices');
    });
  });

  describe('Refund Policy Content', () => {
    it('has identical section count between EN and HI', () => {
      expect(REFUND_CONTENT.en.sections.length).toBe(6);
      expect(REFUND_CONTENT.hi.sections.length).toBe(6);
    });

    it('contains non-empty fields in both languages', () => {
      (['en', 'hi'] as const).forEach((lang) => {
        const doc = REFUND_CONTENT[lang];
        expect(doc.headerTitle.length).toBeGreaterThan(0);
        expect(doc.badgeText.length).toBeGreaterThan(0);
        expect(doc.intro.length).toBeGreaterThan(0);
        expect(doc.contact.length).toBeGreaterThan(0);
        doc.sections.forEach((sec) => {
          expect(sec.title.length).toBeGreaterThan(0);
          expect(sec.body.length).toBeGreaterThan(0);
        });
      });
    });

    it('preserves verbatim original English texts', () => {
      expect(REFUND_CONTENT.en.headerTitle).toBe('Refund & Cancellation');
      expect(REFUND_CONTENT.en.sections[0].title).toBe('Cancellation Before Pickup');
    });
  });

  describe('Shipping Policy Content', () => {
    it('has identical section count between EN and HI', () => {
      expect(SHIPPING_CONTENT.en.sections.length).toBe(6);
      expect(SHIPPING_CONTENT.hi.sections.length).toBe(6);
    });

    it('contains non-empty fields in both languages', () => {
      (['en', 'hi'] as const).forEach((lang) => {
        const doc = SHIPPING_CONTENT[lang];
        expect(doc.headerTitle.length).toBeGreaterThan(0);
        expect(doc.badgeText.length).toBeGreaterThan(0);
        expect(doc.intro.length).toBeGreaterThan(0);
        expect(doc.contact.length).toBeGreaterThan(0);
        doc.sections.forEach((sec) => {
          expect(sec.title.length).toBeGreaterThan(0);
          expect(sec.body.length).toBeGreaterThan(0);
        });
      });
    });

    it('preserves verbatim original English texts', () => {
      expect(SHIPPING_CONTENT.en.headerTitle).toBe('Shipping & Delivery');
      expect(SHIPPING_CONTENT.en.sections[3].title).toBe('Prohibited and Restricted Items');
    });
  });

  describe('Terms of Service Content', () => {
    it('has 20 numbered sections in both EN and HI', () => {
      expect(TERMS_CONTENT.en.sections.length).toBe(20);
      expect(TERMS_CONTENT.hi.sections.length).toBe(20);

      TERMS_CONTENT.en.sections.forEach((enSec, i) => {
        const hiSec = TERMS_CONTENT.hi.sections[i];
        expect(hiSec.number).toBe(enSec.number);
        expect(hiSec.paragraphs.length).toBe(enSec.paragraphs.length);
        if (enSec.bullets) {
          expect(hiSec.bullets).toBeDefined();
          expect(hiSec.bullets!.length).toBe(enSec.bullets.length);
        }
        if (enSec.postBullets) {
          expect(hiSec.postBullets).toBeDefined();
          expect(hiSec.postBullets!.length).toBe(enSec.postBullets.length);
        }
      });
    });

    it('preserves prohibited items list count in Section 4', () => {
      const enSec4 = TERMS_CONTENT.en.sections.find((s) => s.number === '4');
      const hiSec4 = TERMS_CONTENT.hi.sections.find((s) => s.number === '4');
      expect(enSec4?.bullets?.length).toBe(12);
      expect(hiSec4?.bullets?.length).toBe(12);
    });

    it('preserves Section 6 liability compensation limits in both languages', () => {
      const enSec6 = TERMS_CONTENT.en.sections.find((s) => s.number === '6');
      const hiSec6 = TERMS_CONTENT.hi.sections.find((s) => s.number === '6');
      expect(enSec6?.bullets).toEqual([
        'Standard parcels: Rs 5,000',
        'Electronics: Rs 15,000',
        'Documents: Rs 2,000',
      ]);
      expect(hiSec6?.bullets).toEqual([
        'मानक पार्सल: रु 5,000',
        'इलेक्ट्रॉनिक्स: रु 15,000',
        'दस्तावेज़: रु 2,000',
      ]);
    });

    it('verifies preamble and final note exist in both languages', () => {
      expect(TERMS_CONTENT.en.preamble).toContain('peer-to-peer (P2P)');
      expect(TERMS_CONTENT.hi.preamble).toContain('पीयर-टू-पीयर (P2P)');
      expect(TERMS_CONTENT.en.finalNote).toContain('Terms and Conditions');
      expect(TERMS_CONTENT.hi.finalNote).toContain('नियमों और शर्तों');
    });
  });
});
