/**
 * Haptics & Sound utility for CarryGo
 * Provides unified haptic feedback and lightweight sound effects
 */
import * as Haptics from 'expo-haptics';

export type HapticStyle = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | 'selection';

export async function triggerHaptic(style: HapticStyle = 'light'): Promise<void> {
  try {
    switch (style) {
      case 'light':
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        break;
      case 'medium':
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        break;
      case 'heavy':
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        break;
      case 'success':
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;
      case 'warning':
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        break;
      case 'error':
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        break;
      case 'selection':
        await Haptics.selectionAsync();
        break;
    }
  } catch {
    // Haptics not available on all platforms/simulators
  }
}

// Common haptic patterns
export const Haptic = {
  tap: () => triggerHaptic('light'),
  select: () => triggerHaptic('selection'),
  confirm: () => triggerHaptic('medium'),
  success: () => triggerHaptic('success'),
  error: () => triggerHaptic('error'),
  warning: () => triggerHaptic('warning'),
  heavy: () => triggerHaptic('heavy'),
};
