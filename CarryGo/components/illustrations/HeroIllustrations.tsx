import React from 'react';
import Svg, { Path, Circle, Rect, Ellipse, Line, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';

type HeroProps = {
  size?: number;
};

export function SendParcelHero({ size = 80 }: HeroProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120" fill="none">
      <Defs>
        <SvgGradient id="parcelBoxGrad" x1="0" y1="0" x2="0.8" y2="1">
          <Stop offset="0" stopColor="#ffffff" stopOpacity="0.5" />
          <Stop offset="1" stopColor="#ffffff" stopOpacity="0.15" />
        </SvgGradient>
      </Defs>

      <Ellipse cx="55" cy="100" rx="28" ry="5" fill="rgba(255,255,255,0.12)" />

      <Path
        d="M28 52L55 36L82 52V88L55 104L28 88V52Z"
        fill="url(#parcelBoxGrad)"
        stroke="rgba(255,255,255,0.75)"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <Path d="M28 52L55 68L82 52" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinejoin="round" />
      <Path d="M55 68V104" stroke="rgba(255,255,255,0.5)" strokeWidth="2" />
      <Path d="M28 52L55 36L82 52" fill="rgba(255,255,255,0.15)" />
      <Path d="M28 52L55 68V104L28 88V52Z" fill="rgba(255,255,255,0.08)" />

      <Path d="M42 44L55 36L68 44" stroke="rgba(255,255,255,0.85)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

      <Rect x="44" y="58" width="22" height="16" rx="2.5" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.55)" strokeWidth="1.8" />
      <Line x1="48" y1="63" x2="62" y2="63" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round" />
      <Line x1="48" y1="67.5" x2="58" y2="67.5" stroke="rgba(255,255,255,0.4)" strokeWidth="2" strokeLinecap="round" />
      <Line x1="48" y1="72" x2="55" y2="72" stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeLinecap="round" />

      <Circle cx="90" cy="28" r="14" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.7)" strokeWidth="2.5" />
      <Path d="M84 28L88 32L96 24" stroke="rgba(255,255,255,0.95)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

      <Path d="M96 52L104 48" stroke="rgba(255,255,255,0.35)" strokeWidth="2" strokeLinecap="round" strokeDasharray="3 3" />
      <Path d="M104 48L108 56" stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeLinecap="round" strokeDasharray="3 3" />
      <Circle cx="108" cy="58" r="3" fill="rgba(255,255,255,0.3)" />

      <Circle cx="38" cy="26" r="2.5" fill="rgba(255,255,255,0.3)" />
      <Circle cx="100" cy="80" r="2" fill="rgba(255,255,255,0.2)" />
      <Circle cx="20" cy="46" r="2" fill="rgba(255,255,255,0.2)" />
    </Svg>
  );
}

export function PostTripHero({ size = 80, color = '#71717A' }: HeroProps & { color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120" fill="none">
      <Ellipse cx="60" cy="100" rx="32" ry="4" fill={color} opacity={0.15} />

      <Path
        d="M30 70C30 66 33 63 37 63H83C87 63 90 66 90 70V82C90 86 87 89 83 89H37C33 89 30 86 30 82V70Z"
        fill={color}
        opacity={0.18}
        stroke={color}
        strokeWidth="2.5"
        strokeOpacity={0.75}
      />
      <Path d="M30 76H90" stroke={color} strokeWidth="1.5" opacity={0.25} />

      <Path
        d="M40 63L45 44C45.8 41 48 39 51 39H69C72 39 74.2 41 75 44L80 63"
        stroke={color}
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.9}
      />
      <Path
        d="M45 44C45.8 41 48 39 51 39H69C72 39 74.2 41 75 44L80 63H40L45 44Z"
        fill={color}
        opacity={0.1}
      />

      <Rect x="46" y="44" width="11" height="9" rx="2" stroke={color} strokeWidth="1.8" opacity={0.6} fill={color} fillOpacity={0.08} />
      <Rect x="63" y="44" width="11" height="9" rx="2" stroke={color} strokeWidth="1.8" opacity={0.6} fill={color} fillOpacity={0.08} />

      <Circle cx="40" cy="93" r="7" stroke={color} strokeWidth="2.8" opacity={0.8} />
      <Circle cx="80" cy="93" r="7" stroke={color} strokeWidth="2.8" opacity={0.8} />
      <Circle cx="40" cy="93" r="3" fill={color} opacity={0.35} />
      <Circle cx="80" cy="93" r="3" fill={color} opacity={0.35} />
      <Circle cx="40" cy="93" r="1.2" fill={color} opacity={0.7} />
      <Circle cx="80" cy="93" r="1.2" fill={color} opacity={0.7} />

      <Rect x="34" y="71" width="8" height="4" rx="2" fill={color} opacity={0.55} />
      <Rect x="78" y="71" width="8" height="4" rx="2" fill={color} opacity={0.55} />

      <Path d="M22 52L14 48L22 44" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity={0.45} />
      <Path d="M14 48H36" stroke={color} strokeWidth="2" strokeLinecap="round" strokeDasharray="4 3.5" opacity={0.35} />

      <Path d="M98 52L106 48L98 44" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity={0.45} />
      <Path d="M106 48H84" stroke={color} strokeWidth="2" strokeLinecap="round" strokeDasharray="4 3.5" opacity={0.35} />

      <Circle cx="60" cy="26" r="12" fill={color} opacity={0.15} stroke={color} strokeWidth="2.5" strokeOpacity={0.65} />
      <Path d="M55 26L60 21L65 26L60 31Z" fill={color} opacity={0.55} />
      <Circle cx="60" cy="26" r="3" stroke={color} strokeWidth="1.5" opacity={0.4} />

      <Circle cx="28" cy="32" r="3" fill={color} opacity={0.3} />
      <Circle cx="92" cy="34" r="2.5" fill={color} opacity={0.25} />
    </Svg>
  );
}
