import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  Image,
  Linking,
  StatusBar,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "@/context/AuthContext";
import { fetchMySessions, revokeSession, fetchMyContent } from "@/services/supabase";
import { ReportErrorModal } from "@/components/ReportErrorModal";

const WHATSAPP_NUMBER = "543813337442";

function profilePhotoKey(userId: number) {
  return `cx_profile_photo_${userId}`;
}

function StatCard({ value, label, icon, color }: { value: string | number; label: string; icon: string; color: string }) {
  return (
    <View style={[styles.statCard, { borderColor: `${color}22` }]}>
      <LinearGradient
        colors={[`${color}10`, "transparent"]}
        style={styles.statCardGrad}
      />
      <View style={[styles.statIcon, { backgroundColor: `${color}15` }]}>
        <Feather name={icon as any} size={16} color={color} />
      </View>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function MenuRow({
  icon,
  label,
  value,
  color,
  onPress,
  danger,
}: {
  icon: string;
  label: string;
  value?: string;
  color?: string;
  onPress?: () => void;
  danger?: boolean;
}) {
  const iconColor = danger ? "#ef4444" : color ?? "#5a5a5a";
  const labelColor = danger ? "#ef4444" : "#d4d4d4";

  return (
    <TouchableOpacity
      style={styles.menuRow}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      <View style={[styles.menuIconWrap, { backgroundColor: `${iconColor}15` }]}>
        <Feather name={icon as any} size={16} color={iconColor} />
      </View>
      <Text style={[styles.menuLabel, { color: labelColor }]}>{label}</Text>
      {value ? (
        <Text style={styles.menuValue}>{value}</Text>
      ) : onPress ? (
        <Feather name="chevron-right" size={15} color="rgba(255,255,255,0.15)" />
      ) : null}
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    AsyncStorage.getItem(profilePhotoKey(user.id))
      .then((val) => { if (val) setPhotoUri(val); })
      .catch(() => {});
  }, [user]);

  const { data: sessions = [], isLoading: sessionsLoading } = useQuery({
    queryKey: ["sessions", user?.id],
    queryFn: () => fetchMySessions(user!.id),
    enabled: !!user,
  });

  const { data: content = [] } = useQuery({
    queryKey: ["my-content", user?.id],
    queryFn: () => fetchMyContent(user!.id),
    enabled: !!user,
  });

  const revokeMutation = useMutation({
    mutationFn: revokeSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions", user?.id] });
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    },
  });

  const handlePickPhoto = useCallback(async () => {
    if (!user) return;
    try {
      if (Platform.OS !== "web") {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Permiso requerido", "Necesitamos acceso a tu galería para cambiar la foto.");
          return;
        }
      }
      setPhotoLoading(true);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.6,
        base64: true,
      });
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const dataUri = asset.base64
          ? `data:image/jpeg;base64,${asset.base64}`
          : asset.uri;
        setPhotoUri(dataUri);
        await AsyncStorage.setItem(profilePhotoKey(user.id), dataUri);
        if (Platform.OS !== "web") {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      }
    } catch {
      Alert.alert("Error", "No se pudo cambiar la foto. Intenta de nuevo.");
    } finally {
      setPhotoLoading(false);
    }
  }, [user]);

  const handleRemovePhoto = useCallback(async () => {
    if (!user) return;
    setPhotoUri(null);
    await AsyncStorage.removeItem(profilePhotoKey(user.id));
  }, [user]);

  async function handleLogout() {
    if (Platform.OS !== "web") {
      Alert.alert("Cerrar sesión", "Tu sesión se cerrará en este dispositivo.", [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Salir",
          style: "destructive",
          onPress: async () => { await logout(); router.replace("/login"); },
        },
      ]);
    } else {
      await logout();
      router.replace("/login");
    }
  }

  function handleRevokeSession(sessionId: number) {
    if (Platform.OS !== "web") {
      Alert.alert("Cerrar sesión", "Se cerrará esa sesión en ese dispositivo.", [
        { text: "Cancelar", style: "cancel" },
        { text: "Cerrar", style: "destructive", onPress: () => revokeMutation.mutate(sessionId) },
      ]);
    } else {
      revokeMutation.mutate(sessionId);
    }
  }

  async function openWhatsApp() {
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Hola, necesito ayuda con Cine Xperience.")}`;
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert("Error", "No se pudo abrir WhatsApp.");
    }
  }

  function formatDate(iso: string) {
    try {
      return new Date(iso).toLocaleString("es-ES", {
        day: "2-digit", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      });
    } catch { return iso; }
  }

  const initial = user?.nombre?.charAt(0)?.toUpperCase() ?? "?";
  const moviesCount = content.filter((c) => c.tipo === "pelicula").length;
  const seriesCount = content.filter((c) => c.tipo === "serie").length;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#030303" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>

        {/* Hero header */}
        <LinearGradient
          colors={["#1a0000", "#0f0000", "#030303"]}
          locations={[0, 0.55, 1]}
          style={[styles.heroHeader, { paddingTop: insets.top + 16 }]}
        >
          <View style={styles.heroTopRow}>
            <Text style={styles.screenTitle}>Mi Perfil</Text>
            <TouchableOpacity
              style={styles.editAvatarBtn}
              onPress={handlePickPhoto}
              activeOpacity={0.75}
            >
              <Feather name="camera" size={14} color="#e50914" />
              <Text style={styles.editAvatarText}>Cambiar foto</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.avatarSection}>
            <View style={styles.avatarWrapper}>
              <TouchableOpacity
                style={styles.avatarTouch}
                onPress={handlePickPhoto}
                activeOpacity={0.8}
                disabled={photoLoading}
              >
                {photoUri ? (
                  <Image source={{ uri: photoUri }} style={styles.avatarImg} />
                ) : (
                  <View style={styles.avatarBg}>
                    <Text style={styles.avatarLetter}>{initial}</Text>
                  </View>
                )}
                <View style={styles.cameraOverlay}>
                  {photoLoading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Feather name="camera" size={14} color="#fff" />
                  )}
                </View>
              </TouchableOpacity>

              {photoUri && !photoLoading && (
                <TouchableOpacity style={styles.removePhotoBtn} onPress={handleRemovePhoto}>
                  <Feather name="x" size={10} color="#fff" />
                </TouchableOpacity>
              )}
            </View>

            <Text style={styles.userName}>{user?.nombre ?? "Usuario"}</Text>

            <View style={styles.activeTag}>
              <View style={styles.activeDot} />
              <Text style={styles.activeText}>Sesión activa</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <StatCard value={moviesCount} label="Películas" icon="film" color="#e50914" />
          <StatCard value={seriesCount} label="Series" icon="tv" color="#6366f1" />
          <StatCard value={sessions.length} label="Sesiones" icon="smartphone" color="#22c55e" />
        </View>

        {/* Navigation section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>NAVEGACIÓN</Text>
          <View style={styles.menuCard}>
            <MenuRow
              icon="film"
              label="Mis Películas"
              value={`${moviesCount}`}
              color="#e50914"
              onPress={() => router.push("/(tabs)/movies")}
            />
            <View style={styles.menuDivider} />
            <MenuRow
              icon="tv"
              label="Mis Series"
              value={`${seriesCount}`}
              color="#6366f1"
              onPress={() => router.push("/(tabs)/series")}
            />
            <View style={styles.menuDivider} />
            <MenuRow
              icon="clock"
              label="Vistos Recientemente"
              color="#f59e0b"
              onPress={() => router.push("/(tabs)/recent")}
            />
          </View>
        </View>

        {/* Support section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>SOPORTE</Text>
          <View style={styles.menuCard}>
            <MenuRow
              icon="alert-triangle"
              label="Reportar un error"
              color="#f59e0b"
              onPress={() => setReportOpen(true)}
            />
            <View style={styles.menuDivider} />
            <MenuRow
              icon="message-circle"
              label="Contactar al administrador"
              color="#25d366"
              onPress={openWhatsApp}
            />
          </View>
        </View>

        {/* Active sessions */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionLabel}>DISPOSITIVOS ACTIVOS</Text>
            <View style={styles.sessionCountBadge}>
              <Text style={styles.sessionCountText}>{sessions.length}/3</Text>
            </View>
          </View>
          <Text style={styles.sectionSubLabel}>Máximo 3 sesiones simultáneas</Text>

          {sessionsLoading ? (
            <ActivityIndicator color="#e50914" style={{ marginTop: 16 }} />
          ) : sessions.length === 0 ? (
            <View style={styles.noSessions}>
              <Feather name="monitor" size={24} color="#2a2a2a" />
              <Text style={styles.noSessionsText}>Sin sesiones registradas</Text>
            </View>
          ) : (
            <View style={styles.menuCard}>
              {sessions.map((session, idx) => (
                <View key={session.id}>
                  {idx > 0 && <View style={styles.menuDivider} />}
                  <View style={styles.sessionRow}>
                    <View style={styles.sessionIconWrap}>
                      <Feather name="smartphone" size={15} color="#5a5a5a" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.sessionDevice} numberOfLines={1}>
                        {session.device_label?.substring(0, 50) ?? "Dispositivo"}
                      </Text>
                      <Text style={styles.sessionDate}>{formatDate(session.last_seen)}</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleRevokeSession(session.id)}
                      style={styles.revokeBtn}
                      disabled={revokeMutation.isPending}
                    >
                      <Feather name="x-circle" size={18} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* App info */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>APLICACIÓN</Text>
          <View style={styles.menuCard}>
            <MenuRow icon="shield" label="Tipo" value="Privada · Solo Android" color="#6366f1" />
            <View style={styles.menuDivider} />
            <MenuRow icon="package" label="Versión" value="1.0.0" color="#22c55e" />
            <View style={styles.menuDivider} />
            <MenuRow icon="lock" label="Distribución" value="No disponible en tiendas" color="#f59e0b" />
          </View>
        </View>

        {/* Logout */}
        <View style={[styles.section, { marginTop: 8 }]}>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
            <Feather name="log-out" size={17} color="#ef4444" />
            <Text style={styles.logoutText}>Cerrar sesión</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.versionFooter}>Cine Xperience v1.0 · App Privada</Text>
      </ScrollView>

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

  heroHeader: {
    paddingHorizontal: 16,
    paddingBottom: 28,
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  screenTitle: { color: "#e2e2e2", fontSize: 24, fontFamily: "Inter_700Bold" },
  editAvatarBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(229,9,20,0.1)",
    borderWidth: 1,
    borderColor: "rgba(229,9,20,0.2)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  editAvatarText: { color: "#e50914", fontSize: 11, fontFamily: "Inter_500Medium" },

  avatarSection: { alignItems: "center" },
  avatarWrapper: { position: "relative", marginBottom: 12 },
  avatarTouch: {
    width: 92,
    height: 92,
    borderRadius: 46,
    overflow: "hidden",
    borderWidth: 2.5,
    borderColor: "rgba(229,9,20,0.55)",
    elevation: 8,
  },
  avatarImg: { width: "100%", height: "100%" },
  avatarBg: {
    width: "100%",
    height: "100%",
    backgroundColor: "#1a0000",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLetter: { color: "#e50914", fontSize: 38, fontFamily: "Inter_700Bold" },
  cameraOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 28,
    backgroundColor: "rgba(0,0,0,0.65)",
    alignItems: "center",
    justifyContent: "center",
  },
  removePhotoBtn: {
    position: "absolute",
    top: 0,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#ef4444",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#030303",
  },
  userName: { color: "#f5f5f5", fontSize: 20, fontFamily: "Inter_700Bold", marginBottom: 8 },
  activeTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(34,197,94,0.1)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  activeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#22c55e" },
  activeText: { color: "#22c55e", fontSize: 11, fontFamily: "Inter_500Medium" },

  statsRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 10,
    marginTop: -2,
    marginBottom: 4,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#0b0b0b",
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 8,
    gap: 4,
    overflow: "hidden",
  },
  statCardGrad: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 14,
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  statValue: { fontSize: 20, fontFamily: "Inter_700Bold" },
  statLabel: {
    color: "#5a5a5a",
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  section: { paddingHorizontal: 16, marginTop: 20 },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  sectionLabel: {
    color: "#3a3a3a",
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  sectionSubLabel: {
    color: "#2a2a2a",
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: -4,
    marginBottom: 10,
  },
  sessionCountBadge: {
    backgroundColor: "rgba(229,9,20,0.12)",
    borderWidth: 1,
    borderColor: "rgba(229,9,20,0.25)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginBottom: 4,
  },
  sessionCountText: { color: "#e50914", fontSize: 11, fontFamily: "Inter_600SemiBold" },

  menuCard: {
    backgroundColor: "#0b0b0b",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    overflow: "hidden",
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 12,
  },
  menuIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  menuLabel: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium" },
  menuValue: { color: "#5a5a5a", fontSize: 12, fontFamily: "Inter_400Regular" },
  menuDivider: { height: 1, backgroundColor: "rgba(255,255,255,0.04)", marginHorizontal: 14 },

  noSessions: {
    alignItems: "center",
    paddingVertical: 24,
    gap: 8,
    backgroundColor: "#0b0b0b",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  noSessionsText: { color: "#3a3a3a", fontSize: 13, fontFamily: "Inter_400Regular" },
  sessionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  sessionIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.04)",
    alignItems: "center",
    justifyContent: "center",
  },
  sessionDevice: { color: "#e2e2e2", fontSize: 13, fontFamily: "Inter_500Medium" },
  sessionDate: { color: "#5a5a5a", fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  revokeBtn: { padding: 4 },

  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "rgba(239,68,68,0.07)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.16)",
    height: 52,
  },
  logoutText: { color: "#ef4444", fontSize: 15, fontFamily: "Inter_600SemiBold" },
  versionFooter: {
    color: "#1e1e1e",
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    marginTop: 24,
  },
});
