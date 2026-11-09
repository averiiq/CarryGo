import { isMeaningfulDraft } from '../../hooks/useFormDraft';

describe('useFormDraft & isMeaningfulDraft Suite', () => {
  it('returns false for null, undefined, or empty objects', () => {
    expect(isMeaningfulDraft(null)).toBe(false);
    expect(isMeaningfulDraft(undefined)).toBe(false);
    expect(isMeaningfulDraft({})).toBe(false);
  });

  it('returns false for default empty parcel boilerplate', () => {
    const emptyParcelDraft = {
      fromCity: '',
      toCity: '',
      deliveryDate: '',
      preferredTime: 'anytime',
      category: 'documents',
      description: '',
      weight: '',
      priceOffer: '',
      images: [],
    };
    expect(isMeaningfulDraft(emptyParcelDraft)).toBe(false);
  });

  it('returns false for default empty trip boilerplate', () => {
    const emptyTripDraft = {
      fromCity: '',
      toCity: '',
      date: '',
      time: '',
      vehicle: 'car',
      capacity: '',
      price: '',
      allowedCategories: ['documents', 'electronics'],
    };
    expect(isMeaningfulDraft(emptyTripDraft)).toBe(false);
  });

  it('returns true when user enters origin city', () => {
    expect(isMeaningfulDraft({ fromCity: 'Gurugram' })).toBe(true);
  });

  it('returns true when user enters destination city', () => {
    expect(isMeaningfulDraft({ toCity: 'Rohtak' })).toBe(true);
  });

  it('returns true when user enters description or parcel details', () => {
    expect(isMeaningfulDraft({ description: 'Laptop charger' })).toBe(true);
    expect(isMeaningfulDraft({ weight: '2' })).toBe(true);
    expect(isMeaningfulDraft({ priceOffer: '250' })).toBe(true);
    expect(isMeaningfulDraft({ capacity: '15' })).toBe(true);
  });

  it('returns true when user attaches images', () => {
    expect(isMeaningfulDraft({ images: ['file:///path/to/img.jpg'] })).toBe(true);
  });
});

