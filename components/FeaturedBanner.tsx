import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { TMDB_IMAGE_BASE } from '@/services/supabase';
import type { Contenido } from '@/types';

const { width } = Dimensions.get('window');
const BANNER_HEIGHT = Math.round(width * 0.72);
const AUTO_MS = 5500;

interface FeaturedBannerProps {
  items: Contenido[];
  onPlay: (item: Contenido) => void;
  onInfo?: (item: Contenido) => void;
}

export function FeaturedBanner({ items, onPlay, onInfo }: FeaturedBannerProps) {
  const scrollRef = useRef<ScrollView>(null);
  const [active, setActive] = useState(0);
  const activeRef = useRef(0);
  const dragging = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const goTo = useCallback(
    (idx: number) => {
      const clamped = Math.max(0, Math.min(idx, items.length - 1));
      scrollRef.current?.scrollTo({ x: clamped * width, animated: true });
      activeRef.current = clamped;
      setActive(clamped);
    },
    [items.length]
  );

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (items.length <= 1) return;
    timerRef.current = setInterval(() => {
      if (dragging.current) return;
      goTo((activeRef.current + 1) % items.length);
    }, AUTO_MS);
  }, [items.length, goTo]);

  useEffect(() => {
    startTimer();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [startTimer]);

  if (items.length === 0) return null;

  return (
    <View style={[styles.root, { height: BANNER_HEIGHT }]}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onScrollBeginDrag={() => { dragging.current = true; }}
        onScrollEndDrag={() => { dragging.current = false; startTimer(); }}
        onMomentumScrollEnd={(e) => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / width);
          activeRef.current = idx;
          setActive(idx);
        }}
      >
        {items.map((item) => {
          const posterUrl = item.poster
            ? `${TMDB_IMAGE_BASE}${item.poster.startsWith('/') ? '' : '/'}${item.poster}`
            : null;

          return (
            <View key={item.id} style={{ width, height: BANNER_HEIGHT }}>
              {posterUrl ? (
                <Image
                  source={{ uri: posterUrl }}
                  style={StyleSheet.absoluteFill}
                  contentFit="cover"
                />
              ) : (
                <View style={[StyleSheet.absoluteFill, styles.fallbackBg]} />
              )}

              <LinearGradient
                colors={['rgba(3,3,3,0.6)', 'transparent', 'rgba(3,3,3,0.5)', '#030303']}
                locations={[0, 0.2, 0.55, 1]}
                style={StyleSheet.absoluteFill}
              />

              <View style={styles.slide}>
                <View style={styles.metaRow}>
                  <View style={[styles.typeBadge, { backgroundColor: item.tipo === 'serie' ? '#1d4ed8' : '#e50914' }]}>
                    <Text style={styles.typeText}>
                      {item.tipo === 'serie' ? 'SERIE' : 'PELÍCULA'}
                    </Text>
                  </View>
                  {item.year ? (
                    <View style={styles.yearBadge}>
                      <Text style={styles.yearText}>{item.year}</Text>
                    </View>
                  ) : null}
                </View>

                <Text style={styles.title} numberOfLines={2}>{item.titulo}</Text>

                <View style={styles.buttonsRow}>
                  <TouchableOpacity
                    style={styles.playBtn}
                    onPress={() => onPlay(item)}
                    activeOpacity={0.85}
                  >
                    <LinearGradient
                      colors={['#ff1a1a', '#e50914', '#b00000']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.playBtnGrad}
                    >
                      <Feather name="play" size={15} color="#fff" />
                      <Text style={styles.playText}>Reproducir</Text>
                    </LinearGradient>
                  </TouchableOpacity>

                  {onInfo && (
                    <TouchableOpacity
                      style={styles.infoBtn}
                      onPress={() => onInfo(item)}
                      activeOpacity={0.8}
                    >
                      <Feather name="info" size={14} color="rgba(255,255,255,0.85)" />
                      <Text style={styles.infoText}>Info</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {items.length > 1 && (
        <View style={styles.dotsRow}>
          {items.map((_, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => goTo(i)}
              hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
            >
              <View style={[styles.dot, i === active && styles.dotActive]} />
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { width: '100%' },
  fallbackBg: { backgroundColor: '#111' },
  slide: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: 32,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  typeBadge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 5,
  },
  typeText: { color: '#fff', fontSize: 9, fontFamily: 'Inter_700Bold', letterSpacing: 1.2 },
  yearBadge: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  yearText: { color: 'rgba(255,255,255,0.75)', fontSize: 10, fontFamily: 'Inter_500Medium' },
  title: {
    color: '#fff',
    fontSize: 24,
    fontFamily: 'Inter_700Bold',
    lineHeight: 29,
    marginBottom: 14,
  },
  buttonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  playBtn: {
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 4,
  },
  playBtnGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 7,
  },
  playText: { color: '#fff', fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  infoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  infoText: { color: 'rgba(255,255,255,0.85)', fontSize: 14, fontFamily: 'Inter_500Medium' },
  dotsRow: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 5,
    alignItems: 'center',
  },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.25)' },
  dotActive: { width: 22, height: 5, borderRadius: 3, backgroundColor: '#e50914' },
});
