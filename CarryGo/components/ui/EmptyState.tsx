import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LottieAnimation } from './LottieViewWrapper';

interface EmptyStateProps {
  width?: number;
  height?: number;
}

/** Animated empty inbox / no requests */
export function EmptyRequestsSVG({ width = 180, height = 150 }: EmptyStateProps) {
  return (
    <View style={[styles.svgContainer, { width, height }]}>
      <LottieAnimation name="emailSent" style={{ width, height }} />
    </View>
  );
}

/** Animated empty trips */
export function EmptyTripsSVG({ width = 180, height = 150 }: EmptyStateProps) {
  return (
    <View style={[styles.svgContainer, { width, height }]}>
      <LottieAnimation name="trip" style={{ width, height }} />
    </View>
  );
}

/** Animated empty parcels */
export function EmptyParcelsSVG({ width = 180, height = 150 }: EmptyStateProps) {
  return (
    <View style={[styles.svgContainer, { width, height }]}>
      <LottieAnimation name="noParcel" style={{ width, height }} />
    </View>
  );
}

/** Animated empty messages */
export function EmptyMessagesSVG({ width = 180, height = 150 }: EmptyStateProps) {
  return (
    <View style={[styles.svgContainer, { width, height }]}>
      <LottieAnimation name="chat" style={{ width, height }} />
    </View>
  );
}

/** Animated empty transactions */
export function EmptyTransactionsSVG({ width = 180, height = 150 }: EmptyStateProps) {
  return (
    <View style={[styles.svgContainer, { width, height }]}>
      <LottieAnimation name="emptyActivity" style={{ width, height }} />
    </View>
  );
}

const styles = StyleSheet.create({
  svgContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
