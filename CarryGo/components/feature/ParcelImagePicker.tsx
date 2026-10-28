import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { optimizeImage } from '@/lib/imageOptimizer';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useAlert } from '@/template';
import { Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/theme';
import { Haptic } from '@/services/haptics.service';
import {
  ANGLE_SLOTS,
  ImageFingerprint,
  computeImageFingerprint,
  assessImageAngleDiversity,
  classifyParcelWithAI,
} from '@/lib/parcelVision';

const MAX_IMAGES = 4;

function extractFileName(uri: string): string {
  const clean = uri.split('?')[0].split('#')[0];
  const lastSlash = clean.lastIndexOf('/');
  return lastSlash >= 0 ? clean.substring(lastSlash + 1).toLowerCase() : clean.toLowerCase();
}

async function getFileInfo(uri: string): Promise<{ md5?: string; size?: number } | null> {
  try {
    const info = await FileSystem.getInfoAsync(uri, { md5: true, size: true });
    if (info.exists) {
      return {
        md5: 'md5' in info && typeof info.md5 === 'string' ? info.md5 : undefined,
        size: 'size' in info && typeof info.size === 'number' ? info.size : undefined,
      };
    }
  } catch {
    // Fail silently if file is inaccessible
  }
  return null;
}

interface ImageMetadata {
  originalUri: string;
  fileName?: string;
  md5?: string;
  size?: number;
  fingerprint?: ImageFingerprint;
  detectedItem?: string;
}

type ParcelImagePickerProps = {
  images: string[];
  onImagesChange: (images: string[]) => void;
  error?: string;
  category?: string;
};

export function ParcelImagePicker({ images, onImagesChange, error, category }: ParcelImagePickerProps) {
  const { C } = useThemeColors();
  const { showAlert } = useAlert();
  const [processingIndex, setProcessingIndex] = useState<number | null>(null);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const mountedRef = useRef(true);
  const sourceMetaRef = useRef<Map<number, ImageMetadata>>(new Map());

  useEffect(() => {
    return () => { mountedRef.current = false; };
  }, []);

  const processImage = async (uri: string): Promise<string | null> => {
    try {
      const result = await optimizeImage(uri, 'parcel');
      return result.uri;
    } catch {
      return null;
    }
  };

  const captureFromCamera = async (slotIndex: number) => {
    Haptic.tap();
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      showAlert(
        'Camera Permission Needed',
        'Live camera access is required to capture parcel photos from different angles. Please enable camera access in Settings.',
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.85,
      allowsEditing: true,
      aspect: [4, 3],
    });

    if (!result.canceled && result.assets[0]) {
      await handleImageResult(result.assets[0], slotIndex);
    }
  };


  const handleImageResult = async (asset: ImagePicker.ImagePickerAsset, slotIndex: number) => {
    setProcessingIndex(slotIndex);
    setProcessingStatus('Analyzing AI angles…');

    // 1. Basic file check
    const assetInfo = await getFileInfo(asset.uri);
    const candidateUri = asset.uri;
    const candidateName = asset.fileName ? asset.fileName.toLowerCase() : extractFileName(candidateUri);

    // 2. Compute AI perceptual fingerprint & angle diversity check
    let newFingerprint: ImageFingerprint | null = null;
    try {
      newFingerprint = await computeImageFingerprint(asset.uri);
    } catch (e) {
      console.warn('[ParcelImagePicker] Fingerprint error:', e);
    }

    if (newFingerprint) {
      // Gather all existing fingerprints from metadata
      const existingFingerprints: (ImageFingerprint | null)[] = [];
      for (let i = 0; i < images.length; i++) {
        const meta = sourceMetaRef.current.get(i);
        existingFingerprints.push(meta?.fingerprint || null);
      }

      const angleCheck = assessImageAngleDiversity(newFingerprint, existingFingerprints, slotIndex);

      if (!angleCheck.isValid) {
        if (mountedRef.current) {
          setProcessingIndex(null);
          setProcessingStatus('');
        }
        Haptic.error();

        const title =
          angleCheck.code === 'SAME_ANGLE'
            ? 'Different Angle Required'
            : angleCheck.code === 'EXACT_DUPLICATE'
              ? 'Duplicate Photo'
              : 'Invalid Image';

        showAlert(title, angleCheck.message);
        return;
      }
    }

    // 3. Fallback file identity matching
    for (let i = 0; i < images.length; i++) {
      if (i === slotIndex) continue;
      const existingUri = images[i];
      if (!existingUri) continue;

      if (existingUri === candidateUri) {
        if (mountedRef.current) setProcessingIndex(null);
        Haptic.error();
        showAlert('Duplicate Image', 'This image has already been added. Each slot requires a different photo.');
        return;
      }

      const meta = sourceMetaRef.current.get(i);
      if (meta) {
        if (meta.md5 && assetInfo?.md5 && meta.md5 === assetInfo.md5) {
          if (mountedRef.current) setProcessingIndex(null);
          Haptic.error();
          showAlert('Duplicate Image', `This image is identical to Photo #${i + 1}. Please capture a different angle.`);
          return;
        }
      }
    }

    // 4. Optimize image compression
    setProcessingStatus('Optimizing…');
    const optimizedUri = await processImage(asset.uri);
    if (!mountedRef.current) return;

    if (!optimizedUri) {
      setProcessingIndex(null);
      setProcessingStatus('');
      Haptic.error();
      showAlert('Error', 'Failed to process image. Please try again.');
      return;
    }

    // 5. Cloud/Local AI classification
    let detectedItem = 'Physical Parcel';
    try {
      const aiResult = await classifyParcelWithAI(optimizedUri, category);
      if (aiResult.detectedItem) {
        detectedItem = aiResult.detectedItem;
      }
      if (!aiResult.isValidParcel) {
        console.log('[ParcelImagePicker] AI flagged non-parcel:', aiResult.warning);
      }
    } catch {
      // Non-blocking fallback
    }

    setProcessingIndex(null);
    setProcessingStatus('');

    // Save metadata with AI fingerprint
    sourceMetaRef.current.set(slotIndex, {
      originalUri: asset.uri,
      fileName: candidateName,
      md5: assetInfo?.md5,
      size: assetInfo?.size,
      fingerprint: newFingerprint || undefined,
      detectedItem,
    });

    const updated = [...images];
    if (slotIndex < updated.length) {
      updated[slotIndex] = optimizedUri;
    } else {
      updated.push(optimizedUri);
    }
    onImagesChange(updated);
    Haptic.confirm();
  };

  const removeImage = (index: number) => {
    Haptic.tap();
    const updated = images.filter((_, i) => i !== index);
    const nextMeta = new Map<number, ImageMetadata>();
    let targetIdx = 0;
    for (let i = 0; i < images.length; i++) {
      if (i !== index) {
        const meta = sourceMetaRef.current.get(i);
        if (meta) nextMeta.set(targetIdx, meta);
        targetIdx++;
      }
    }
    sourceMetaRef.current = nextMeta;
    onImagesChange(updated);
  };

  const slots = Array.from({ length: MAX_IMAGES }, (_, i) => i);

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <View style={styles.labelLeft}>
          <Text style={[styles.label, { color: C.textPrimary }]}>Live Parcel Photos</Text>
          <View style={[styles.aiPill, { backgroundColor: C.primarySubtle }]}>
            <MaterialIcons name="photo-camera" size={10} color={C.primary} />
            <Text style={[styles.aiPillText, { color: C.primary }]}>Live Camera Only</Text>
          </View>
        </View>
        <Text style={[styles.counter, { color: images.length > 0 ? C.primary : C.textMuted }]}>
          {images.length}/{MAX_IMAGES}
        </Text>
      </View>

      <Text style={[styles.hint, { color: error ? C.error : C.textMuted }]}>
        {error || 'Live camera only: Capture different angles (front, side, top, label) directly with your camera.'}
      </Text>

      <View style={styles.grid}>
        {slots.map((slotIndex) => {
          const imageUri = images[slotIndex];
          const isProcessing = processingIndex === slotIndex;
          const slotConfig = ANGLE_SLOTS[slotIndex];
          const isNextEmpty = !imageUri && slotIndex === images.length;
          const isDisabledSlot = !imageUri && slotIndex > images.length;

          if (imageUri) {
            return (
              <Pressable
                key={slotIndex}
                style={({ pressed }) => [
                  styles.slot,
                  styles.filledSlot,
                  { borderColor: C.surfaceBorder, opacity: pressed ? 0.9 : 1 },
                ]}
                onPress={() => !isProcessing && captureFromCamera(slotIndex)}
                disabled={isProcessing}
                accessibilityRole="button"
                accessibilityLabel={`Retake ${slotConfig.shortLabel} photo`}
              >
                <Image source={{ uri: imageUri }} style={styles.image} contentFit="cover" transition={200} />
                {isProcessing ? (
                  <View style={[styles.image, styles.processingOverlay]}>
                    <ActivityIndicator size="small" color="#fff" />
                  </View>
                ) : null}
                <Pressable
                  style={[styles.removeBtn, { backgroundColor: C.error }]}
                  onPress={() => removeImage(slotIndex)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Delete photo"
                >
                  <MaterialIcons name="close" size={12} color="#fff" />
                </Pressable>

                {/* Retake affordance */}
                <View style={[styles.retakeBadge, { backgroundColor: 'rgba(15, 23, 42, 0.82)' }]}>
                  <MaterialIcons name="refresh" size={10} color="#fff" />
                  <Text style={styles.slotBadgeText}>Retake</Text>
                </View>

                {/* Angle Badge */}
                <View style={[styles.slotBadge, { backgroundColor: 'rgba(15, 23, 42, 0.82)' }]}>
                  <MaterialIcons name="check" size={10} color="#10B981" />
                  <Text style={styles.slotBadgeText}>{slotConfig.shortLabel}</Text>
                </View>
              </Pressable>
            );
          }

          return (
            <Pressable
              key={slotIndex}
              style={({ pressed }) => [
                styles.slot,
                styles.emptySlot,
                {
                  backgroundColor: isNextEmpty ? C.primarySubtle : C.surfaceElevated,
                  borderColor: error && slotIndex === 0 ? C.error : isNextEmpty ? C.primary + '65' : C.surfaceBorder,
                  opacity: isDisabledSlot ? 0.38 : pressed ? 0.75 : 1,
                  transform: pressed && !isDisabledSlot ? [{ scale: 0.97 }] : [{ scale: 1 }],
                },
              ]}
              onPress={() => !isDisabledSlot && !isProcessing && captureFromCamera(slotIndex)}
              disabled={isDisabledSlot || isProcessing}
            >
              {isProcessing ? (
                <View style={styles.processingWrap}>
                  <ActivityIndicator size="small" color={C.primary} />
                  <Text style={[styles.processingText, { color: C.primary }]}>AI Checking</Text>
                </View>
              ) : (
                <>
                  <View style={[styles.addIconWrap, { backgroundColor: isNextEmpty ? C.primary + '22' : C.surfaceBorder }]}>
                    <MaterialIcons
                      name={slotConfig.icon as any}
                      size={18}
                      color={isNextEmpty ? C.primary : C.textMuted}
                    />
                  </View>
                  <Text style={[styles.slotLabel, { color: isNextEmpty ? C.primaryDark : C.textMuted }]}>
                    {slotConfig.shortLabel}
                  </Text>
                  <Text style={[styles.slotSubLabel, { color: C.textMuted }]}>
                    {slotIndex === 0 ? 'Overview' : slotIndex === 1 ? 'Angle' : slotIndex === 2 ? 'Top' : 'Detail'}
                  </Text>
                </>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.sm },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  labelLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  label: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, marginLeft: 2 },
  aiPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  aiPillText: { fontSize: 9.5, fontWeight: FontWeight.bold },
  counter: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  hint: { fontSize: FontSize.xs, marginLeft: 2, marginTop: -2, lineHeight: 16 },
  grid: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xs },
  slot: {
    flex: 1,
    aspectRatio: 0.9,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filledSlot: { position: 'relative' },
  emptySlot: { gap: 3, borderStyle: 'dashed', paddingVertical: 8 },
  image: { width: '100%', height: '100%' },
  removeBtn: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  slotBadge: {
    position: 'absolute',
    bottom: 5,
    left: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  slotBadgeText: { color: '#fff', fontSize: 9.5, fontWeight: '700' },
  retakeBadge: {
    position: 'absolute',
    top: 5,
    left: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  processingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotLabel: { fontSize: 10.5, fontWeight: '700', marginTop: 1 },
  slotSubLabel: { fontSize: 9, fontWeight: '500' },
  processingWrap: { alignItems: 'center', justifyContent: 'center', gap: 4 },
  processingText: { fontSize: 9, fontWeight: '700' },
});
