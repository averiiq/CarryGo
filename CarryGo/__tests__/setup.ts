jest.mock('react-native', () => ({
  Platform: { OS: 'ios', select: (obj: any) => obj?.ios ?? obj?.default },
  StyleSheet: { create: (s: any) => s, flatten: (s: any) => s },
  Dimensions: { get: () => ({ width: 390, height: 844 }) },
  useWindowDimensions: () => ({ width: 390, height: 844, scale: 2, fontScale: 1 }),
}));

jest.mock('expo-file-system', () => ({
  readAsStringAsync: jest.fn(),
  deleteAsync: jest.fn(),
  uploadAsync: jest.fn(),
  EncodingType: { Base64: 'base64' },
  FileSystemUploadType: { MULTIPART: 'multipart' },
}));

jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: jest.fn(),
  SaveFormat: {
    JPEG: 'jpeg',
    PNG: 'png',
  },
}));

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    expoConfig: {
      version: '1.2.2',
    },
  },
}));

jest.mock('expo-application', () => ({
  nativeApplicationVersion: '1.2.2',
  nativeBuildVersion: '1',
  applicationId: 'com.carrygo.app',
}));

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
  getPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  getExpoPushTokenAsync: jest.fn().mockResolvedValue({ data: 'ExponentPushToken[mock]' }),
  scheduleNotificationAsync: jest.fn().mockResolvedValue('notif-id'),
  addNotificationReceivedListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
  addNotificationResponseReceivedListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
  AndroidImportance: {
    MAX: 5,
    HIGH: 4,
    DEFAULT: 3,
  },
}));

(global as Record<string, unknown>).__DEV__ = true;

jest.mock('lottie-react-native', () => {
  const React = require('react');
  const { View } = require('react-native');
  const MockLottie = React.forwardRef((props: any, ref: any) => {
    return React.createElement(View, { ...props, ref, testID: props.testID || 'lottie-animation' });
  });
  return {
    __esModule: true,
    default: MockLottie,
    LottieView: MockLottie,
  };
});

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: 'LinearGradient',
}));

jest.mock('expo-updates', () => ({
  isEnabled: true,
  isEmbeddedLaunch: true,
  updateId: 'mock-update-id',
  channel: 'preview',
  runtimeVersion: '1.0.0',
  createdAt: new Date(),
  checkForUpdateAsync: jest.fn().mockResolvedValue({ isAvailable: false }),
  fetchUpdateAsync: jest.fn().mockResolvedValue({ isNew: false }),
  reloadAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@expo/vector-icons', () => ({
  MaterialIcons: 'MaterialIcons',
  Ionicons: 'Ionicons',
  FontAwesome: 'FontAwesome',
}));

jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(),
  notificationAsync: jest.fn(),
  impactAsync: jest.fn(),
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
  useSafeAreaFrame: () => ({ x: 0, y: 0, width: 390, height: 844 }),
  SafeAreaProvider: ({ children }: any) => children,
  SafeAreaView: ({ children }: any) => children,
}));

jest.mock('react-native-gesture-handler', () => {
  const React = require('react');
  const View = require('react-native').View;
  return {
    GestureDetector: ({ children }: any) => children,
    Gesture: {
      Pan: () => ({
        onUpdate: () => ({ onEnd: () => ({}) }),
      }),
    },
    GestureHandlerRootView: View,
  };
});

jest.mock('react-native-svg', () => {
  const React = require('react');
  const { View } = require('react-native');
  const MockComponent = (props: any) => React.createElement(View, props);
  return {
    __esModule: true,
    default: MockComponent,
    Svg: MockComponent,
    Circle: MockComponent,
    Ellipse: MockComponent,
    G: MockComponent,
    Text: MockComponent,
    TSpan: MockComponent,
    TextPath: MockComponent,
    Path: MockComponent,
    Polygon: MockComponent,
    Polyline: MockComponent,
    Line: MockComponent,
    Rect: MockComponent,
    Use: MockComponent,
    Image: MockComponent,
    Symbol: MockComponent,
    Defs: MockComponent,
    LinearGradient: MockComponent,
    RadialGradient: MockComponent,
    Stop: MockComponent,
    ClipPath: MockComponent,
    Pattern: MockComponent,
    Mask: MockComponent,
  };
});

jest.mock('react-native-reanimated', () => {
  try {
    return require('react-native-reanimated/mock');
  } catch {
    return {};
  }
});
jest.mock('expo-image', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    Image: (props: any) => React.createElement(View, props),
    default: (props: any) => React.createElement(View, props),
  };
});
