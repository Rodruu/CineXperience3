import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { SkeletonCard } from './SkeletonCard';
import { TMDB_IMAGE_BASE } from '@/services/supabase';
import type { Contenido } from '@/types';

const { width } = Dimensions.get('window');
const CARD_W = Math.round(width * 0.36);
const CARD_H = Math.round(CARD_W * 1.52);
const MAX_ITEMS = 10;

interface SectionRowProps {
  title: string;
  items: Contenido[];
  isLoading?: boolean;
  onPressItem: (item: Contenido) => void;
  onVerMas?: () => void;
  accentColor?: string;
}

function PCard({ item, onPress }: { item: Contenido; onPress: () => void }) {
  const posterUrl = item.poster
    ? `${TMDB_IMAGE_BASE}${item.poster.startsWith('/') ? '' : '/'}${item.poster}`
    : null;

  const isSerie = item.tipo === 'serie';

  return (
    <TouchableOpacity
      style={[styles.card, { width: CARD_W, height: CARD_H }]}
      onPress={onPress}
      activeOpacity={0.78}
    >
      {posterUrl ? (
        <Image
          source={{ uri: posterUrl }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.cardPlaceholder]}>
          <Feather name={isSerie ? 'tv' : 'film'} size={28} color="#2a2a2a" />
        </View>
      )}

      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.95)']}
        locations={[0.42, 1]}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.badgeWrap}>
        <View style={[styles.badge, { backgroundColor: isSerie ? '#1d4ed8' : '#e50914' }]}>
          <Text style={styles.badgeText}>{isSerie ? 'SERIE' : 'FILM'}</Text>
        </View>
      </View>

      <View style={styles.cardBottom}>
        <Text style={styles.cardTitle} numberOfLines={2}>{item.titulo}</Text>
        {item.year ? <Text style={styles.cardYear}>{item.year}</Text> : null}
      </View>

      <View style={styles.playIndicator}>
        <Feather name="play" size={11} color="rgba(255,255,255,0.7)" />
      </View>
    </TouchableOpacity>
  );
}

export function SectionRow({
  title,
  items,
  isLoading,
  onPressItem,
  onVerMas,
  accentColor = '#e50914',
}: SectionRowProps) {
  const visible = items.slice(0, MAX_ITEMS);

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={[styles.titleAccent, { backgroundColor: accentColor }]} />
          <Text style={styles.sectionTitle}>{title}</Text>
          {!isLoading && (
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{items.length}</Text>
            </View>
          )}
        </View>
        {!isLoading && onVerMas ? (
          <TouchableOpacity style={styles.verMasBtn} onPress={onVerMas} activeOpacity={0.75}>
            <Text style={styles.verMasText}>Ver más</Text>
            <Feather name="chevron-right" size={14} color={accentColor} />
          </TouchableOpacity>
        ) : null}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} width={CARD_W} />)
        ) : visible.length === 0 ? (
          <View style={styles.emptyRow}>
            <Text style={styles.emptyText}>Sin contenido asignado</Text>
          </View>
        ) : (
          visible.map((item) => (
            <PCard key={item.id} item={item} onPress={() => onPressItem(item)} />
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: 28 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  titleAccent: {
    width: 3,
    height: 16,
    borderRadius: 2,
  },
  sectionTitle: { fontSize: 16, fontFamily: 'Inter_700Bold', color: '#f0f0f0' },
  countBadge: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  countText: { color: '#5a5a5a', fontSize: 10, fontFamily: 'Inter_600SemiBold' },
  verMasBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  verMasText: { color: '#e50914', fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  scrollContent: { paddingHorizontal: 16, gap: 10 },
  emptyRow: { paddingVertical: 20 },
  emptyText: { color: '#3a3a3a', fontSize: 13, fontFamily: 'Inter_400Regular' },

  card: {
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#111',
    position: 'relative',
    elevation: 4,
  },
  cardPlaceholder: {
    backgroundColor: '#141414',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeWrap: { position: 'absolute', top: 7, left: 7 },
  badge: { paddingHorizontal: 6, paddingVertical: 3, borderRadius: 4 },
  badgeText: { color: '#fff', fontSize: 8, fontFamily: 'Inter_700Bold', letterSpacing: 0.5 },
  cardBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 9 },
  cardTitle: { color: '#fff', fontSize: 11, fontFamily: 'Inter_600SemiBold', lineHeight: 14 },
  cardYear: { color: 'rgba(255,255,255,0.4)', fontSize: 10, fontFamily: 'Inter_400Regular', marginTop: 2 },
  playIndicator: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(229,9,20,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
