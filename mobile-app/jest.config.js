module.exports = {
  preset: 'jest-expo',
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)',
  ],
  moduleNameMapper: {
    '^expo-linear-gradient$': '<rootDir>/__tests__/mocks/expo-linear-gradient.ts',
    '^expo-blur$': '<rootDir>/__tests__/mocks/expo-blur.ts',
    '^expo-font$': '<rootDir>/__tests__/mocks/expo-font.ts',
    '^expo-print$': '<rootDir>/__tests__/mocks/expo-print.ts',
    '^expo-sharing$': '<rootDir>/__tests__/mocks/expo-sharing.ts',
    '^expo-sensors$': '<rootDir>/__tests__/mocks/expo-sensors.ts',
    '^expo-constants$': '<rootDir>/__tests__/mocks/expo-constants.ts',
    '^@expo/vector-icons$': '<rootDir>/__tests__/mocks/expo-vector-icons.ts',
    '^react-native-svg$': '<rootDir>/__tests__/mocks/react-native-svg.ts',
    '^@react-native-async-storage/async-storage$': '<rootDir>/__tests__/mocks/async-storage.ts',
  },
  testPathIgnorePatterns: ['/node_modules/', '/mocks/'],
  collectCoverage: true,
  coverageDirectory: './coverage',
  collectCoverageFrom: [
    'src/services/**/*.ts',
    'src/store/**/*.ts',
    'src/components/ui/**/*.tsx',
    '!src/services/api.ts', // API service needs network mocks
  ],
}
