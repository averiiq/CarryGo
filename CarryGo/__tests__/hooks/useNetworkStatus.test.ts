import { renderHook, act } from '@testing-library/react-native';
import NetInfo from '@react-native-community/netinfo';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

jest.mock('@react-native-community/netinfo', () => {
  let currentListener: ((state: any) => void) | null = null;
  return {
    addEventListener: jest.fn((fn) => {
      currentListener = fn;
      return jest.fn(() => {
        currentListener = null;
      });
    }),
    __trigger: (state: any) => {
      if (currentListener) currentListener(state);
    },
  };
});

describe('useNetworkStatus Singleton Hook', () => {
  it('returns default online status', () => {
    const { result } = renderHook(() => useNetworkStatus());
    expect(result.current.isOnline).toBe(true);
  });

  it('updates online status when netinfo emits changes', () => {
    const { result } = renderHook(() => useNetworkStatus());

    act(() => {
      (NetInfo as any).__trigger({ isConnected: false, isInternetReachable: false });
    });

    expect(result.current.isOnline).toBe(false);

    act(() => {
      (NetInfo as any).__trigger({ isConnected: true, isInternetReachable: true });
    });

    expect(result.current.isOnline).toBe(true);
  });
});
