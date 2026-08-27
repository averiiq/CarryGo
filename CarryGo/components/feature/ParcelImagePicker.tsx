import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Alert } from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { optimizeImage } from '@/lib/imageOptimizer';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/theme';
import { Haptic } from '@/services/haptics.service';

const MAX_IMAGES = 4;

type ParcelImagePickerProps = {
  images: string[];
  onImagesChange: (images: string[]) => void;
  error?: string;
};

export function ParcelImagePicker({ images, onImagesChange, error }: ParcelImagePickerProps) {
  const { C } = useThemeColors();
  const [processingIndex, setProcessingIndex] = useState<number | null>(null);
  const mountedRef = useRef(true);

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
    Alert.alert(
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
      Alert.alert('Permission Needed', 'Camera access is required to take parcel photos.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
      aspect: [4, 3],
    });

    if (!result.canceled && result.assets[0]) {
      await handleImageResult(result.assets[0].uri, slotIndex);
    }
  };

  const pickFromGallery = async (slotIndex: number) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Needed', 'Photo library access is required to select parcel photos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
      aspect: [4, 3],
    });

    if (!result.canceled && result.assets[0]) {
      await handleImageResult(result.assets[0].uri, slotIndex);
    }
  };

  const handleImageResult = async (uri: string, slotIndex: number) => {
    setProcessingIndex(slotIndex);
    const optimizedUri = await processImage(uri);
    if (!mountedRef.current) return;
    setProcessingIndex(null);

    if (optimizedUri) {
      const updated = [...images];
      if (slotIndex < updated.length) {
        updated[slotIndex] = optimizedUri;
      } else {
        updated.push(optimizedUri);
      }
      onImagesChange(updated);
      Haptic.confirm();
    } else {
      Haptic.error();
      Alert.alert('Error', 'Failed to process image. Please try again.');
    }
  };

  const removeImage = (index: number) => {
    Haptic.tap();
    const updated = images.filter((_, i) => i !== index);
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
