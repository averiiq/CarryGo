jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}));

jest.mock('expo-file-system', () => ({
  readAsStringAsync: jest.fn(),
  deleteAsync: jest.fn(),
  uploadAsync: jest.fn(),
  EncodingType: { Base64: 'base64' },
  FileSystemUploadType: { MULTIPART: 'multipart' },
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

(global as Record<string, unknown>).__DEV__ = true;
