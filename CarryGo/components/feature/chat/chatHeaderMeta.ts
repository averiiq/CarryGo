import { MaterialIcons } from '@expo/vector-icons';

export interface ChatHeaderMeta {
  icon: keyof typeof MaterialIcons.glyphMap;
  iconBg: string;
  iconColor: string;
  subtitle: string;
  actionText: string;
  actionRoute: { pathname: string; params?: Record<string, any> };
  isPending: boolean;
}

export function getChatHeaderMeta(
  requestStatus?: string,
  isDeliveryCompleted: boolean = false,
  requestId?: string,
  isDark: boolean = false
): ChatHeaderMeta {
  if (isDeliveryCompleted || requestStatus === 'completed') {
    return {
      icon: 'verified',
      iconBg: isDark ? '#008B4833' : '#E8F8F0',
      iconColor: '#008B48',
      subtitle: 'Delivery completed & verified',
      actionText: 'View',
      actionRoute: {
        pathname: requestId ? '/delivery/[id]' : '/(tabs)/requests',
        params: requestId ? { id: requestId } : undefined,
      },
      isPending: false,
    };
  }

  if (requestStatus === 'pending') {
    return {
      icon: 'schedule',
      iconBg: isDark ? '#D9770633' : '#FEF3C7',
      iconColor: '#D97706',
      subtitle: 'Request pending acceptance • Tap to review',
      actionText: 'Review',
      actionRoute: {
        pathname: '/(tabs)/requests',
      },
      isPending: true,
    };
  }

  return {
    icon: 'local-shipping',
    iconBg: isDark ? '#008B4833' : '#E8F8F0',
    iconColor: '#008B48',
    subtitle: 'Tap to track live parcel progress',
    actionText: 'Track',
    actionRoute: {
      pathname: requestId ? '/delivery/[id]' : '/(tabs)/requests',
      params: requestId ? { id: requestId } : undefined,
    },
    isPending: false,
  };
}
