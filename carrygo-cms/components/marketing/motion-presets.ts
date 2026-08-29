export type MotionPresetName = 'subtle' | 'balanced' | 'dramatic'

type MotionPresetConfig = {
  parallaxRotate: number
  parallaxStiffness: number
  parallaxDamping: number
  parallaxMass: number
  glowOpacity: number
  scrollIntensity: number
  revealDistance: number
  revealDuration: number
}

export const motionPresets: Record<MotionPresetName, MotionPresetConfig> = {
  subtle: {
    parallaxRotate: 5,
    parallaxStiffness: 130,
    parallaxDamping: 20,
    parallaxMass: 0.26,
    glowOpacity: 0.15,
    scrollIntensity: 16,
    revealDistance: 10,
    revealDuration: 0.42,
  },
  balanced: {
    parallaxRotate: 9,
    parallaxStiffness: 140,
    parallaxDamping: 18,
    parallaxMass: 0.22,
    glowOpacity: 0.22,
    scrollIntensity: 34,
    revealDistance: 16,
    revealDuration: 0.55,
  },
  dramatic: {
    parallaxRotate: 13,
    parallaxStiffness: 150,
    parallaxDamping: 16,
    parallaxMass: 0.2,
    glowOpacity: 0.28,
    scrollIntensity: 50,
    revealDistance: 24,
    revealDuration: 0.66,
  },
}

const allowedPresets = ['subtle', 'balanced', 'dramatic'] as const
const presetFromEnv = process.env.NEXT_PUBLIC_MARKETING_MOTION_PRESET as MotionPresetName | undefined

export const activeMotionPreset: MotionPresetName = allowedPresets.includes(presetFromEnv as MotionPresetName)
  ? (presetFromEnv as MotionPresetName)
  : 'balanced'

export const activeMotionPresetConfig = motionPresets[activeMotionPreset]
