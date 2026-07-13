/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@supabase/.*|@tanstack/.*)',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  setupFiles: ['<rootDir>/__tests__/setup.ts'],
  testMatch: ['<rootDir>/__tests__/**/*.test.ts', '<rootDir>/__tests__/**/*.test.tsx'],
  collectCoverageFrom: [
    'lib/**/*.ts',
    'services/**/*.ts',
    'hooks/**/*.ts',
    '!**/*.d.ts',
  ],
};
