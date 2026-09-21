// @ts-nocheck
// Context-based Alert system exports
export { useAlert } from './hook';
export { AlertProvider, detectAlertType } from './context';

// Export types
export type {
  AlertButton,
  AlertState,
  AlertType,
  AlertOptions,
} from './types';