import {
  getRequestCardViewModel,
  getContextBanner,
  getRouteLocations,
} from '@/components/feature/RequestCard';
import { Request } from '@/types';
import { LightColors } from '@/constants/theme';

describe('RequestCard - UX & Flow Architecture Logic', () => {
  const mockSenderInitiatedRequest: Request = {
    id: 'req-sender-init',
    parcelId: 'parcel-101',
    tripId: 'trip-202',
    senderId: 'user-amit-sender',
    senderName: 'Amit Sharma',
    travellerId: 'user-priya-traveler',
    travellerName: 'Priya Verma',
    status: 'pending',
    price: 450,
    fromCity: 'Gurugram',
    toCity: 'Chandigarh',
    parcelCategory: 'documents',
    parcelWeight: 2.5,
    createdBy: 'user-amit-sender',
    createdAt: '2026-09-30T10:00:00Z',
    updatedAt: '2026-09-30T10:00:00Z',
  };

  const mockTravelerInitiatedOffer: Request = {
    id: 'req-traveler-init',
    parcelId: 'parcel-303',
    tripId: 'trip-404',
    senderId: 'user-amit-sender',
    senderName: 'Amit Sharma',
    travellerId: 'user-priya-traveler',
    travellerName: 'Priya Verma',
    status: 'pending',
    price: 350,
    fromCity: 'Delhi',
    toCity: 'Jaipur',
    parcelCategory: 'electronics',
    parcelWeight: 1.0,
    createdBy: 'user-priya-traveler',
    createdAt: '2026-09-30T11:00:00Z',
    updatedAt: '2026-09-30T11:00:00Z',
  };

  describe('Route Extraction', () => {
    it('extracts pickup and drop cities directly from request fields', () => {
      const route = getRouteLocations(mockSenderInitiatedRequest);
      expect(route.pickup).toBe('Gurugram');
      expect(route.drop).toBe('Chandigarh');
      expect(route.hasExactRoute).toBe(true);
    });

    it('falls back to regex parsing on message if cities are missing', () => {
      const reqWithMessage: Request = {
        ...mockSenderInitiatedRequest,
        fromCity: '',
        toCity: '',
        message: 'Please deliver from Panipat to Karnal by evening.',
      };
      const route = getRouteLocations(reqWithMessage);
      expect(route.pickup).toBe('Panipat');
      expect(route.drop).toBe('Karnal');
      expect(route.hasExactRoute).toBe(true);
    });

    it('defaults gracefully if no route is found', () => {
      const emptyReq: Request = {
        ...mockSenderInitiatedRequest,
        fromCity: '',
        toCity: '',
        message: undefined,
      };
      const route = getRouteLocations(emptyReq);
      expect(route.pickup).toBe('Pickup Point');
      expect(route.drop).toBe('Drop-off Point');
      expect(route.hasExactRoute).toBe(false);
    });
  });

  describe('Role Clarity & Contextual Titles', () => {
    it('sets correct role badge and title for Sender when Sender initiated request', () => {
      const vm = getRequestCardViewModel({
        request: mockSenderInitiatedRequest,
        type: 'outgoing',
        currentUserId: 'user-amit-sender',
        C: LightColors,
      });

      expect(vm.isSender).toBe(true);
      expect(vm.isTraveller).toBe(false);
      expect(vm.roleBadgeText).toBe('YOU ARE SENDER');
      expect(vm.cardTitle).toBe('Booking with Priya Verma');
      expect(vm.personName).toBe('Priya Verma');
      expect(vm.roleLabel).toBe('Traveler');
    });

    it('sets correct role badge and title for Traveler receiving Sender request', () => {
      const vm = getRequestCardViewModel({
        request: mockSenderInitiatedRequest,
        type: 'incoming',
        currentUserId: 'user-priya-traveler',
        C: LightColors,
      });

      expect(vm.isSender).toBe(false);
      expect(vm.isTraveller).toBe(true);
      expect(vm.roleBadgeText).toBe('YOU ARE TRAVELER');
      expect(vm.cardTitle).toBe('Delivery Request from Amit Sharma');
      expect(vm.personName).toBe('Amit Sharma');
      expect(vm.roleLabel).toBe('Sender');
    });

    it('sets correct role badge and title for Sender receiving Traveler carry offer', () => {
      const vm = getRequestCardViewModel({
        request: mockTravelerInitiatedOffer,
        type: 'incoming',
        currentUserId: 'user-amit-sender',
        C: LightColors,
      });

      expect(vm.isSender).toBe(true);
      expect(vm.isTraveller).toBe(false);
      expect(vm.isOffer).toBe(true);
      expect(vm.roleBadgeText).toBe('YOU ARE SENDER');
      expect(vm.cardTitle).toBe('Carry Offer from Priya Verma');
    });

    it('sets correct role badge and title for Traveler who sent a carry offer', () => {
      const vm = getRequestCardViewModel({
        request: mockTravelerInitiatedOffer,
        type: 'outgoing',
        currentUserId: 'user-priya-traveler',
        C: LightColors,
      });

      expect(vm.isSender).toBe(false);
      expect(vm.isTraveller).toBe(true);
      expect(vm.isOffer).toBe(true);
      expect(vm.roleBadgeText).toBe('YOU ARE TRAVELER');
      expect(vm.cardTitle).toBe('Carry Offer to Amit Sharma');
    });
  });

  describe('Role Inversion Payment Security Guard', () => {
    it('shows Pay Escrow button to Sender on accepted status (Booking flow)', () => {
      const acceptedReq: Request = {
        ...mockSenderInitiatedRequest,
        status: 'accepted',
      };

      const vm = getRequestCardViewModel({
        request: acceptedReq,
        type: 'outgoing',
        currentUserId: 'user-amit-sender',
        C: LightColors,
      });

      expect(vm.showPayButton).toBe(true);
      expect(vm.showDeliveryButton).toBe(true);
    });

    it('shows Pay Escrow button to Sender on accepted status (Carry Offer flow)', () => {
      const acceptedReq: Request = {
        ...mockTravelerInitiatedOffer,
        status: 'accepted',
      };

      const vm = getRequestCardViewModel({
        request: acceptedReq,
        type: 'incoming',
        currentUserId: 'user-amit-sender',
        C: LightColors,
      });

      // Sender MUST be able to pay even though type is 'incoming' (offer was received)
      expect(vm.isSender).toBe(true);
      expect(vm.showPayButton).toBe(true);
    });

    it('NEVER shows Pay Escrow button to Traveler on accepted status (Fix for Role Inversion Bug)', () => {
      const acceptedOffer: Request = {
        ...mockTravelerInitiatedOffer,
        status: 'accepted',
      };

      const vm = getRequestCardViewModel({
        request: acceptedOffer,
        type: 'outgoing',
        currentUserId: 'user-priya-traveler',
        C: LightColors,
      });

      // Traveler who sent offer has type 'outgoing', but must NOT be prompted to pay for their own service!
      expect(vm.isTraveller).toBe(true);
      expect(vm.showPayButton).toBe(false);
      expect(vm.showDeliveryButton).toBe(true);
    });
  });

  describe('Pending & Completed Action Controls', () => {
    it('presents Accept/Decline only to intended recipient in pending state', () => {
      const recipientVM = getRequestCardViewModel({
        request: mockSenderInitiatedRequest,
        type: 'incoming',
        currentUserId: 'user-priya-traveler',
        C: LightColors,
      });

      expect(recipientVM.showAcceptDecline).toBe(true);
      expect(recipientVM.showCancel).toBe(false);

      const requesterVM = getRequestCardViewModel({
        request: mockSenderInitiatedRequest,
        type: 'outgoing',
        currentUserId: 'user-amit-sender',
        C: LightColors,
      });

      expect(requesterVM.showAcceptDecline).toBe(false);
      expect(requesterVM.showCancel).toBe(true);
    });

    it('presents Receipt & Review on completed status', () => {
      const completedReq: Request = {
        ...mockSenderInitiatedRequest,
        status: 'completed',
      };

      const vm = getRequestCardViewModel({
        request: completedReq,
        type: 'outgoing',
        currentUserId: 'user-amit-sender',
        C: LightColors,
      });

      expect(vm.showReceiptReview).toBe(true);
      expect(vm.stepper.step1.done).toBe(true);
      expect(vm.stepper.step2.done).toBe(true);
      expect(vm.stepper.step3.done).toBe(true);
      expect(vm.stepper.step3.label).toBe('Delivered');
    });
  });

  describe('3-Stage Visual Order Stepper States', () => {
    it('sets correct stepper stages for pending request', () => {
      const vm = getRequestCardViewModel({
        request: mockSenderInitiatedRequest,
        type: 'outgoing',
        currentUserId: 'user-amit-sender',
        C: LightColors,
      });

      expect(vm.stepper.step1.current).toBe(true);
      expect(vm.stepper.step1.done).toBe(false);
      expect(vm.stepper.step2.done).toBe(false);
      expect(vm.stepper.step2.label).toBe('Escrow');
      expect(vm.stepper.step3.done).toBe(false);
      expect(vm.stepper.step3.label).toBe('Delivery');
    });

    it('sets Escrow Due for Sender when request is accepted', () => {
      const acceptedReq: Request = {
        ...mockSenderInitiatedRequest,
        status: 'accepted',
      };

      const vm = getRequestCardViewModel({
        request: acceptedReq,
        type: 'outgoing',
        currentUserId: 'user-amit-sender',
        C: LightColors,
      });

      expect(vm.stepper.step1.done).toBe(true);
      expect(vm.stepper.step2.label).toBe('Escrow Due');
      expect(vm.stepper.step3.label).toBe('Handover');
    });

    it('sets Escrow Pending for Traveler when request is accepted', () => {
      const acceptedReq: Request = {
        ...mockSenderInitiatedRequest,
        status: 'accepted',
      };

      const vm = getRequestCardViewModel({
        request: acceptedReq,
        type: 'incoming',
        currentUserId: 'user-priya-traveler',
        C: LightColors,
      });

      expect(vm.stepper.step1.done).toBe(true);
      expect(vm.stepper.step2.label).toBe('Escrow Pending');
      expect(vm.stepper.step3.label).toBe('Handover');
    });
  });

  describe('Context Callout Banners', () => {
    it('renders actionable banner for traveler with pending delivery request', () => {
      const banner = getContextBanner(mockSenderInitiatedRequest, false, true, false, 'Amit Sharma', LightColors);
      expect(banner).not.toBeNull();
      expect(banner?.title).toBe('Action Needed: Delivery Request Received');
      expect(banner?.message).toContain('Review route compatibility and tap Accept');
    });

    it('renders actionable banner for sender with pending carry offer', () => {
      const banner = getContextBanner(mockTravelerInitiatedOffer, true, false, false, 'Priya Verma', LightColors);
      expect(banner).not.toBeNull();
      expect(banner?.title).toBe('Action Needed: Carry Offer Received');
      expect(banner?.message).toContain('offered to deliver your parcel for ₹350');
    });

    it('renders escrow deposit prompt for sender when request is accepted', () => {
      const acceptedReq: Request = {
        ...mockSenderInitiatedRequest,
        status: 'accepted',
      };
      const banner = getContextBanner(acceptedReq, true, false, true, 'Priya Verma', LightColors);
      expect(banner).not.toBeNull();
      expect(banner?.title).toBe('Step 2: Deposit Escrow Payment');
      expect(banner?.message).toContain('Deposit ₹450 in secure escrow');
    });
  });
});
