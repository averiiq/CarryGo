import { getChatHeaderMeta } from '@/components/feature/chat/chatHeaderMeta';

describe('ChatHeaderMeta - Pre-Acceptance & Delivery Navigation', () => {
  describe('Pending Request State', () => {
    it('configures header to review pending request rather than opening missing delivery', () => {
      const meta = getChatHeaderMeta('pending', false, 'req-123');

      expect(meta.isPending).toBe(true);
      expect(meta.icon).toBe('schedule');
      expect(meta.actionText).toBe('Review');
      expect(meta.subtitle).toContain('Request pending acceptance');
      expect(meta.actionRoute).toEqual({
        pathname: '/(tabs)/requests',
      });
    });

    it('applies amber tint for pending status in light and dark modes', () => {
      const light = getChatHeaderMeta('pending', false, 'req-123', false);
      const dark = getChatHeaderMeta('pending', false, 'req-123', true);

      expect(light.iconColor).toBe('#D97706');
      expect(light.iconBg).toBe('#FEF3C7');
      expect(dark.iconBg).toBe('#D9770633');
    });
  });

  describe('Accepted & Active State', () => {
    it('configures header to track active delivery when accepted', () => {
      const meta = getChatHeaderMeta('accepted', false, 'req-456');

      expect(meta.isPending).toBe(false);
      expect(meta.icon).toBe('local-shipping');
      expect(meta.actionText).toBe('Track');
      expect(meta.subtitle).toContain('track live parcel progress');
      expect(meta.actionRoute).toEqual({
        pathname: '/delivery/[id]',
        params: { id: 'req-456' },
      });
    });

    it('falls back to requests tab if requestId is missing', () => {
      const meta = getChatHeaderMeta('accepted', false, undefined);
      expect(meta.actionRoute).toEqual({
        pathname: '/(tabs)/requests',
        params: undefined,
      });
    });
  });

  describe('Completed State', () => {
    it('configures verified completion state when isDeliveryCompleted is true', () => {
      const meta = getChatHeaderMeta(undefined, true, 'req-789');

      expect(meta.isPending).toBe(false);
      expect(meta.icon).toBe('verified');
      expect(meta.actionText).toBe('View');
      expect(meta.subtitle).toContain('Delivery completed & verified');
      expect(meta.actionRoute).toEqual({
        pathname: '/delivery/[id]',
        params: { id: 'req-789' },
      });
    });

    it('configures verified completion state when requestStatus is completed', () => {
      const meta = getChatHeaderMeta('completed', false, 'req-789');

      expect(meta.isPending).toBe(false);
      expect(meta.icon).toBe('verified');
      expect(meta.actionText).toBe('View');
    });
  });
});
