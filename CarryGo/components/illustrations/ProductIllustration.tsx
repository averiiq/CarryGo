import React from 'react';
import { StyleSheet, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Svg, { Circle, Path } from 'react-native-svg';
import { useThemeColors } from '@/hooks/useThemeColors';

export type ProductIllustrationVariant =
  | 'route'
  | 'parcel'
  | 'chat'
  | 'requests'
  | 'profile'
  | 'delivery'
  | 'payment';

const META: Record<ProductIllustrationVariant, {
  icon: keyof typeof MaterialIcons.glyphMap;
  secondaryIcon: keyof typeof MaterialIcons.glyphMap;
}> = {
  route: { icon: 'route', secondaryIcon: 'location-on' },
  parcel: { icon: 'inventory-2', secondaryIcon: 'verified-user' },
  chat: { icon: 'forum', secondaryIcon: 'check' },
  requests: { icon: 'swap-horiz', secondaryIcon: 'schedule' },
  profile: { icon: 'person', secondaryIcon: 'verified' },
  delivery: { icon: 'local-shipping', secondaryIcon: 'near-me' },
  payment: { icon: 'account-balance-wallet', secondaryIcon: 'lock' },
};

export function ProductIllustration({
  variant,
  size = 148,
}: {
  variant: ProductIllustrationVariant;
  size?: number;
}) {
  const { C } = useThemeColors();
  const meta = META[variant];

  return (
    <View style={[styles.frame, { width: size, height: size * 0.76 }]} accessible={false}>
      <Svg width="100%" height="100%" viewBox="0 0 180 136" fill="none" style={StyleSheet.absoluteFillObject}>
        <Path d="M18 104C42 72 55 111 79 76C102 43 116 70 160 28" stroke={C.primary} strokeWidth="3" strokeLinecap="round" strokeDasharray="7 8" opacity="0.34" />
        <Circle cx="18" cy="104" r="7" fill={C.surface} stroke={C.primary} strokeWidth="3" />
        <Circle cx="160" cy="28" r="7" fill={C.primary} />
        <Circle cx="126" cy="109" r="18" fill={C.primarySubtle} />
        <Circle cx="40" cy="30" r="11" fill={C.accentSubtle} />
      </Svg>

      <View style={[styles.mainOrb, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
        <View style={[styles.iconTile, { backgroundColor: C.primarySubtle }]}>
          <MaterialIcons name={meta.icon} size={size * 0.23} color={C.primaryDark} />
        </View>
      </View>

      <View style={[styles.miniOrb, styles.miniOrbTop, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
        <MaterialIcons name={meta.secondaryIcon} size={size * 0.105} color={C.primary} />
      </View>
      <View style={[styles.miniOrb, styles.miniOrbBottom, { backgroundColor: C.primaryDark, borderColor: C.surface }]}>
        <MaterialIcons name="arrow-forward" size={size * 0.1} color={C.textInverse} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  mainOrb: {
    width: '48%',
    aspectRatio: 1,
    borderRadius: 28,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#173A2A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 4,
  },
  iconTile: {
    width: '72%',
    aspectRatio: 1,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniOrb: {
    position: 'absolute',
    width: '22%',
    aspectRatio: 1,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#173A2A',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  miniOrbTop: { right: '12%', top: '7%' },
  miniOrbBottom: { left: '12%', bottom: '4%' },
});
