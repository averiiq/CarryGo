import React from 'react';
import { View, StyleProp, ViewStyle } from 'react-native';
import { useResponsive } from '@/hooks/useResponsive';

interface ResponsiveContainerProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  maxWidth?: number;
}

export function ResponsiveContainer({
  children,
  style,
  maxWidth = 620,
}: ResponsiveContainerProps) {
  const { isTablet } = useResponsive();
  return (
    <View
      style={[
        isTablet && {
          maxWidth,
          width: '100%',
          alignSelf: 'center',
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

