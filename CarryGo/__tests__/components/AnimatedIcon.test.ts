import { ANIMATED_ICONS, AnimatedIconName } from '@/components/ui/AnimatedIcon';

describe('AnimatedIcon component & useAnimations registry', () => {
  const iconKeys: AnimatedIconName[] = [
    'home',
    'activity',
    'messageSquare',
    'user',
    'notification',
    'notification2',
    'searchToX',
    'filter',
    'settings',
    'edit',
    'calendar',
    'heart',
    'check',
    'checkmark',
    'trash',
    'share',
    'lock',
    'arrowLeft',
    'plusToX',
    'package',
    'truck',
    'star',
    'phone',
    'mail',
    'shield',
    'mapPin',
    'navigation',
    'explore',
    'bookmark',
  ];

  it('contains all required useAnimations icons with valid Lottie structure', () => {
    for (const key of iconKeys) {
      const icon = ANIMATED_ICONS[key] as any;
      expect(icon).toBeDefined();

      const animData = icon?.default?.animationData || icon?.animationData;
      expect(animData).toBeDefined();
      expect(typeof animData.v).toBe('string');
      expect(typeof animData.fr).toBe('number');
      expect(typeof animData.ip).toBe('number');
      expect(typeof animData.op).toBe('number');
      expect(Array.isArray(animData.layers)).toBe(true);
      expect(animData.layers.length).toBeGreaterThan(0);
    }
  });

  it('verifies home icon has proper frame rate and width/height', () => {
    const home = (ANIMATED_ICONS.home as any)?.default?.animationData || (ANIMATED_ICONS.home as any)?.animationData;
    expect(home.w).toBe(32);
    expect(home.h).toBe(32);
    expect(home.op).toBeGreaterThan(0);
  });

  it('verifies notification bell icon has proper animation boundaries', () => {
    const notif = (ANIMATED_ICONS.notification as any)?.default?.animationData || (ANIMATED_ICONS.notification as any)?.animationData;
    expect(notif.op).toBe(25);
    expect(notif.layers.length).toBeGreaterThan(0);
  });

  it('verifies searchToX icon has toggle animation frames', () => {
    const search = (ANIMATED_ICONS.searchToX as any)?.default?.animationData || (ANIMATED_ICONS.searchToX as any)?.animationData;
    expect(search.op).toBe(30);
    expect(search.fr).toBe(30);
  });

  it('verifies filter icon has interactive sliders', () => {
    const filter = (ANIMATED_ICONS.filter as any)?.default?.animationData || (ANIMATED_ICONS.filter as any)?.animationData;
    expect(filter.op).toBe(60);
    expect(filter.layers.length).toBeGreaterThan(0);
  });
});
