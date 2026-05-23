import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { useColors } from '@/hooks/useColors';

interface SkeletonCardProps {
  width?: number;
}

export function SkeletonCard({ width = 120 }: SkeletonCardProps) {
  const colors = useColors();
  const height = width * 1.5;
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 800, useNativeDriver: false }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: false }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return (
    <Animated.View style={[styles.container, { width, marginRight: 12, opacity }]}>
      <View style={[styles.image, { height, backgroundColor: colors.surface2, borderRadius: colors.radius }]} />
      <View style={[styles.title, { backgroundColor: colors.surface2, borderRadius: 4 }]} />
      <View style={[styles.subtitle, { backgroundColor: colors.surface2, borderRadius: 4 }]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {},
  image: { width: '100%' },
  title: { height: 12, marginTop: 6, width: '85%' },
  subtitle: { height: 10, marginTop: 4, width: '50%' },
});
