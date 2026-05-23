import React, { useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
  Alert,
  Dimensions,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useRecentlyWatched, timeAgo, type RecentItem } from "@/hooks/useRecentlyWatched";
import { TMDB_IMAGE_BASE } from "@/services/supabase";

const { width } = Dimensions.get("window");
const THUMB_W = 100;
const THUMB_H = Math.round(THUMB_W * 1.45);

function RecentCard({
  item,
  onPress,
  onRemove,
}: {
  item: RecentItem;
  onPress: () => void;
  onRemove: () => void;
}) {
  const posterUrl = item.poster
    ? `${TMDB_IMAGE_BASE}${item.poster.startsWith("/") ? "" : "/"}${item.poster}`
    : null;

  const isSerie = item.tipo === "serie";

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={[styles.thumb, { width: THUMB_W, height: THUMB_H }]}>
        {posterUrl ? (
          <Image source={{ uri: posterUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
        ) : (
          <View style={styles.thumbPlaceholder}>
            <Feather name={isSerie ? "tv" : "film"} size={24} color="#2a2a2a" />
          </View>
        )}
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.7)"]}
          style={StyleSheet.absoluteFill}
        />
        <View style={[styles.typePill, { backgroundColor: isSerie ? "#1d4ed8" : "#e50914" }]}>
          <Text style={styles.typePillText}>{isSerie ? "SERIE" : "FILM"}</Text>
        </View>
        <View style={styles.thumbPlayWrap}>
          <Feather name="play-circle" size={22} color="rgba(255,255,255,0.8)" />
        </View>
      </View>

      <View style={styles.cardInfo}>
        <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
        <View style={styles.timeRow}>
          <Feather name="clock" size={11} color="#5a5a5a" />
          <Text style={styles.timeText}>{timeAgo(item.watchedAt)}</Text>
        </View>
        <TouchableOpacity
          style={styles.watchAgainBtn}
          onPress={onPress}
          activeOpacity={0.8}
        >
          <Feather name="play" size={12} color="#e50914" />
          <Text style={styles.watchAgainText}>
            {isSerie ? "Continuar" : "Reproducir"}
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.removeBtn}
        onPress={onRemove}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Feather name="x" size={14} color="#5a5a5a" />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

export default function RecentScreen() {
  const insets = useSafeAreaInsets();
  const { items, loading, refresh, remove, clearAll } = useRecentlyWatched();

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  function handlePress(item: RecentItem) {
    if (item.tipo === "serie") {
      router.push({
        pathname: "/player",
        params: {
          contenidoId: item.contenidoId,
          title: item.title,
          isSerie: "true",
          tmdbId: item.tmdbId,
          tipo: item.tipo,
          poster: item.poster ?? undefined,
        },
      });
    } else {
      router.push({
        pathname: "/player",
        params: {
          iframeUrl: item.iframeUrl,
          contenidoId: item.contenidoId,
          title: item.title,
          tmdbId: item.tmdbId,
          tipo: item.tipo,
          poster: item.poster ?? undefined,
        },
      });
    }
  }

  function confirmClearAll() {
    Alert.alert(
      "Limpiar historial",
      "¿Deseas eliminar todo el historial de vistos?",
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Limpiar", style: "destructive", onPress: clearAll },
      ]
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#030303" />

      <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
        <View style={styles.headerLeft}>
          <Text style={styles.screenTitle}>Recientes</Text>
          {items.length > 0 && (
            <View style={styles.countChip}>
              <Text style={styles.countChipText}>{items.length}</Text>
            </View>
          )}
        </View>
        {items.length > 0 && (
          <TouchableOpacity
            style={styles.clearBtn}
            onPress={confirmClearAll}
            activeOpacity={0.75}
          >
            <Feather name="trash-2" size={15} color="#5a5a5a" />
            <Text style={styles.clearBtnText}>Limpiar</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.center}>
          <View style={styles.loadingDots}>
            <View style={[styles.dot, { backgroundColor: "#e50914" }]} />
            <View style={[styles.dot, { backgroundColor: "rgba(229,9,20,0.5)" }]} />
            <View style={[styles.dot, { backgroundColor: "rgba(229,9,20,0.2)" }]} />
          </View>
        </View>
      ) : items.length === 0 ? (
        <View style={styles.center}>
          <View style={styles.emptyIconWrap}>
            <Feather name="clock" size={34} color="#2a2a2a" />
          </View>
          <Text style={styles.emptyTitle}>Sin historial</Text>
          <Text style={styles.emptyDesc}>
            El contenido que veas aparecerá aquí para que puedas retomarlo fácilmente.
          </Text>
          <TouchableOpacity
            style={styles.browseBtn}
            onPress={() => router.push("/(tabs)")}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={["#e50914", "#b00000"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.browseBtnGrad}
            >
              <Feather name="play-circle" size={15} color="#fff" />
              <Text style={styles.browseBtnText}>Explorar contenido</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item }) => (
            <RecentCard
              item={item}
              onPress={() => handlePress(item)}
              onRemove={() => remove(item.id)}
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#030303" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  screenTitle: {
    color: "#f0f0f0",
    fontSize: 26,
    fontFamily: "Inter_700Bold",
  },
  countChip: {
    backgroundColor: "rgba(229,9,20,0.12)",
    borderWidth: 1,
    borderColor: "rgba(229,9,20,0.25)",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  countChipText: {
    color: "#e50914",
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  clearBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  clearBtnText: {
    color: "#5a5a5a",
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  loadingDots: {
    flexDirection: "row",
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#0b0b0b",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    color: "#e2e2e2",
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    marginBottom: 8,
  },
  emptyDesc: {
    color: "#4a4a4a",
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 28,
  },
  browseBtn: {
    borderRadius: 10,
    overflow: "hidden",
    elevation: 4,
  },
  browseBtnGrad: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  browseBtnText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  separator: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.04)",
    marginVertical: 4,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 10,
  },
  thumb: {
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#111",
    flexShrink: 0,
  },
  thumbPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#141414",
    alignItems: "center",
    justifyContent: "center",
  },
  typePill: {
    position: "absolute",
    top: 6,
    left: 6,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  typePillText: {
    color: "#fff",
    fontSize: 7,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },
  thumbPlayWrap: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    top: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  cardInfo: {
    flex: 1,
    gap: 6,
  },
  cardTitle: {
    color: "#f0f0f0",
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    lineHeight: 18,
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  timeText: {
    color: "#5a5a5a",
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  watchAgainBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    backgroundColor: "rgba(229,9,20,0.08)",
    borderWidth: 1,
    borderColor: "rgba(229,9,20,0.2)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  watchAgainText: {
    color: "#e50914",
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  removeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
});
