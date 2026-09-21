import React, { createContext, useContext, useState, useRef, useEffect, ReactNode } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AlertButton, AlertState, AlertType, AlertOptions } from './types';
import { LightColors, DarkColors } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Haptic } from '@/services/haptics.service';

// Context type definition
export interface AlertContextType {
  showAlert: (
    title: string,
    message?: string,
    buttons?: AlertButton[],
    options?: AlertOptions
  ) => void;
}

// Create Context
const AlertContext = createContext<AlertContextType | undefined>(undefined);

// Safe hook to get theme colors without throwing if outside ThemeProvider
function useSafeTheme() {
  try {
    const theme = useThemeColors();
    return {
      C: theme.C,
      isDark: theme.isDark,
    };
  } catch {
    return {
      C: LightColors,
      isDark: false,
    };
  }
}

import { detectAlertType } from './utils';
export { detectAlertType };

interface AlertProviderProps {
  children: ReactNode;
}

export function AlertProvider({ children }: AlertProviderProps) {
  const [alertState, setAlertState] = useState<AlertState>({
    visible: false,
    title: '',
    message: '',
    buttons: [],
    type: 'info',
    cancelable: false,
  });

  const showAlert = (
    title: string,
    message?: string,
    buttons?: AlertButton[],
    options?: AlertOptions
  ) => {
    const normalizedMessage = message || '';
    const normalizedButtons: AlertButton[] = buttons?.length
      ? buttons
      : [{ text: 'OK', style: 'default' }];

    const resolvedType = detectAlertType(
      title,
      normalizedMessage,
      normalizedButtons,
      options?.type
    );

    // Trigger semantic haptic feedback on alert popup
    switch (resolvedType) {
      case 'success':
        Haptic.success();
        break;
      case 'destructive':
        Haptic.warning();
        break;
      case 'error':
        Haptic.error();
        break;
      case 'warning':
        Haptic.warning();
        break;
      case 'info':
      default:
        Haptic.tap();
        break;
    }

    setAlertState({
      visible: true,
      title,
      message: normalizedMessage,
      buttons: normalizedButtons,
      type: resolvedType,
      cancelable: options?.cancelable ?? false,
    });
  };

  const hideAlert = () => {
    setAlertState(prev => ({ ...prev, visible: false }));
  };

  return (
    <AlertContext.Provider value={{ showAlert }}>
      {children}
      <AestheticAlertModal
        alertState={alertState}
        onHide={hideAlert}
      />
    </AlertContext.Provider>
  );
}

// useAlertContext Hook - internal use
export function useAlertContext(): AlertContextType {
  const context = useContext(AlertContext);
  if (context === undefined) {
    throw new Error('useAlertContext must be used within an AlertProvider');
  }
  return context;
}

interface AestheticAlertModalProps {
  alertState: AlertState;
  onHide: () => void;
}

function AestheticAlertModal({ alertState, onHide }: AestheticAlertModalProps) {
  const { C, isDark } = useSafeTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.88)).current;
  const [isRendering, setIsRendering] = useState(false);

  useEffect(() => {
    if (alertState.visible) {
      setIsRendering(true);
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.88);

      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 240,
          friction: 18,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      setIsRendering(false);
    }
  }, [alertState.visible, fadeAnim, scaleAnim]);

  if (!alertState.visible && !isRendering) {
    return null;
  }

  const handleDismissWithAnimation = (callback?: () => void) => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 140,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.92,
        duration: 140,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onHide();
      if (typeof callback === 'function') {
        callback();
      }
    });
  };

  const handleButtonPress = (button: AlertButton) => {
    if (button.style === 'destructive') {
      Haptic.warning();
    } else if (button.style === 'cancel') {
      Haptic.tap();
    } else {
      Haptic.confirm();
    }

    handleDismissWithAnimation(button.onPress);
  };

  // Get icon and color scheme based on alert type
  const getBadgeConfig = () => {
    switch (alertState.type) {
      case 'success':
        return {
          iconName: 'checkmark-circle' as const,
          iconColor: C.success,
          badgeBg: C.successSubtle,
          borderColor: C.successBorder,
        };
      case 'destructive':
        return {
          iconName: 'trash-outline' as const,
          iconColor: C.error,
          badgeBg: C.errorSubtle,
          borderColor: C.errorBorder,
        };
      case 'error':
        return {
          iconName: 'close-circle' as const,
          iconColor: C.error,
          badgeBg: C.errorSubtle,
          borderColor: C.errorBorder,
        };
      case 'warning':
        return {
          iconName: 'alert-circle' as const,
          iconColor: C.warning,
          badgeBg: C.warningSubtle,
          borderColor: C.warningBorder,
        };
      case 'info':
      default:
        return {
          iconName: 'information-circle' as const,
          iconColor: C.primary,
          badgeBg: C.primarySubtle,
          borderColor: C.primaryBorder,
        };
    }
  };

  const badgeConfig = getBadgeConfig();
  const buttons = alertState.buttons;
  const isTwoButtons = buttons.length === 2;

  return (
    <Modal
      visible={alertState.visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={() => {
        if (alertState.cancelable) {
          handleDismissWithAnimation();
        }
      }}
    >
      <View style={styles.overlayWrapper}>
        {/* Animated Dim Backdrop */}
        <Animated.View
          style={[
            styles.backdrop,
            {
              backgroundColor: isDark ? 'rgba(0, 0, 0, 0.75)' : 'rgba(15, 23, 42, 0.50)',
              opacity: fadeAnim,
            },
          ]}
        >
          {alertState.cancelable ? (
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => handleDismissWithAnimation()}
              accessibilityLabel="Dismiss alert"
            />
          ) : null}
        </Animated.View>

        {/* Animated Alert Card */}
        <Animated.View
          style={[
            styles.cardContainer,
            {
              backgroundColor: C.card,
              borderColor: C.surfaceBorder,
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
              // Thematic multi-layer shadow
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 16 },
              shadowOpacity: isDark ? 0.45 : 0.12,
              shadowRadius: 28,
              elevation: 20,
            },
          ]}
        >
          {/* Centered Semantic Icon Squircle */}
          <View
            style={[
              styles.iconBadge,
              {
                backgroundColor: badgeConfig.badgeBg,
                borderColor: badgeConfig.borderColor,
              },
            ]}
          >
            <Ionicons
              name={badgeConfig.iconName}
              size={28}
              color={badgeConfig.iconColor}
            />
          </View>

          {/* Title & Message */}
          <View style={styles.textContainer}>
            <Text style={[styles.title, { color: C.textPrimary }]}>
              {alertState.title}
            </Text>
            {alertState.message ? (
              <Text style={[styles.message, { color: C.textSecondary }]}>
                {alertState.message}
              </Text>
            ) : null}
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonSection}>
            {buttons.length === 1 ? (
              // Single button layout (Full width)
              <AlertButtonComponent
                button={buttons[0]}
                isPrimary={true}
                alertType={alertState.type}
                C={C}
                onPress={() => handleButtonPress(buttons[0])}
              />
            ) : isTwoButtons ? (
              // Two buttons layout (Side-by-side)
              <View style={styles.rowButtons}>
                <AlertButtonComponent
                  button={buttons[0]}
                  isPrimary={buttons[0].style !== 'cancel'}
                  alertType={alertState.type}
                  C={C}
                  style={styles.flexButton}
                  onPress={() => handleButtonPress(buttons[0])}
                />
                <AlertButtonComponent
                  button={buttons[1]}
                  isPrimary={buttons[1].style !== 'cancel'}
                  alertType={alertState.type}
                  C={C}
                  style={styles.flexButton}
                  onPress={() => handleButtonPress(buttons[1])}
                />
              </View>
            ) : (
              // 3+ buttons layout (Vertical stack)
              <View style={styles.stackedButtons}>
                {buttons.map((btn, idx) => (
                  <AlertButtonComponent
                    key={idx}
                    button={btn}
                    isPrimary={btn.style !== 'cancel'}
                    alertType={alertState.type}
                    C={C}
                    onPress={() => handleButtonPress(btn)}
                  />
                ))}
              </View>
            )}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

interface AlertButtonComponentProps {
  button: AlertButton;
  isPrimary: boolean;
  alertType?: string;
  C: typeof LightColors;
  style?: any;
  onPress: () => void;
}

function AlertButtonComponent({
  button,
  isPrimary,
  alertType,
  C,
  style,
  onPress,
}: AlertButtonComponentProps) {
  const isDestructive = button.style === 'destructive' || (isPrimary && alertType === 'destructive');
  const isCancel = button.style === 'cancel';

  let backgroundColor = C.primary;
  let textColor = '#FFFFFF';
  let borderColor = 'transparent';
  let borderWidth = 0;

  if (isDestructive) {
    backgroundColor = C.error;
    textColor = '#FFFFFF';
  } else if (isCancel) {
    backgroundColor = C.surfaceElevated;
    textColor = C.textPrimary;
    borderColor = C.surfaceBorder;
    borderWidth = 1;
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={button.text}
      style={({ pressed }) => [
        styles.actionButton,
        {
          backgroundColor,
          borderColor,
          borderWidth,
          transform: [{ scale: pressed ? 0.97 : 1 }],
          opacity: pressed ? 0.9 : 1,
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.actionButtonText,
          {
            color: textColor,
            fontWeight: isPrimary ? '600' : '500',
          },
        ]}
      >
        {button.text}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlayWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  cardContainer: {
    width: '100%',
    maxWidth: 350,
    borderRadius: 24,
    borderWidth: 1,
    paddingTop: 28,
    paddingBottom: 22,
    paddingHorizontal: 22,
    alignItems: 'center',
  },
  iconBadge: {
    width: 56,
    height: 56,
    borderRadius: 18,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  textContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 22,
  },
  title: {
    fontSize: 19,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  message: {
    fontSize: 14.5,
    textAlign: 'center',
    lineHeight: 21,
    paddingHorizontal: 4,
  },
  buttonSection: {
    width: '100%',
  },
  rowButtons: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  flexButton: {
    flex: 1,
  },
  stackedButtons: {
    flexDirection: 'column',
    gap: 10,
    width: '100%',
  },
  actionButton: {
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    width: '100%',
  },
  actionButtonText: {
    fontSize: 15,
    letterSpacing: -0.2,
  },
});