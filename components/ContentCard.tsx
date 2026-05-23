import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { TMDB_IMAGE_BASE } from '@/services/supabase';
import type { Contenido } from '@/types';

interface ContentCardProps {
  content: Contenido;
  onPress: () => void;
  width?: number;
}

export function ContentCard({ content, onPress, width = 160 }: ContentCardProps) {
  const height = Math.round(width * 1.5);

  const posterUrl = content.poster
    ? `${TMDB_IMAGE_BASE}${content.poster.startsWith('/') ? '' : '/'}${content.poster}`
    : null;

  const isSerie = content.tipo === 'serie';

  return (
    <TouchableOpacity
      style={[styles.container, { width, height }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.imageContainer}>
        {posterUrl ? (
          <Image
            source={{ uri: posterUrl }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
          />
        ) : (
          <View style={styles.placeholder}>
            <Feather name={isSerie ? 'tv' : 'film'} size={32} color="#2a2a2a" />
          </View>
        )}

        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.92)']}
          locations={[0.5, 1]}
          style={StyleSheet.absoluteFill}
        />

        <View style={styles.badgeWrap}>
          <View style={[styles.badge, { backgroundColor: isSerie ? '#1d4ed8' : '#e50914' }]}>
            <Text style={styles.badgeText}>{isSerie ? 'SERIE' : 'FILM'}</Text>
          </View>
        </View>

        <View style={styles.bottomInfo}>
          <Text style={styles.title} numberOfLines={2}>{content.titulo}</Text>
          {content.year ? (
            <Text style={styles.year}>{content.year}</Text>
          ) : null}
        </View>

        <View style={styles.playOverlay}>
          <View style={styles.playCircle}>
            <Feather name="play" size={14} color="#fff" />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 6,
  },
  imageContainer: {
    flex: 1,
    backgroundColor: '#111',
    borderRadius: 12,
    overflow: 'hidden',
  },
  placeholder: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#141414',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeWrap: {
    position: 'absolute',
    top: 8,
    left: 8,
  },
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5,
  },
  badgeText: {
    color: '#fff',
    fontSize: 8,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.8,
  },
  bottomInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 10,
  },
  title: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    lineHeight: 15,
    marginBottom: 2,
  },
  year: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 10,
    fontFamily: 'Inter_400Regular',
  },
  playOverlay: {
    position: 'absolute',
    top: '38%',
    left: 0,
    right: 0,
    alignItems: 'center',
    opacity: 0,
  },
  playCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(229,9,20,0.88)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
