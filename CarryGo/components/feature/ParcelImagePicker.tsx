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
}

type ParcelImagePickerProps = {
  images: string[];
  onImagesChange: (images: string[]) => void;
  error?: string;
};

export function ParcelImagePicker({ images, onImagesChange, error }: ParcelImagePickerProps) {
  const { C } = useThemeColors();
  const { showAlert } = useAlert();
  const [processingIndex, setProcessingIndex] = useState<number | null>(null);
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

  const showSourcePicker = (slotIndex: number) => {
    Haptic.tap();
    showAlert(
      'Add Photo',
      'Choose how to add a parcel photo',
      [
        { text: 'Camera', onPress: () => captureFromCamera(slotIndex) },
        { text: 'Gallery', onPress: () => pickFromGallery(slotIndex) },
        { text: 'Cancel', style: 'cancel' },
      ],
    );
  };

  const captureFromCamera = async (slotIndex: number) => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      showAlert('Permission Needed', 'Camera access is required to take parcel photos.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
      aspect: [4, 3],
    });

    if (!result.canceled && result.assets[0]) {
      await handleImageResult(result.assets[0], slotIndex);
    }
  };

  const pickFromGallery = async (slotIndex: number) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showAlert('Permission Needed', 'Photo library access is required to select parcel photos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
      aspect: [4, 3],
    });

    if (!result.canceled && result.assets[0]) {
      await handleImageResult(result.assets[0], slotIndex);
    }
  };

  const checkIfDuplicate = async (
    asset: ImagePicker.ImagePickerAsset,
    slotIndex: number,
    assetInfo: { md5?: string; size?: number } | null
  ): Promise<boolean> => {
    const candidateUri = asset.uri;
    const candidateName = asset.fileName ? asset.fileName.toLowerCase() : extractFileName(candidateUri);

    for (let i = 0; i < images.length; i++) {
      if (i === slotIndex) continue;

      const existingUri = images[i];
      if (!existingUri) continue;

      // 1. Direct URI match
      if (existingUri === candidateUri) {
        return true;
      }

      // 2. Tracked metadata match
      const meta = sourceMetaRef.current.get(i);
      if (meta) {
        if (meta.originalUri === candidateUri) {
          return true;
        }
        if (asset.fileName && meta.fileName && meta.fileName === asset.fileName.toLowerCase()) {
          return true;
        }
        if (meta.md5 && assetInfo?.md5 && meta.md5 === assetInfo.md5) {
          return true;
        }
        if (
          meta.size !== undefined &&
          assetInfo?.size !== undefined &&
          meta.size > 0 &&
          meta.size === assetInfo.size &&
          meta.fileName === candidateName
        ) {
          return true;
        }
      }

      // 3. Fallback file name match
      const existingName = extractFileName(existingUri);
      if (
        candidateName &&
        candidateName.length > 3 &&
        candidateName !== 'image.jpg' &&
        candidateName !== 'photo.jpg' &&
        existingName === candidateName
      ) {
        return true;
      }

      // 4. Existing file hash match
      const existingInfo = await getFileInfo(existingUri);
      if (existingInfo?.md5 && assetInfo?.md5 && existingInfo.md5 === assetInfo.md5) {
        return true;
      }
    }

    return false;
  };

  const checkProcessedDuplicate = async (
    optimizedUri: string,
    slotIndex: number
  ): Promise<boolean> => {
    const optimizedInfo = await getFileInfo(optimizedUri);
    for (let i = 0; i < images.length; i++) {
      if (i === slotIndex) continue;
      const existingUri = images[i];
      if (!existingUri) continue;

      if (existingUri === optimizedUri) {
        return true;
      }

      const existingInfo = await getFileInfo(existingUri);
      if (
        existingInfo?.md5 &&
        optimizedInfo?.md5 &&
        existingInfo.md5 === optimizedInfo.md5
      ) {
        return true;
      }
      if (
        existingInfo?.size &&
        optimizedInfo?.size &&
        existingInfo.size > 0 &&
        existingInfo.size === optimizedInfo.size
      ) {
        return true;
      }
    }
    return false;
  };

  const handleImageResult = async (asset: ImagePicker.ImagePickerAsset, slotIndex: number) => {
    setProcessingIndex(slotIndex);
    const assetInfo = await getFileInfo(asset.uri);

    const isDuplicate = await checkIfDuplicate(asset, slotIndex, assetInfo);
    if (isDuplicate) {
      if (mountedRef.current) setProcessingIndex(null);
      Haptic.error();
      showAlert('Duplicate Image', 'This image has already been added. Please select a different image.');
      return;
    }

    const optimizedUri = await processImage(asset.uri);
    if (!mountedRef.current) return;

    if (!optimizedUri) {
      setProcessingIndex(null);
      Haptic.error();
      showAlert('Error', 'Failed to process image. Please try again.');
      return;
    }

    const isProcessedDuplicate = await checkProcessedDuplicate(optimizedUri, slotIndex);
    if (isProcessedDuplicate) {
      setProcessingIndex(null);
      Haptic.error();
      showAlert('Duplicate Image', 'This image has already been added. Please select a different image.');
      return;
    }

    setProcessingIndex(null);

    // Record source metadata for subsequent duplicate checks
    sourceMetaRef.current.set(slotIndex, {
      originalUri: asset.uri,
      fileName: asset.fileName ? asset.fileName.toLowerCase() : extractFileName(asset.uri),
      md5: assetInfo?.md5,
      size: assetInfo?.size,
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
        <Text style={[styles.label, { color: C.textSecondary }]}>Parcel Photos</Text>
        <Text style={[styles.counter, { color: images.length > 0 ? C.primary : C.textMuted }]}>
          {images.length}/{MAX_IMAGES}
        </Text>
      </View>
      <Text style={[styles.hint, { color: error ? C.error : C.textMuted }]}>
        {error || 'Add at least 1 clear parcel photo (up to 4 recommended)'}
      </Text>

      <View style={styles.grid}>
        {slots.map((slotIndex) => {
          const imageUri = images[slotIndex];
          const isProcessing = processingIndex === slotIndex;
          const isFirst = slotIndex === 0;
          const isNextEmpty = !imageUri && slotIndex === images.length;
          const isDisabledSlot = !imageUri && slotIndex > images.length;

          if (imageUri) {
            return (
              <View key={slotIndex} style={[styles.slot, styles.filledSlot, { borderColor: C.surfaceBorder }]}>
                <Image source={{ uri: imageUri }} style={styles.image} contentFit="cover" transition={200} />
                <Pressable
                  style={[styles.removeBtn, { backgroundColor: C.error }]}
                  onPress={() => removeImage(slotIndex)}
                  hitSlop={6}
                >
                  <MaterialIcons name="close" size={12} color="#fff" />
                </Pressable>
                {isFirst && (
                  <View style={[styles.mainBadge, { backgroundColor: C.primary }]}>
                    <Text style={styles.mainBadgeText}>Main</Text>
                  </View>
                )}
              </View>
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
                  borderColor: error && slotIndex === 0 ? C.error : isNextEmpty ? C.primary + '55' : C.surfaceBorder,
                  opacity: isDisabledSlot ? 0.4 : pressed ? 0.7 : 1,
                },
              ]}
              onPress={() => !isDisabledSlot && !isProcessing && showSourcePicker(slotIndex)}
              disabled={isDisabledSlot || isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator size="small" color={C.primary} />
              ) : (
                <>
                  <View style={[styles.addIconWrap, { backgroundColor: isNextEmpty ? C.primary + '20' : C.surfaceBorder }]}>
                    <MaterialIcons
                      name={isNextEmpty ? 'add-a-photo' : 'photo-camera'}
                      size={20}
                      color={isNextEmpty ? C.primary : C.textMuted}
                    />
                  </View>
                  <Text style={[styles.slotLabel, { color: isNextEmpty ? C.primary : C.textMuted }]}>
                    {isFirst ? 'Front' : slotIndex === 1 ? 'Back' : slotIndex === 2 ? 'Side' : 'Label'}
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
  label: { fontSize: FontSize.sm, fontWeight: FontWeight.medium, marginLeft: 2 },
  counter: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  hint: { fontSize: FontSize.xs, marginLeft: 2, marginTop: -2 },
  grid: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xs },
  slot: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filledSlot: { position: 'relative' },
  emptySlot: { gap: 6, borderStyle: 'dashed' },
  image: { width: '100%', height: '100%' },
  removeBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainBadge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  mainBadgeText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  addIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotLabel: { fontSize: 10, fontWeight: '600' },
});
