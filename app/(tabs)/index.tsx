import React, { useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Image,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { router, useFocusEffect } from "expo-router";
import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "@/context/AuthContext";
import { fetchMyContent } from "@/services/supabase";
import { FeaturedBanner } from "@/components/FeaturedBanner";
import { SectionRow } from "@/components/SectionRow";
import { DrawerMenu } from "@/components/DrawerMenu";
import { ReportErrorModal } from "@/components/ReportErrorModal";
import { useRecentlyWatched } from "@/hooks/useRecentlyWatched";
import type { Contenido } from "@/types";

const { width } = Dimensions.get("window");
const BANNER_MAX = 6;

function profilePhotoKey(userId: number) {
  return `cx_profile_photo_${userId}`;
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Buenos días";
  if (h < 18) return "Buenas tardes";
  return "Buenas noches";
}

export default function HomeScreen() {
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();

  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  const { items: recentItems, refresh: refreshRecent } = useRecentlyWatched();

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      AsyncStorage.getItem(profilePhotoKey(user.id))
        .then((val) => setPhotoUri(val || null))
        .catch(() => {});
      refreshRecent();
    }, [user, refreshRecent])
  );

  const { data: content = [], isLoading } = useQuery({
    queryKey: ["my-content", user?.id],
    queryFn: () => fetchMyContent(user!.id),
    enabled: !!user,
  });

  const bannerItems = useMemo(() => content.slice(0, BANNER_MAX), [content]);
  const movies = useMemo(() => content.filter((c) => c.tipo === "pelicula"), [content]);
  const series = useMemo(() => content.filter((c) => c.tipo === "serie"), [content]);

  function goToPlayer(item: Contenido) {
    if (item.tipo === "pelicula") {
      const episode = item.temporadas?.[0]?.episodios?.[0];
      if (episode) {
        router.push({
          pathname: "/player",
          params: {
            iframeUrl: episode.iframe_url,
            contenidoId: String(item.id),
            title: item.titulo,
            tmdbId: item.tmdb_id ? String(item.tmdb_id) : undefined,
            tipo: item.tipo,
            poster: item.poster ?? undefined,
          },
        });
      }
    } else {
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
  }

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  const HEADER_H = insets.top + 60;

  return (
    <View style={styles.root}>
      <StatusBar translucent barStyle="light-content" backgroundColor="transparent" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 110 }}
      >
        {isLoading ? (
          <View style={[styles.loadingBanner, { height: Math.round(width * 0.72) + HEADER_H }]}>
            <ActivityIndicator color="#e50914" size="large" />
          </View>
        ) : bannerItems.length > 0 ? (
          <View style={{ marginTop: 0 }}>
            <FeaturedBanner items={bannerItems} onPlay={goToPlayer} />
          </View>
        ) : null}

        <View style={{ marginTop: 8 }}>
          {user && (
            <View style={styles.greetRow}>
              <Text style={styles.greetText}>
                {getGreeting()},{" "}
                <Text style={styles.greetName}>{user.nombre}</Text>
              </Text>
              {content.length > 0 && (
                <View style={styles.contentCountChip}>
                  <Text style={styles.contentCountText}>{content.length} títulos</Text>
                </View>
              )}
            </View>
          )}

          {recentItems.length > 0 && (
            <SectionRow
              title="Vistos Recientemente"
              items={
                recentItems
                  .map((r) => content.find((c) => String(c.id) === r.contenidoId))
                  .filter((c): c is Contenido => !!c)
                  .slice(0, 8)
              }
              isLoading={false}
              onPressItem={goToPlayer}
              onVerMas={() => router.push("/(tabs)/recent")}
              accentColor="#6366f1"
            />
          )}

          {(isLoading || movies.length > 0) && (
            <SectionRow
              title="Mis Películas"
              items={movies}
              isLoading={isLoading}
              onPressItem={goToPlayer}
              onVerMas={() => router.push("/(tabs)/movies")}
              accentColor="#e50914"
            />
          )}

          {(isLoading || series.length > 0) && (
            <SectionRow
              title="Mis Series"
              items={series}
              isLoading={isLoading}
              onPressItem={goToPlayer}
              onVerMas={() => router.push("/(tabs)/series")}
              accentColor="#6366f1"
            />
          )}

          {!isLoading && content.length === 0 && (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconWrap}>
                <Feather name="inbox" size={36} color="#2a2a2a" />
              </View>
              <Text style={styles.emptyTitle}>Sin contenido asignado</Text>
              <Text style={styles.emptyDesc}>
                El administrador debe asignarte contenido para que aparezca aquí.
              </Text>
              <TouchableOpacity
                style={styles.reportBtn}
                onPress={() => setReportOpen(true)}
                activeOpacity={0.8}
              >
                <Feather name="alert-triangle" size={14} color="#f59e0b" />
                <Text style={styles.reportBtnText}>Reportar al administrador</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Floating header — rendered last so it sits on top */}
      <View style={[styles.header, { paddingTop: insets.top + 10, pointerEvents: 'box-none' }]}>
        <LinearGradient
          colors={["rgba(3,3,3,0.88)", "rgba(3,3,3,0.5)", "transparent"]}
          locations={[0, 0.65, 1]}
          style={[StyleSheet.absoluteFill, { pointerEvents: "none" }]}
        />
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => setDrawerOpen(true)}
          activeOpacity={0.75}
        >
          <Feather name="menu" size={22} color="#e2e2e2" />
        </TouchableOpacity>

        <View style={styles.brand}>
          <Text style={styles.brandName}>CINE</Text>
          <Text style={styles.brandSub}>XPERIENCE</Text>
        </View>

        <TouchableOpacity
          onPress={() => router.push("/(tabs)/profile")}
          style={styles.avatarBtn}
          activeOpacity={0.8}
        >
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.avatarImg} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitial}>
                {user?.nombre?.charAt(0)?.toUpperCase() ?? "?"}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <DrawerMenu
        visible={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onReportError={() => setReportOpen(true)}
        onLogout={handleLogout}
        userName={user?.nombre}
        photoUri={photoUri}
      />

      <ReportErrorModal
        visible={reportOpen}
        onClose={() => setReportOpen(false)}
        userName={user?.nombre}
        content={content}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#030303" },

  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingBottom: 14,
    zIndex: 20,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  brand: { alignItems: "center" },
  brandName: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: "#e50914",
    letterSpacing: 5,
    lineHeight: 24,
  },
  brandSub: {
    fontSize: 7,
    fontFamily: "Inter_400Regular",
    color: "rgba(226,226,226,0.45)",
    letterSpacing: 7,
  },
  avatarBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "rgba(229,9,20,0.5)",
    elevation: 4,
  },
  avatarImg: { width: 38, height: 38 },
  avatarPlaceholder: {
    width: 38,
    height: 38,
    backgroundColor: "#1a0000",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    color: "#e50914",
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },

  greetRow: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  greetText: {
    color: "#5a5a5a",
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  greetName: {
    color: "#e2e2e2",
    fontFamily: "Inter_600SemiBold",
  },
  contentCountChip: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  contentCountText: {
    color: "#4a4a4a",
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },

  loadingBanner: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0a0a0a",
  },

  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#0b0b0b",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  emptyTitle: {
    color: "#e2e2e2",
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
  },
  emptyDesc: {
    color: "#5a5a5a",
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
  },
  reportBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 20,
    backgroundColor: "rgba(245,158,11,0.1)",
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.25)",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  reportBtnText: {
    color: "#f59e0b",
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
});
