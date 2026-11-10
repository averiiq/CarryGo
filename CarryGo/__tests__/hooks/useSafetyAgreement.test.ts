import { renderHook, act, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafetyAgreement, SAFETY_REFRESH_INTERVAL } from '@/hooks/useSafetyAgreement';

describe('useSafetyAgreement hook', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
  });

  it('requires safety flow on 1st send when user has never agreed', async () => {
    const { result } = renderHook(() =>
      useSafetyAgreement('user-1', 'sender')
    );

    await waitFor(() => {
      expect(result.current.isReady).toBe(true);
    });

    expect(result.current.hasAgreed).toBe(false);
    expect(result.current.shouldShowSafety).toBe(true);
    expect(result.current.actionCount).toBe(0);
  });

  it('marks agreed and suppresses safety flow for subsequent sends', async () => {
    const { result } = renderHook(() =>
      useSafetyAgreement('user-1', 'sender')
    );

    await waitFor(() => {
      expect(result.current.isReady).toBe(true);
    });
    expect(result.current.shouldShowSafety).toBe(true);

    await act(async () => {
      await result.current.markAgreed();
    });

    expect(result.current.hasAgreed).toBe(true);
    expect(result.current.shouldShowSafety).toBe(false);

    // Simulate 3 parcel sends
    await act(async () => {
      await result.current.recordActionCompleted();
      await result.current.recordActionCompleted();
      await result.current.recordActionCompleted();
    });

    expect(result.current.actionCount).toBe(3);
    // Should NOT show safety on sends 2, 3, 4 (diff < 5)
    expect(result.current.shouldShowSafety).toBe(false);
  });

  it('triggers safety refresher flow only after 5 parcel sends', async () => {
    // Pre-populate storage as agreed at count 0
    await AsyncStorage.setItem('CARRYGO_SAFETY_AGREED_SENDER_user-1', 'true');
    await AsyncStorage.setItem('CARRYGO_SAFETY_COUNT_SENDER_user-1', '4');
    await AsyncStorage.setItem('CARRYGO_SAFETY_LAST_SHOWN_SENDER_user-1', '0');

    const { result } = renderHook(() =>
      useSafetyAgreement('user-1', 'sender')
    );

    await waitFor(() => {
      expect(result.current.isReady).toBe(true);
    });
    expect(result.current.actionCount).toBe(4);
    // 4 - 0 = 4 (< 5), should NOT show
    expect(result.current.shouldShowSafety).toBe(false);

    // Record the 5th parcel send
    await act(async () => {
      await result.current.recordActionCompleted();
    });

    expect(result.current.actionCount).toBe(5);

    // Re-render hook to simulate reopening parcel send flow
    const { result: reloaded } = renderHook(() =>
      useSafetyAgreement('user-1', 'sender')
    );
    await waitFor(() => {
      expect(reloaded.current.isReady).toBe(true);
    });

    // 5 - 0 = 5 (>= 5), MUST show refresher!
    expect(reloaded.current.shouldShowSafety).toBe(true);

    // Review & Agree
    await act(async () => {
      await reloaded.current.markAgreed();
    });

    expect(reloaded.current.shouldShowSafety).toBe(false);
  });

  it('supports traveller role independently from sender', async () => {
    // SENDER has agreed, but TRAVELLER has not
    await AsyncStorage.setItem('CARRYGO_SAFETY_AGREED_SENDER_user-1', 'true');

    const { result: travellerHook } = renderHook(() =>
      useSafetyAgreement('user-1', 'traveller')
    );

    await waitFor(() => {
      expect(travellerHook.current.isReady).toBe(true);
    });

    expect(travellerHook.current.hasAgreed).toBe(false);
    expect(travellerHook.current.shouldShowSafety).toBe(true);

    await act(async () => {
      await travellerHook.current.markAgreed();
    });

    expect(travellerHook.current.hasAgreed).toBe(true);
    expect(travellerHook.current.shouldShowSafety).toBe(false);
  });

  it('respects legacy agreement key for existing senders', async () => {
    await AsyncStorage.setItem('CARRYGO_SAFETY_AGREED_user-legacy', 'true');

    const { result } = renderHook(() =>
      useSafetyAgreement('user-legacy', 'sender')
    );

    await waitFor(() => {
      expect(result.current.isReady).toBe(true);
    });

    expect(result.current.hasAgreed).toBe(true);
    expect(result.current.shouldShowSafety).toBe(false);
  });
});
