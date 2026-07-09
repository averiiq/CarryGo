import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Image } from 'expo-image';
import Animated, { FadeIn, FadeInDown, ZoomIn } from 'react-native-reanimated';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useThemeColors } from '@/hooks/useThemeColors';
import { FontSize, FontWeight, Spacing, BorderRadius } from '@/constants/theme';
import { KycDocumentType } from '@/types';

interface DocumentPickerProps {
  title: string;
  description: string;
  documentType: KycDocumentType;
  imageUri: string | null;
  onCapture: (uri: string) => void;
  onRetake: () => void;
}

export default function DocumentPicker({
  title,
  description,
  imageUri,
  onCapture,
  onRetake,
}: DocumentPickerProps) {
  const { C, S } = useThemeColors();

  const handleCamera = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return;

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.85,
      allowsEditing: true,
      aspect: [4, 3],
    });

    if (!result.canceled && result.assets[0]) {
      onCapture(result.assets[0].uri);
    }
  };

  const handleGallery = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
      allowsEditing: true,
      aspect: [4, 3],
    });

    if (!result.canceled && result.assets[0]) {
      onCapture(result.assets[0].uri);
    }
  };

  if (imageUri) {
    return (
      <Animated.View entering={ZoomIn.duration(300)} style={[styles.previewContainer, { backgroundColor: C.surface }]}>
        <Image source={{ uri: imageUri }} style={styles.previewImage} contentFit="cover" transition={200} />
        <View style={styles.previewOverlay}>
          <View style={[styles.successBadge, { backgroundColor: C.success }]}>
            <MaterialIcons name="check" size={16} color="#fff" />
            <Text style={styles.successText}>Captured</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Retake photo"
            onPress={onRetake}
            style={({ pressed }) => [
              styles.retakeButton,
              { backgroundColor: C.surfaceElevated, opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <MaterialIcons name="refresh" size={18} color={C.textPrimary} />
            <Text style={[styles.retakeText, { color: C.textPrimary }]}>Retake</Text>
          </Pressable>
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View entering={FadeInDown.duration(400).delay(100)} style={styles.wrapper}>
      <View style={[styles.header, { marginBottom: Spacing.lg }]}>
        <Text style={[styles.title, { color: C.textPrimary }]}>{title}</Text>
        <Text style={[styles.description, { color: C.textSecondary }]}>{description}</Text>
      </View>

      <View style={[styles.captureArea, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorderLight }]}>
        <View style={[styles.iconCircle, { backgroundColor: C.primarySubtle }]}>
          <MaterialIcons name="photo-camera" size={32} color={C.primary} />
        </View>
        <Text style={[styles.captureHint, { color: C.textMuted }]}>
          Take a photo or choose from gallery
        </Text>

        <View style={styles.buttonRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Take photo with camera"
            onPress={handleCamera}
            style={({ pressed }) => [
              styles.captureButton,
              { backgroundColor: C.primary, opacity: pressed ? 0.85 : 1 },
              S.glow,
            ]}
          >
            <MaterialIcons name="camera-alt" size={20} color="#fff" />
            <Text style={styles.captureButtonText}>Camera</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Choose from gallery"
            onPress={handleGallery}
            style={({ pressed }) => [
              styles.captureButton,
              styles.galleryButton,
              { backgroundColor: C.surfaceHigh, borderColor: C.primary, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <MaterialIcons name="photo-library" size={20} color={C.primary} />
            <Text style={[styles.captureButtonText, { color: C.primary }]}>Gallery</Text>
          </Pressable>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  header: {
    gap: Spacing.xs,
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
  },
  description: {
    fontSize: FontSize.sm,
    lineHeight: 20,
  },
  captureArea: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.md,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureHint: {
    fontSize: FontSize.sm,
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  captureButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  galleryButton: {
    borderWidth: 1.5,
  },
  captureButtonText: {
    color: '#fff',
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  previewContainer: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: 240,
    borderRadius: BorderRadius.lg,
  },
  previewOverlay: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  successBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  successText: {
    color: '#fff',
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  retakeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  retakeText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
});
