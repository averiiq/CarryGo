export type AlertType = 'auto' | 'success' | 'error' | 'warning' | 'info' | 'destructive';

export interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

export interface AlertOptions {
  type?: AlertType;
  cancelable?: boolean;
  onDismiss?: () => void;
}

export interface AlertState {
  visible: boolean;
  title: string;
  message: string;
  buttons: AlertButton[];
  type?: AlertType;
  cancelable?: boolean;
}