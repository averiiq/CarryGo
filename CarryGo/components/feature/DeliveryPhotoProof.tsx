import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/theme';
import { Haptic } from '@/services/haptics.service';

interface DeliveryPhotoProofProps {
  type: 'pickup' | 'delivery';
  onPhotoCapture: (uri: string) => void;
  existingPhotoUri?: string;
  disabled?: boolean;
}

export function DeliveryPhotoProof({ type, onPhotoCapture, existingPhotoUri, disabled }: DeliveryPhotoProofProps) {
  const { C } = useThemeColors();
  const [photoUri, setPhotoUri] = useState<string | null>(existingPhotoUri ?? null);
  const [isProcessing, setIsProcessing] = useState(false);

  const compressImage = async (uri: string): Promise<string> => {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 1200 } }],
      { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
    );
    return result.uri;
  };

  const takePhoto = async () => {
    if (disabled) return;

    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') return;

    Haptic.tap();
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: false,
    });

    if (!result.canceled && result.assets[0]) {
      setIsProcessing(true);
      const compressed = await compressImage(result.assets[0].uri);
      setPhotoUri(compressed);
      onPhotoCapture(compressed);
      setIsProcessing(false);
      Haptic.confirm();
    }
  };

  const pickFromGallery = async () => {
    if (disabled) return;

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;

    Haptic.tap();
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
      aspect: [4, 3],
    });

    if (!result.canceled && result.assets[0]) {
      setIsProcessing(true);
      const compressed = await compressImage(result.assets[0].uri);
      setPhotoUri(compressed);
      onPhotoCapture(compressed);
      setIsProcessing(false);
      Haptic.confirm();
    }
  };

  const retake = () => {
    setPhotoUri(null);
    Haptic.tap();
  };

  const title = type === 'pickup' ? 'Pickup Photo Proof' : 'Delivery Photo Proof';
  const subtitle = type === 'pickup'
    ? 'Take a photo of the parcel at pickup'
    : 'Take a photo confirming delivery';

  if (photoUri) {
    return (
      <View style={[styles.container, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
        <View style={styles.header}>
          <MaterialIcons name="check-circle" size={18} color={C.success} />
          <Text style={[styles.title, { color: C.textPrimary }]}>{title}</Text>
        </View>
        <View style={styles.photoContainer}>
          <Image source={{ uri: photoUri }} style={styles.photo} contentFit="cover" transition={200} />
          <View style={[styles.timestampOverlay, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
            <MaterialIcons name="access-time" size={11} color="#fff" />
            <Text style={styles.timestamp}>{new Date().toLocaleString()}</Text>
          </View>
        </View>
        {!disabled && (
          <Pressable
            style={({ pressed }) => [styles.retakeBtn, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder, opacity: pressed ? 0.8 : 1 }]}
            onPress={retake}
          >
            <MaterialIcons name="replay" size={14} color={C.textSecondary} />
            <Text style={[styles.retakeText, { color: C.textSecondary }]}>Retake Photo</Text>
          </Pressable>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
      <View style={styles.header}>
        <MaterialIcons name="camera-alt" size={18} color={C.primary} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: C.textPrimary }]}>{title}</Text>
          <Text style={[styles.subtitle, { color: C.textMuted }]}>{subtitle}</Text>
        </View>
      </View>

      {isProcessing ? (
        <View style={styles.processingWrap}>
          <ActivityIndicator size="small" color={C.primary} />
          <Text style={[styles.processingText, { color: C.textMuted }]}>Processing photo...</Text>
        </View>
      ) : (
        <View style={styles.actions}>
          <Pressable
            style={({ pressed }) => [styles.actionBtn, styles.cameraBtn, { backgroundColor: C.primary, opacity: pressed ? 0.9 : 1 }]}
            onPress={takePhoto}
            disabled={disabled}
          >
            <MaterialIcons name="camera-alt" size={20} color="#fff" />
            <Text style={styles.cameraBtnText}>Take Photo</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.actionBtn, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder, borderWidth: 1, opacity: pressed ? 0.8 : 1 }]}
            onPress={pickFromGallery}
            disabled={disabled}
          >
            <MaterialIcons name="photo-library" size={18} color={C.textSecondary} />
            <Text style={[styles.galleryBtnText, { color: C.textSecondary }]}>Gallery</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  title: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  subtitle: { fontSize: FontSize.xs, marginTop: 1 },
  photoContainer: {
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    position: 'relative',
  },
  photo: {
    width: '100%',
    height: 200,
    borderRadius: BorderRadius.md,
  },
  timestampOverlay: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  timestamp: { color: '#fff', fontSize: 10, fontWeight: FontWeight.medium },
  retakeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  retakeText: { fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  cameraBtn: {},
  cameraBtnText: { color: '#fff', fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  galleryBtnText: { fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  processingWrap: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    gap: Spacing.sm,
  },
  processingText: { fontSize: FontSize.sm },
});
