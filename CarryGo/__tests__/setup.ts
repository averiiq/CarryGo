jest.mock('react-native', () => ({
  Platform: { OS: 'ios', select: (obj: any) => obj?.ios ?? obj?.default },
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
  return React.forwardRef((props: any, ref: any) => {
    return React.createElement(View, { ...props, ref, testID: props.testID || 'lottie-animation' });
  });
});
