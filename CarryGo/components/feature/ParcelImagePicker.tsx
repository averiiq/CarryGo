import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { optimizeImage } from '@/lib/imageOptimizer';
import { validateImageUpload } from '@/lib/fileSecurity';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useAlert } from '@/template';
import { Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/theme';
import { Haptic } from '@/services/haptics.service';

const MAX_IMAGES = 4;

type ParcelImagePickerProps = {
  images: string[];
  onImagesChange: (images: string[]) => void;
  error?: string;
  category?: string;
};

export function ParcelImagePicker({
  images,
  onImagesChange,
  error,
}: ParcelImagePickerProps) {
  const { C } = useThemeColors();
  const { showAlert } = useAlert();
  const [isProcessing, setIsProcessing] = useState(false);

  const processAndAddImage = async (uri: string, replaceIndex?: number) => {
    setIsProcessing(true);
    try {
      const optimized = await optimizeImage(uri, 'parcel');
      const finalUri = optimized.uri || uri;
      const nextImages = [...images];
      if (replaceIndex !== undefined && replaceIndex < nextImages.length) {
        nextImages[replaceIndex] = finalUri;
      } else if (nextImages.length < MAX_IMAGES) {
        nextImages.push(finalUri);
      }
      onImagesChange(nextImages);
      Haptic.confirm();
    } catch {
      const nextImages = [...images];
      if (replaceIndex !== undefined && replaceIndex < nextImages.length) {
        nextImages[replaceIndex] = uri;
      } else if (nextImages.length < MAX_IMAGES) {
        nextImages.push(uri);
      }
      onImagesChange(nextImages);
      Haptic.confirm();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCaptureCamera = async (replaceIndex?: number) => {
    Haptic.tap();
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      showAlert(
        'Camera Permission',
        'Camera access is required to take photos of your parcel.',
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.85,
      allowsEditing: true,
      aspect: [4, 3],
    });

    if (!result.canceled && result.assets[0]?.uri) {
      const asset = result.assets[0];
      const validation = validateImageUpload(asset);
      if (!validation.valid) {
        Haptic.warning();
        showAlert('Invalid Photo', validation.error || 'The selected file cannot be accepted.');
        return;
      }
      await processAndAddImage(asset.uri, replaceIndex);
    }
  };

  const handlePickLibrary = async (replaceIndex?: number) => {
    Haptic.tap();
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showAlert(
        'Gallery Permission',
        'Photo gallery access is required to select photos.',
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
      allowsEditing: true,
      aspect: [4, 3],
    });

    if (!result.canceled && result.assets[0]?.uri) {
      const asset = result.assets[0];
      const validation = validateImageUpload(asset);
      if (!validation.valid) {
        Haptic.warning();
        showAlert('Invalid Photo', validation.error || 'The selected file cannot be accepted.');
        return;
      }
      await processAndAddImage(asset.uri, replaceIndex);
    }
  };

  const promptAddPhoto = (replaceIndex?: number) => {
    Haptic.tap();
    showAlert('Add Parcel Photo', 'Choose photo source', [
      {
        text: 'Camera',
        onPress: () => handleCaptureCamera(replaceIndex),
      },
      {
        text: 'Choose from Gallery',
        onPress: () => handlePickLibrary(replaceIndex),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleRemove = (index: number) => {
    Haptic.tap();
    const nextImages = images.filter((_, i) => i !== index);
    onImagesChange(nextImages);
  };

  return (
    <View style={styles.container}>
      {images.length === 0 ? (
        /* Empty Hero Drop Zone */
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add parcel photo"
          onPress={() => !isProcessing && promptAddPhoto()}
          style={({ pressed }) => [
            styles.emptyHero,
            {
              backgroundColor: C.surfaceElevated,
              borderColor: error ? C.error : C.surfaceBorder,
            },
            pressed && { opacity: 0.8, transform: [{ scale: 0.99 }] },
          ]}
        >
          {isProcessing ? (
            <ActivityIndicator size="small" color={C.primary} />
          ) : (
            <>
              <View style={[styles.heroIconBox, { backgroundColor: C.primarySubtle }]}>
                <MaterialIcons name="add-a-photo" size={24} color={C.primary} />
              </View>
              <View style={styles.heroTextWrap}>
                <Text style={[styles.heroTitle, { color: C.textPrimary }]}>
                  Add Parcel Photos
                </Text>
                <Text style={[styles.heroSubtitle, { color: C.textMuted }]}>
                  Tap to take a photo or choose from gallery
                </Text>
              </View>
              <View style={[styles.heroBtn, { backgroundColor: C.primary }]}>
                <Text style={styles.heroBtnText}>+ Add</Text>
              </View>
            </>
          )}
        </Pressable>
      ) : (
        /* Horizontal Thumbnail Strip */
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.thumbnailStrip}
          keyboardShouldPersistTaps="handled"
        >
          {images.map((uri, index) => (
            <View
              key={`${uri}-${index}`}
              style={[styles.thumbnailBox, { borderColor: C.surfaceBorder }]}
            >
              <Pressable
                onPress={() => promptAddPhoto(index)}
                style={styles.thumbnailHitArea}
                accessibilityRole="button"
                accessibilityLabel={`Change photo ${index + 1}`}
              >
                <Image
                  source={{ uri }}
                  style={styles.thumbnailImg}
                  contentFit="cover"
                  transition={150}
                />
              </Pressable>

              {/* Cover badge on photo 0 */}
              {index === 0 ? (
                <View style={[styles.coverBadge, { backgroundColor: C.primary }]}>
                  <Text style={styles.coverBadgeText}>Cover</Text>
                </View>
              ) : null}

              {/* Remove button */}
              <Pressable
                style={[styles.removeBtn, { backgroundColor: 'rgba(15, 23, 42, 0.75)' }]}
                onPress={() => handleRemove(index)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Remove photo"
              >
                <MaterialIcons name="close" size={12} color="#FFFFFF" />
              </Pressable>
            </View>
          ))}

          {/* "+ Add More" slot */}
          {images.length < MAX_IMAGES ? (
            <Pressable
              onPress={() => !isProcessing && promptAddPhoto()}
              disabled={isProcessing}
              style={({ pressed }) => [
                styles.addMoreSlot,
                {
                  backgroundColor: C.surfaceElevated,
                  borderColor: C.surfaceBorder,
                },
                pressed && { opacity: 0.7, transform: [{ scale: 0.95 }] },
              ]}
            >
              {isProcessing ? (
                <ActivityIndicator size="small" color={C.primary} />
              ) : (
                <>
                  <MaterialIcons name="add" size={22} color={C.primary} />
                  <Text style={[styles.addMoreText, { color: C.textSecondary }]}>Add</Text>
                </>
              )}
            </Pressable>
          ) : null}
        </ScrollView>
      )}

      {error ? (
        <Text style={[styles.errorText, { color: C.error }]}>{error}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  /* Empty Hero */
  emptyHero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
  },
  heroIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTextWrap: {
    flex: 1,
    gap: 2,
  },
  heroTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  heroSubtitle: {
    fontSize: FontSize.xs,
  },
  heroBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
  },
  heroBtnText: {
    color: '#FFFFFF',
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },

  /* Horizontal Thumbnails */
  thumbnailStrip: {
    gap: 10,
    paddingVertical: 2,
  },
  thumbnailBox: {
    width: 82,
    height: 82,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    borderWidth: 1,
    position: 'relative',
  },
  thumbnailHitArea: {
    width: '100%',
    height: '100%',
  },
  thumbnailImg: {
    width: '100%',
    height: '100%',
  },
  coverBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: BorderRadius.xs,
  },
  coverBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: FontWeight.bold,
  },
  removeBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Add More Slot */
  addMoreSlot: {
    width: 82,
    height: 82,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  addMoreText: {
    fontSize: 10,
    fontWeight: FontWeight.semibold,
  },

  errorText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    marginTop: 2,
  },
});
