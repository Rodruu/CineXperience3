import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
import { fetchMyContent } from "@/services/supabase";
import { ContentCard } from "@/components/ContentCard";
import type { Contenido } from "@/types";

const { width } = Dimensions.get("window");
const COLS = 2;
const GAP = 14;
const HPAD = 16;
const CARD_W = (width - HPAD * 2 - GAP) / COLS;

export default function SeriesScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const [search, setSearch] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);

  const { data: content = [], isLoading } = useQuery({
    queryKey: ["my-content", user?.id],
    queryFn: () => fetchMyContent(user!.id),
    enabled: !!user,
  });

  const series = useMemo(
    () => content.filter((c) => c.tipo === "serie"),
    [content]
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return series;
    const q = search.trim().toLowerCase();
    return series.filter((c) => c.titulo.toLowerCase().includes(q));
  }, [series, search]);

  function handlePress(item: Contenido) {
    router.push({
      pathname: "/player",
      params: {
        contenidoId: String(item.id),
        title: item.titulo,
        isSerie: "true",
        tmdbId: item.tmdb_id ? String(item.tmdb_id) : undefined,
        tipo: item.tipo,
        poster: item.poster ?? undefined,
      },
    });
  }

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
        <View style={styles.headerTop}>
          <View style={styles.titleRow}>
            <View style={styles.titleAccent} />
            <Text style={styles.screenTitle}>Series</Text>
          </View>
          {!isLoading && (
            <View style={styles.countChip}>
              <Feather name="tv" size={12} color="#6366f1" />
              <Text style={[styles.countChipText, { color: "#6366f1" }]}>{series.length}</Text>
            </View>
          )}
        </View>

        <View style={[styles.searchBar, searchFocused && styles.searchBarFocused]}>
          <Feather name="search" size={16} color={searchFocused ? "#6366f1" : "#5a5a5a"} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            placeholder="Buscar serie..."
            placeholderTextColor="#3a3a3a"
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Feather name="x-circle" size={15} color="#5a5a5a" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {isLoading ? (
        <View style={styles.skeletonWrap}>
          {Array.from({ length: 6 }).map((_, i) => (
            <View
              key={i}
              style={[styles.skeletonCard, { width: CARD_W, height: Math.round(CARD_W * 1.5) }]}
            />
          ))}
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconCircle}>
            <Feather name="tv" size={32} color="#2a2a2a" />
          </View>
          <Text style={styles.emptyTitle}>
            {search ? "Sin resultados" : "Sin series asignadas"}
          </Text>
          <Text style={styles.emptyDesc}>
            {search
              ? `No hay series con "${search}"`
              : "El administrador debe asignarte series primero."}
          </Text>
          {search ? (
            <TouchableOpacity style={styles.clearBtn} onPress={() => setSearch("")}>
              <Text style={styles.clearBtnText}>Limpiar búsqueda</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          numColumns={COLS}
          contentContainerStyle={[styles.grid, { paddingBottom: insets.bottom + 100 }]}
          columnWrapperStyle={styles.row}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            search.trim() ? (
              <View style={styles.resultsRow}>
                <Text style={styles.resultsText}>
                  {filtered.length} resultado{filtered.length !== 1 ? "s" : ""} ·{" "}
                  <Text style={{ color: "#6366f1" }}>{search}</Text>
                </Text>
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <ContentCard content={item} onPress={() => handlePress(item)} width={CARD_W} />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#030303" },
  header: {
    paddingHorizontal: HPAD,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.04)",
    gap: 12,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  titleAccent: { width: 3, height: 22, borderRadius: 2, backgroundColor: "#6366f1" },
  screenTitle: { color: "#f0f0f0", fontSize: 26, fontFamily: "Inter_700Bold" },
  countChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(99,102,241,0.1)",
    borderWidth: 1,
    borderColor: "rgba(99,102,241,0.2)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  countChipText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  searchBarFocused: {
    borderColor: "rgba(99,102,241,0.4)",
    backgroundColor: "rgba(99,102,241,0.03)",
  },
  searchInput: {
    flex: 1,
    color: "#f0f0f0",
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    padding: 0,
  },
  grid: { paddingHorizontal: HPAD, paddingTop: 16 },
  row: { gap: GAP, marginBottom: GAP },
  resultsRow: { marginBottom: 12 },
  resultsText: { color: "#5a5a5a", fontSize: 13, fontFamily: "Inter_400Regular" },
  skeletonWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: GAP,
    paddingHorizontal: HPAD,
    paddingTop: 16,
  },
  skeletonCard: { borderRadius: 12, backgroundColor: "rgba(255,255,255,0.04)" },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#0a0a0a",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  emptyTitle: {
    color: "#e2e2e2",
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
  },
  emptyDesc: {
    color: "#4a4a4a",
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
  },
  clearBtn: {
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  clearBtnText: { color: "#6a6a6a", fontSize: 13, fontFamily: "Inter_500Medium" },
});
