import { renderHook, act } from '@testing-library/react-native';
import { useDebounce, useDebouncedCallback } from '@/hooks/useDebounce';
import { useThrottle, useThrottledCallback } from '@/hooks/useThrottle';

describe('useDebounce and useThrottle UX Hooks', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('useDebounce', () => {
    it('returns initial value immediately and debounces changes', () => {
      const { result, rerender } = renderHook(({ val }) => useDebounce(val, 200), {
        initialProps: { val: 'initial' },
      });

      expect(result.current).toBe('initial');

      rerender({ val: 'updated' });
      expect(result.current).toBe('initial');

      act(() => {
        jest.advanceTimersByTime(199);
      });
      expect(result.current).toBe('initial');

      act(() => {
        jest.advanceTimersByTime(2);
      });
      expect(result.current).toBe('updated');
    });

    it('debounces callbacks properly', () => {
      const callback = jest.fn();
      const { result } = renderHook(() => useDebouncedCallback(callback, 150));

      act(() => {
        result.current('call1');
        result.current('call2');
        result.current('call3');
      });

      expect(callback).not.toHaveBeenCalled();

      act(() => {
        jest.advanceTimersByTime(160);
      });

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith('call3');
    });
  });

  describe('useThrottle', () => {
    it('throttles callbacks to prevent rapid multi-clicks', () => {
      const fn = jest.fn();
      const { result } = renderHook(() => useThrottledCallback(fn, 300));

      act(() => {
        result.current('first');
        result.current('second');
        result.current('third');
      });

      expect(fn).toHaveBeenCalledTimes(1);
      expect(fn).toHaveBeenCalledWith('first');

      act(() => {
        jest.advanceTimersByTime(310);
      });

      expect(fn).toHaveBeenCalledTimes(2);
      expect(fn).toHaveBeenCalledWith('third');
    });
  });
});
