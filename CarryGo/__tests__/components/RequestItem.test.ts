import { getRequestItemActions } from '@/components/feature/RequestItem';

describe('RequestItem - UX Actions & Role Permissions', () => {
  describe('Pending state', () => {
    it('allows traveller to chat, accept, and reject', () => {
      const actions = getRequestItemActions('pending', 'traveller');

      expect(actions.canChat).toBe(true);
      expect(actions.chatLabel).toBe('Chat');
      expect(actions.canAccept).toBe(true);
      expect(actions.canReject).toBe(true);
      expect(actions.canEscrowPayment).toBe(false);
      expect(actions.canTrackDelivery).toBe(false);
      expect(actions.isCompleted).toBe(false);
    });

    it('allows sender to chat with traveler while pending, without accept/decline permissions', () => {
      const actions = getRequestItemActions('pending', 'sender');

      expect(actions.canChat).toBe(true);
      expect(actions.chatLabel).toBe('Chat with Traveler');
      expect(actions.canAccept).toBe(false);
      expect(actions.canReject).toBe(false);
      expect(actions.canEscrowPayment).toBe(false);
      expect(actions.canTrackDelivery).toBe(false);
      expect(actions.isCompleted).toBe(false);
    });

    it('blocks observer from accepting or rejecting', () => {
      const actions = getRequestItemActions('pending', 'observer');

      expect(actions.canChat).toBe(true);
      expect(actions.canAccept).toBe(false);
      expect(actions.canReject).toBe(false);
    });
  });

  describe('Accepted state', () => {
    it('allows traveller to chat and track delivery, but not escrow payment', () => {
      const actions = getRequestItemActions('accepted', 'traveller');

      expect(actions.canChat).toBe(true);
      expect(actions.chatLabel).toBe('Chat');
      expect(actions.canAccept).toBe(false);
      expect(actions.canReject).toBe(false);
      expect(actions.canEscrowPayment).toBe(false);
      expect(actions.canTrackDelivery).toBe(true);
      expect(actions.isCompleted).toBe(false);
    });

    it('allows sender to chat, escrow payment, and track delivery', () => {
      const actions = getRequestItemActions('accepted', 'sender');

      expect(actions.canChat).toBe(true);
      expect(actions.chatLabel).toBe('Chat');
      expect(actions.canAccept).toBe(false);
      expect(actions.canReject).toBe(false);
      expect(actions.canEscrowPayment).toBe(true);
      expect(actions.canTrackDelivery).toBe(true);
      expect(actions.isCompleted).toBe(false);
    });
  });

  describe('Completed state', () => {
    it('marks completed and disables active delivery actions', () => {
      const actions = getRequestItemActions('completed', 'traveller');

      expect(actions.isCompleted).toBe(true);
      expect(actions.canAccept).toBe(false);
      expect(actions.canReject).toBe(false);
      expect(actions.canTrackDelivery).toBe(false);
      expect(actions.canEscrowPayment).toBe(false);
    });
  });

  describe('Cancelled / Rejected state', () => {
    it('disables accept, reject, escrow, and delivery tracking', () => {
      const rejectedActions = getRequestItemActions('rejected', 'sender');
      expect(rejectedActions.canAccept).toBe(false);
      expect(rejectedActions.canReject).toBe(false);
      expect(rejectedActions.canEscrowPayment).toBe(false);
      expect(rejectedActions.canTrackDelivery).toBe(false);
      expect(rejectedActions.isCompleted).toBe(false);

      const cancelledActions = getRequestItemActions('cancelled', 'traveller');
      expect(cancelledActions.canAccept).toBe(false);
      expect(cancelledActions.canReject).toBe(false);
      expect(cancelledActions.canEscrowPayment).toBe(false);
      expect(cancelledActions.canTrackDelivery).toBe(false);
      expect(cancelledActions.isCompleted).toBe(false);
    });
  });
});
