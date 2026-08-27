import React from 'react';
import Svg, { Path, Circle, Rect, Line, Ellipse } from 'react-native-svg';

type IllustrationProps = {
  size?: number;
  color?: string;
  active?: boolean;
};

export function DocumentsIllustration({ size = 40, color = '#8B5CF6', active }: IllustrationProps) {
  const o = active ? 1 : 0.7;
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <Rect x="20" y="14" width="28" height="38" rx="3" fill={color} opacity={o * 0.12} stroke={color} strokeWidth="1.8" strokeOpacity={o * 0.5} />
      <Rect x="16" y="10" width="28" height="38" rx="3" fill={color} opacity={o * 0.15} stroke={color} strokeWidth="2.5" strokeOpacity={o} />
      <Rect x="21" y="17" width="16" height="3" rx="1.5" fill={color} opacity={o * 0.7} />
      <Rect x="21" y="24" width="20" height="2.5" rx="1.25" fill={color} opacity={o * 0.4} />
      <Rect x="21" y="30" width="18" height="2.5" rx="1.25" fill={color} opacity={o * 0.35} />
      <Rect x="21" y="36" width="20" height="2.5" rx="1.25" fill={color} opacity={o * 0.4} />
      <Rect x="21" y="42" width="12" height="2.5" rx="1.25" fill={color} opacity={o * 0.3} />
      <Circle cx="44" cy="14" r="8" fill={color} opacity={o * 0.2} stroke={color} strokeWidth="2.2" strokeOpacity={o * 0.8} />
      <Path d="M40.5 14L43 16.5L47.5 11.5" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity={o} />
    </Svg>
  );
}

export function ElectronicsIllustration({ size = 40, color = '#06B6D4', active }: IllustrationProps) {
  const o = active ? 1 : 0.7;
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <Rect x="10" y="14" width="44" height="30" rx="3" fill={color} opacity={o * 0.12} stroke={color} strokeWidth="2.5" strokeOpacity={o} />
      <Rect x="14" y="18" width="36" height="22" rx="2" fill={color} opacity={o * 0.08} stroke={color} strokeWidth="1.5" strokeOpacity={o * 0.5} />
      <Circle cx="32" cy="27" r="6" fill={color} opacity={o * 0.2} stroke={color} strokeWidth="1.8" strokeOpacity={o * 0.6} />
      <Path d="M30 25L32 29L34 25" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity={o * 0.7} />
      <Line x1="24" y1="44" x2="40" y2="44" stroke={color} strokeWidth="3" strokeLinecap="round" opacity={o * 0.7} />
      <Rect x="22" y="44" width="20" height="8" rx="3" fill={color} opacity={o * 0.12} stroke={color} strokeWidth="1.8" strokeOpacity={o * 0.5} />
      <Rect x="28" y="49" width="8" height="2.5" rx="1.25" fill={color} opacity={o * 0.4} />
    </Svg>
  );
}

export function ClothingIllustration({ size = 40, color = '#F59E0B', active }: IllustrationProps) {
  const o = active ? 1 : 0.7;
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <Path
        d="M24 10L16 18L20 22V54H44V22L48 18L40 10C40 10 38 15 32 15C26 15 24 10 24 10Z"
        fill={color}
        opacity={o * 0.15}
        stroke={color}
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        strokeOpacity={o}
      />
      <Path d="M24 10C24 10 27 16 32 16C37 16 40 10 40 10" stroke={color} strokeWidth="2.2" strokeLinecap="round" opacity={o * 0.8} />
      <Path d="M16 18L12 22L16 25" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity={o * 0.6} />
      <Path d="M48 18L52 22L48 25" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity={o * 0.6} />
      <Line x1="32" y1="18" x2="32" y2="38" stroke={color} strokeWidth="1.5" opacity={o * 0.3} strokeDasharray="3 2.5" />
      <Circle cx="32" cy="8" r="3" fill={color} opacity={o * 0.5} />
      <Rect x="26" y="40" width="12" height="8" rx="2" fill={color} opacity={o * 0.2} stroke={color} strokeWidth="1.5" strokeOpacity={o * 0.4} />
      <Line x1="29" y1="43.5" x2="35" y2="43.5" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity={o * 0.5} />
    </Svg>
  );
}

export function FoodIllustration({ size = 40, color = '#22C55E', active }: IllustrationProps) {
  const o = active ? 1 : 0.7;
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <Ellipse cx="32" cy="42" rx="20" ry="10" fill={color} opacity={o * 0.12} stroke={color} strokeWidth="2.5" strokeOpacity={o} />
      <Path
        d="M12 42C12 42 14 32 32 32C50 32 52 42 52 42"
        stroke={color}
        strokeWidth="2.8"
        strokeLinecap="round"
        opacity={o}
      />
      <Path d="M12 42C12 42 14 32 32 32C50 32 52 42 52 42" fill={color} opacity={o * 0.15} />
      <Rect x="12" y="41" width="40" height="4" rx="2" fill={color} opacity={o * 0.25} />
      <Rect x="26" y="50" width="12" height="5" rx="2.5" fill={color} opacity={o * 0.3} stroke={color} strokeWidth="1.5" strokeOpacity={o * 0.5} />
      <Path d="M22 30C22 26 24 22 26 18" stroke={color} strokeWidth="2.2" strokeLinecap="round" opacity={o * 0.5} />
      <Path d="M32 28C32 24 33 20 34 16" stroke={color} strokeWidth="2.2" strokeLinecap="round" opacity={o * 0.45} />
      <Path d="M42 30C42 26 40 22 38 18" stroke={color} strokeWidth="2.2" strokeLinecap="round" opacity={o * 0.5} />
      <Circle cx="26" cy="15" r="3" fill={color} opacity={o * 0.35} />
      <Circle cx="34" cy="13" r="2.5" fill={color} opacity={o * 0.3} />
      <Circle cx="38" cy="16" r="2" fill={color} opacity={o * 0.25} />
    </Svg>
  );
}

export function MedicineIllustration({ size = 40, color = '#EF4444', active }: IllustrationProps) {
  const o = active ? 1 : 0.7;
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <Rect x="18" y="20" width="28" height="34" rx="6" fill={color} opacity={o * 0.12} stroke={color} strokeWidth="2.5" strokeOpacity={o} />
      <Rect x="22" y="12" width="20" height="10" rx="4" fill={color} opacity={o * 0.18} stroke={color} strokeWidth="2.2" strokeOpacity={o * 0.85} />
      <Rect x="28" y="8" width="8" height="5" rx="2.5" fill={color} opacity={o * 0.3} stroke={color} strokeWidth="1.8" strokeOpacity={o * 0.6} />
      <Rect x="29" y="27" width="6" height="20" rx="3" fill={color} opacity={o * 0.5} />
      <Rect x="24" y="34" width="16" height="6" rx="3" fill={color} opacity={o * 0.5} />
      <Circle cx="48" cy="16" r="6" fill={color} opacity={o * 0.18} stroke={color} strokeWidth="2" strokeOpacity={o * 0.7} />
      <Line x1="45.5" y1="16" x2="50.5" y2="16" stroke={color} strokeWidth="2.2" strokeLinecap="round" opacity={o * 0.85} />
      <Line x1="48" y1="13.5" x2="48" y2="18.5" stroke={color} strokeWidth="2.2" strokeLinecap="round" opacity={o * 0.85} />
    </Svg>
  );
}

export function OtherIllustration({ size = 40, color = '#4F8EF7', active }: IllustrationProps) {
  const o = active ? 1 : 0.7;
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <Path
        d="M14 26L32 14L50 26V44L32 56L14 44V26Z"
        fill={color}
        opacity={o * 0.12}
        stroke={color}
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeOpacity={o}
      />
      <Path d="M32 14V36" stroke={color} strokeWidth="1.8" opacity={o * 0.5} />
      <Path d="M14 26L32 36L50 26" stroke={color} strokeWidth="1.8" opacity={o * 0.4} />
      <Path d="M32 36V56" stroke={color} strokeWidth="1.8" opacity={o * 0.5} />
      <Path d="M14 26L32 14L50 26" fill={color} opacity={o * 0.1} />
      <Circle cx="32" cy="36" r="5" fill={color} opacity={o * 0.3} stroke={color} strokeWidth="1.8" strokeOpacity={o * 0.5} />
      <Circle cx="32" cy="36" r="2" fill={color} opacity={o * 0.7} />
    </Svg>
  );
}
