import React from 'react';
import Svg, { Path, Circle, Rect, Line } from 'react-native-svg';

type IllustrationProps = {
  size?: number;
  color?: string;
  active?: boolean;
};

export function BikeIllustration({ size = 44, color = '#22C55E', active }: IllustrationProps) {
  const o = active ? 1 : 0.7;
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <Circle cx="17" cy="44" r="10" stroke={color} strokeWidth="2.5" opacity={o} />
      <Circle cx="47" cy="44" r="10" stroke={color} strokeWidth="2.5" opacity={o} />
      <Circle cx="17" cy="44" r="3" fill={color} opacity={o * 0.5} />
      <Circle cx="47" cy="44" r="3" fill={color} opacity={o * 0.5} />
      <Path d="M17 44L28 24H38L47 44" stroke={color} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" opacity={o} />
      <Path d="M28 24L32 44H38" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" opacity={o * 0.8} />
      <Rect x="24" y="20" width="12" height="4" rx="2" fill={color} opacity={o * 0.4} />
      <Path d="M30 20V14" stroke={color} strokeWidth="2.2" strokeLinecap="round" opacity={o * 0.7} />
      <Circle cx="30" cy="11" r="3.5" fill={color} opacity={o * 0.25} stroke={color} strokeWidth="1.8" strokeOpacity={o * 0.6} />
    </Svg>
  );
}

export function CarIllustration({ size = 44, color = '#4F8EF7', active }: IllustrationProps) {
  const o = active ? 1 : 0.7;
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <Path
        d="M8 38C8 35 10 33 13 33H51C54 33 56 35 56 38V44C56 46 54 48 51 48H13C10 48 8 46 8 44V38Z"
        fill={color}
        opacity={o * 0.2}
        stroke={color}
        strokeWidth="2.5"
        strokeOpacity={o}
      />
      <Path
        d="M15 33L20 20C20.8 18 22.5 16.5 25 16.5H39C41.5 16.5 43.2 18 44 20L49 33"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={o}
      />
      <Path
        d="M20 20C20.8 18 22.5 16.5 25 16.5H39C41.5 16.5 43.2 18 44 20L49 33H15L20 20Z"
        fill={color}
        opacity={o * 0.12}
      />
      <Rect x="20" y="21" width="10" height="8" rx="2" fill={color} opacity={o * 0.15} stroke={color} strokeWidth="1.5" strokeOpacity={o * 0.6} />
      <Rect x="34" y="21" width="10" height="8" rx="2" fill={color} opacity={o * 0.15} stroke={color} strokeWidth="1.5" strokeOpacity={o * 0.6} />
      <Circle cx="18" cy="50" r="5.5" stroke={color} strokeWidth="2.5" opacity={o} />
      <Circle cx="46" cy="50" r="5.5" stroke={color} strokeWidth="2.5" opacity={o} />
      <Circle cx="18" cy="50" r="2" fill={color} opacity={o * 0.6} />
      <Circle cx="46" cy="50" r="2" fill={color} opacity={o * 0.6} />
      <Rect x="12" y="36" width="7" height="4" rx="2" fill={color} opacity={o * 0.5} />
      <Rect x="45" y="36" width="7" height="4" rx="2" fill={color} opacity={o * 0.5} />
    </Svg>
  );
}

export function BusIllustration({ size = 44, color = '#F59E0B', active }: IllustrationProps) {
  const o = active ? 1 : 0.7;
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <Rect x="14" y="12" width="36" height="42" rx="5" fill={color} opacity={o * 0.15} stroke={color} strokeWidth="2.5" strokeOpacity={o} />
      <Rect x="14" y="12" width="36" height="12" rx="5" fill={color} opacity={o * 0.2} />
      <Path d="M14 24H50" stroke={color} strokeWidth="2" opacity={o * 0.6} />
      <Rect x="18" y="14" width="6" height="7" rx="2" fill={color} opacity={o * 0.5} />
      <Rect x="40" y="14" width="6" height="7" rx="2" fill={color} opacity={o * 0.5} />
      <Rect x="18" y="27" width="12" height="10" rx="2.5" fill={color} opacity={o * 0.15} stroke={color} strokeWidth="1.8" strokeOpacity={o * 0.7} />
      <Rect x="34" y="27" width="12" height="10" rx="2.5" fill={color} opacity={o * 0.15} stroke={color} strokeWidth="1.8" strokeOpacity={o * 0.7} />
      <Path d="M14 40H50" stroke={color} strokeWidth="1.5" opacity={o * 0.4} />
      <Circle cx="22" cy="56" r="4.5" stroke={color} strokeWidth="2.5" opacity={o} />
      <Circle cx="42" cy="56" r="4.5" stroke={color} strokeWidth="2.5" opacity={o} />
      <Circle cx="22" cy="56" r="1.8" fill={color} opacity={o * 0.6} />
      <Circle cx="42" cy="56" r="1.8" fill={color} opacity={o * 0.6} />
      <Rect x="30" y="44" width="4" height="7" rx="2" fill={color} opacity={o * 0.35} />
    </Svg>
  );
}

export function TrainIllustration({ size = 44, color = '#8B5CF6', active }: IllustrationProps) {
  const o = active ? 1 : 0.7;
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <Path
        d="M18 8H46C50 8 52 10 52 14V46C52 50 50 52 46 52H18C14 52 12 50 12 46V14C12 10 14 8 18 8Z"
        fill={color}
        opacity={o * 0.12}
        stroke={color}
        strokeWidth="2.5"
        strokeOpacity={o}
      />
      <Rect x="16" y="12" width="32" height="16" rx="4" fill={color} opacity={o * 0.18} stroke={color} strokeWidth="1.8" strokeOpacity={o * 0.7} />
      <Path d="M32 12V28" stroke={color} strokeWidth="1.5" opacity={o * 0.4} />
      <Path d="M12 32H52" stroke={color} strokeWidth="2" opacity={o * 0.5} />
      <Circle cx="22" cy="40" r="4.5" fill={color} opacity={o * 0.25} stroke={color} strokeWidth="2" strokeOpacity={o * 0.8} />
      <Circle cx="42" cy="40" r="4.5" fill={color} opacity={o * 0.25} stroke={color} strokeWidth="2" strokeOpacity={o * 0.8} />
      <Circle cx="22" cy="40" r="1.8" fill={color} opacity={o * 0.6} />
      <Circle cx="42" cy="40" r="1.8" fill={color} opacity={o * 0.6} />
      <Rect x="29" y="35" width="6" height="10" rx="3" fill={color} opacity={o * 0.3} />
      <Path d="M16 52L12 58" stroke={color} strokeWidth="2.5" strokeLinecap="round" opacity={o * 0.6} />
      <Path d="M48 52L52 58" stroke={color} strokeWidth="2.5" strokeLinecap="round" opacity={o * 0.6} />
      <Line x1="10" y1="58" x2="54" y2="58" stroke={color} strokeWidth="2.5" strokeLinecap="round" opacity={o * 0.5} />
      <Rect x="28" y="4" width="8" height="5" rx="2.5" fill={color} opacity={o * 0.45} />
    </Svg>
  );
}

export function FlightIllustration({ size = 44, color = '#06B6D4', active }: IllustrationProps) {
  const o = active ? 1 : 0.7;
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <Path
        d="M32 6C33.5 6 35 7.5 35 9V20L52 28C53.5 28.7 54 30 54 31V33C54 33.8 53.2 34.3 52.5 34L35 27V42L41 46V48.5C41 49.2 40.3 49.7 39.7 49.5L32 47L24.3 49.5C23.7 49.7 23 49.2 23 48.5V46L29 42V27L11.5 34C10.8 34.3 10 33.8 10 33V31C10 30 10.5 28.7 12 28L29 20V9C29 7.5 30.5 6 32 6Z"
        fill={color}
        opacity={o * 0.2}
        stroke={color}
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        strokeOpacity={o}
      />
      <Path d="M29 9C29 7.5 30.5 6 32 6C33.5 6 35 7.5 35 9V14H29V9Z" fill={color} opacity={o * 0.35} />
      <Circle cx="32" cy="18" r="2.5" fill={color} opacity={o * 0.45} />
      <Line x1="32" y1="22" x2="32" y2="40" stroke={color} strokeWidth="1.5" opacity={o * 0.25} />
    </Svg>
  );
}
