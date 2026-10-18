import {
  getContextBanner,
  getRequestCardViewModel,
} from '@/components/feature/RequestCard';
import { Request } from '@/types';
import { Colors } from '@/constants/theme';

describe('RequestCard - View Model & Pre-Acceptance Communication', () => {
  const mockColors = Colors;

  const makeMockRequest = (overrides: Partial<Request> = {}): Request => ({
    id: 'req-001',
    tripId: 'trip-202',
    parcelId: 'parcel-101',
    senderId: 'user-sender',
    senderName: 'Suman Sen',
    travellerId: 'user-traveler',
    travellerName: 'Vikram Joshi',
    price: 350,
    status: 'pending',
    createdAt: '2026-10-17T12:00:00Z',
    updatedAt: '2026-10-17T12:00:00Z',
    fromCity: 'Delhi',
    toCity: 'Chandigarh',
    parcelCategory: 'electronics',
    parcelWeight: 2.5,
    ...overrides,
  });

  describe('getContextBanner - Pre-Acceptance Messaging', () => {
    it('prompts traveler to review compatibility or chat before accepting', () => {
      const req = makeMockRequest({ status: 'pending' });
      const banner = getContextBanner(
        req,
        /* isSender */ false,
        /* isTraveller */ true,
        /* isRequester */ false,
        'Suman Sen',
        mockColors
      );

      expect(banner?.title).toBe('Action Needed: Delivery Request Received');
      expect(banner?.message).toContain('tap Chat to ask questions');
      expect(banner?.icon).toBe('flash-outline');
    });

    it('prompts sender receiving carry offer that they can chat or accept to escrow', () => {
      const req = makeMockRequest({ status: 'pending' });
      const banner = getContextBanner(
        req,
        /* isSender */ true,
        /* isTraveller */ false,
        /* isRequester */ false,
        'Vikram Joshi',
        mockColors
      );

      expect(banner?.title).toBe('Action Needed: Carry Offer Received');
      expect(banner?.message).toContain('Chat to coordinate or accept to proceed to escrow');
    });

    it('informs requester waiting for counterparty that they can chat anytime', () => {
      const reqSender = makeMockRequest({ status: 'pending' });
      const bannerSender = getContextBanner(
        reqSender,
        /* isSender */ true,
        /* isTraveller */ false,
        /* isRequester */ true,
        'Vikram Joshi',
        mockColors
      );

      expect(bannerSender?.title).toBe('Waiting for Traveler Response');
      expect(bannerSender?.message).toContain('Chat anytime to coordinate package details before acceptance');

      const reqTraveler = makeMockRequest({ status: 'pending' });
      const bannerTraveler = getContextBanner(
        reqTraveler,
        /* isSender */ false,
        /* isTraveller */ true,
        /* isRequester */ true,
        'Suman Sen',
        mockColors
      );

      expect(bannerTraveler?.title).toBe('Waiting for Sender Response');
      expect(bannerTraveler?.message).toContain('Chat anytime to coordinate package details before acceptance');
    });

    it('returns escrow deposit prompt when request is accepted and user is sender', () => {
      const req = makeMockRequest({ status: 'accepted' });
      const banner = getContextBanner(
        req,
        /* isSender */ true,
        /* isTraveller */ false,
        /* isRequester */ false,
        'Vikram Joshi',
        mockColors
      );

      expect(banner?.title).toBe('Step 2: Deposit Escrow Payment');
      expect(banner?.message).toContain('Deposit ₹350 in secure escrow');
    });
  });

  describe('getRequestCardViewModel', () => {
    it('correctly models incoming pending request for traveler', () => {
      const req = makeMockRequest({ status: 'pending' });
      const vm = getRequestCardViewModel({
        request: req,
        type: 'incoming',
        currentUserId: 'user-traveler',
        C: mockColors,
      });

      expect(vm.isTraveller).toBe(true);
      expect(vm.isSender).toBe(false);
      expect(vm.personName).toBe('Suman Sen');
      expect(vm.showAcceptDecline).toBe(true);
      expect(vm.showCancel).toBe(false);
      expect(vm.showPayButton).toBe(false);
    });

    it('correctly models outgoing pending request for sender', () => {
      const req = makeMockRequest({ status: 'pending' });
      const vm = getRequestCardViewModel({
        request: req,
        type: 'outgoing',
        currentUserId: 'user-sender',
        C: mockColors,
      });

      expect(vm.isSender).toBe(true);
      expect(vm.isTraveller).toBe(false);
      expect(vm.personName).toBe('Vikram Joshi');
      expect(vm.showAcceptDecline).toBe(false);
      expect(vm.showCancel).toBe(true);
    });

    it('shows pay button for sender on accepted requests', () => {
      const req = makeMockRequest({ status: 'accepted' });
      const vm = getRequestCardViewModel({
        request: req,
        type: 'incoming',
        currentUserId: 'user-sender',
        C: mockColors,
      });

      expect(vm.showPayButton).toBe(true);
      expect(vm.showAcceptDecline).toBe(false);
    });
  });
});
