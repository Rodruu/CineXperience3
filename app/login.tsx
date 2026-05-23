import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
  withSequence,
  withRepeat,
  Easing,
  interpolate,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/context/AuthContext";
import type { Sesion } from "@/types";

const { width, height } = Dimensions.get("window");

export default function LoginScreen() {
  const { login } = useAuth();
  const insets = useSafeAreaInsets();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usernameFocused, setUsernameFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const [deviceLimitModal, setDeviceLimitModal] = useState(false);
  const [limitedSessions, setLimitedSessions] = useState<
    Pick<Sesion, "id" | "device_label" | "last_seen">[]
  >([]);

  const logoOpacity = useSharedValue(0);
  const logoTranslateY = useSharedValue(30);
  const formOpacity = useSharedValue(0);
  const formTranslateY = useSharedValue(40);
  const glowScale = useSharedValue(1);
  const btnScale = useSharedValue(1);
  const errorShake = useSharedValue(0);

  useEffect(() => {
    const easeOut = Easing.bezier(0.16, 1, 0.3, 1);
    const easeInOut = Easing.bezier(0.45, 0, 0.55, 1);

    logoOpacity.value = withDelay(200, withTiming(1, { duration: 800, easing: easeOut }));
    logoTranslateY.value = withDelay(200, withTiming(0, { duration: 800, easing: easeOut }));
    formOpacity.value = withDelay(600, withTiming(1, { duration: 700, easing: easeOut }));
    formTranslateY.value = withDelay(600, withTiming(0, { duration: 700, easing: easeOut }));
    glowScale.value = withRepeat(
      withSequence(
        withTiming(1.15, { duration: 2800, easing: easeInOut }),
        withTiming(1, { duration: 2800, easing: easeInOut })
      ),
      -1,
      false
    );
  }, []);

  const logoAnimStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ translateY: logoTranslateY.value }],
  }));

  const formAnimStyle = useAnimatedStyle(() => ({
    opacity: formOpacity.value,
    transform: [{ translateY: formTranslateY.value }],
  }));

  const glowAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: glowScale.value }],
    opacity: interpolate(glowScale.value, [1, 1.15], [0.35, 0.18]),
  }));

  const btnAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: btnScale.value }],
  }));

  const errorAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: errorShake.value }],
  }));

  function triggerShake() {
    errorShake.value = withSequence(
      withTiming(-10, { duration: 60 }),
      withTiming(10, { duration: 60 }),
      withTiming(-8, { duration: 60 }),
      withTiming(8, { duration: 60 }),
      withTiming(0, { duration: 60 })
    );
  }

  async function handleLogin() {
    if (!username.trim() || !password.trim()) {
      triggerShake();
      setError("Completa usuario y contraseña.");
      return;
    }

    setError(null);
    setIsLoading(true);
    btnScale.value = withTiming(0.97, { duration: 100 });

    try {
      const result = await login(username.trim(), password.trim());

      if (result.type === "success") {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        btnScale.value = withSpring(1);
        router.replace("/(tabs)");
      } else if (result.type === "device_limit") {
        setLimitedSessions(result.sessions);
        setDeviceLimitModal(true);
        btnScale.value = withSpring(1);
      } else {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        triggerShake();
        setError(result.message ?? "Credenciales incorrectas.");
        btnScale.value = withSpring(1);
      }
    } catch {
      triggerShake();
      setError("Error de conexion. Verifica tu internet.");
      btnScale.value = withSpring(1);
    } finally {
      setIsLoading(false);
    }
  }

  function formatDate(iso: string) {
    try {
      return new Date(iso).toLocaleString("es-ES", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return iso;
    }
  }

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={["#0a0000", "#030303", "#030303", "#0a0000"]}
        locations={[0, 0.3, 0.7, 1]}
        style={StyleSheet.absoluteFill}
      />

      <Animated.View style={[styles.glow, glowAnimStyle]} pointerEvents="none" />
      <Animated.View style={[styles.glowBottom, glowAnimStyle]} pointerEvents="none" />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={[styles.logoSection, logoAnimStyle]}>
            <View style={styles.iconContainer}>
              <View style={styles.iconGlow} />
              <Image
                source={require("../assets/images/icon.png")}
                style={styles.iconImage}
                resizeMode="cover"
              />
            </View>
            <Text style={styles.appName}>CINE XPERIENCE</Text>
            <View style={styles.nameDivider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerDot}>◆</Text>
              <View style={styles.dividerLine} />
            </View>
            <Text style={styles.tagline}>Tu cine privado, siempre contigo</Text>
          </Animated.View>

          <Animated.View style={[styles.formCard, formAnimStyle]}>
            <BlurView intensity={18} tint="dark" style={StyleSheet.absoluteFill} />
            <View style={styles.formInner}>
              <Text style={styles.formTitle}>Iniciar sesión</Text>

              <View
                style={[
                  styles.inputWrapper,
                  usernameFocused && styles.inputWrapperFocused,
                ]}
              >
                <Feather
                  name="user"
                  size={16}
                  color={usernameFocused ? "#e50914" : "#4a4a4a"}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  value={username}
                  onChangeText={(t) => {
                    setUsername(t);
                    setError(null);
                  }}
                  onFocus={() => setUsernameFocused(true)}
                  onBlur={() => setUsernameFocused(false)}
                  placeholder="Usuario"
                  placeholderTextColor="#303030"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <View
                style={[
                  styles.inputWrapper,
                  passwordFocused && styles.inputWrapperFocused,
                ]}
              >
                <Feather
                  name="lock"
                  size={16}
                  color={passwordFocused ? "#e50914" : "#4a4a4a"}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={password}
                  onChangeText={(t) => {
                    setPassword(t);
                    setError(null);
                  }}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                  placeholder="Contraseña"
                  placeholderTextColor="#303030"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Feather
                    name={showPassword ? "eye-off" : "eye"}
                    size={16}
                    color={passwordFocused ? "#e50914" : "#4a4a4a"}
                  />
                </TouchableOpacity>
              </View>

              {error ? (
                <Animated.View style={[styles.errorBox, errorAnimStyle]}>
                  <Feather name="alert-circle" size={13} color="#ef4444" />
                  <Text style={styles.errorText}>{error}</Text>
                </Animated.View>
              ) : null}

              <Animated.View style={[styles.loginBtnWrapper, btnAnimStyle]}>
                <TouchableOpacity
                  onPress={handleLogin}
                  disabled={isLoading}
                  activeOpacity={0.9}
                  style={{ borderRadius: 12, overflow: "hidden" }}
                >
                  <LinearGradient
                    colors={
                      isLoading
                        ? ["#8b0000", "#6b0000"]
                        : ["#ff1a1a", "#e50914", "#b00000"]
                    }
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.loginBtnGradient}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="#ffffff" size="small" />
                    ) : (
                      <>
                        <Feather
                          name="play-circle"
                          size={18}
                          color="#ffffff"
                          style={{ marginRight: 8 }}
                        />
                        <Text style={styles.loginBtnText}>Entrar</Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>

              <View style={styles.separator}>
                <View style={styles.separatorLine} />
              </View>

              <View style={styles.footerRow}>
                <Feather name="shield" size={12} color="#2a2a2a" />
                <Text style={styles.contactText}>
                  ¿Olvidaste tu contraseña? Contacta al administrador.
                </Text>
              </View>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={deviceLimitModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={styles.modalCard}>
            <LinearGradient
              colors={["#1a0000", "#0d0d0d"]}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.modalIconWrapper}>
              <LinearGradient
                colors={["#f59e0b33", "#f59e0b11"]}
                style={styles.modalIconBg}
              >
                <Feather name="alert-triangle" size={24} color="#f59e0b" />
              </LinearGradient>
            </View>
            <Text style={styles.modalTitle}>Límite de dispositivos</Text>
            <Text style={styles.modalDesc}>
              Tu cuenta ha alcanzado el límite de 3 sesiones activas simultáneas.
            </Text>

            <FlatList
              data={limitedSessions}
              keyExtractor={(s) => String(s.id)}
              scrollEnabled={false}
              style={{ width: "100%", marginBottom: 4 }}
              renderItem={({ item }) => (
                <View style={styles.sessionRow}>
                  <View style={styles.sessionIconWrap}>
                    <Feather name="monitor" size={13} color="#e50914" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sessionDevice} numberOfLines={1}>
                      {item.device_label?.substring(0, 40) ?? "Dispositivo"}
                    </Text>
                    <Text style={styles.sessionDate}>{formatDate(item.last_seen)}</Text>
                  </View>
                </View>
              )}
            />

            <TouchableOpacity
              style={styles.modalBtn}
              onPress={() => setDeviceLimitModal(false)}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={["#e50914", "#b00000"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.modalBtnGradient}
              >
                <Text style={styles.loginBtnText}>Entendido</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#030303",
  },
  glow: {
    position: "absolute",
    top: -height * 0.1,
    left: width * 0.5 - 180,
    width: 360,
    height: 360,
    borderRadius: 180,
    backgroundColor: "#e50914",
    opacity: 0.3,
  },
  glowBottom: {
    position: "absolute",
    bottom: -height * 0.05,
    right: width * 0.5 - 120,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: "#8b0000",
    opacity: 0.2,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  logoSection: {
    alignItems: "center",
    marginBottom: 36,
  },
  iconContainer: {
    position: "relative",
    marginBottom: 20,
  },
  iconGlow: {
    position: "absolute",
    top: -8,
    left: -8,
    right: -8,
    bottom: -8,
    borderRadius: 36,
    backgroundColor: "#e50914",
    opacity: 0.25,
  },
  iconImage: {
    width: 90,
    height: 90,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: "rgba(229,9,20,0.4)",
  },
  appName: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: "#f0f0f0",
    letterSpacing: 6,
    marginBottom: 12,
  },
  nameDivider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  dividerLine: {
    width: 40,
    height: 1,
    backgroundColor: "rgba(229,9,20,0.4)",
  },
  dividerDot: {
    color: "#e50914",
    fontSize: 8,
  },
  tagline: {
    color: "#404040",
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  formCard: {
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  formInner: {
    padding: 24,
  },
  formTitle: {
    color: "#c0c0c0",
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    letterSpacing: 2,
    textTransform: "uppercase",
    textAlign: "center",
    marginBottom: 24,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    paddingHorizontal: 14,
    height: 52,
    marginBottom: 12,
  },
  inputWrapperFocused: {
    borderColor: "rgba(229,9,20,0.5)",
    backgroundColor: "rgba(229,9,20,0.04)",
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: "#e2e2e2",
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  eyeBtn: {
    padding: 4,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "rgba(239,68,68,0.08)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.2)",
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  errorText: {
    color: "#ef4444",
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    flex: 1,
  },
  loginBtnWrapper: {
    marginTop: 4,
    borderRadius: 12,
    shadowColor: "#e50914",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  loginBtnGradient: {
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  loginBtnText: {
    color: "#ffffff",
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.8,
  },
  separator: {
    alignItems: "center",
    marginVertical: 20,
  },
  separatorLine: {
    width: "100%",
    height: 1,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  contactText: {
    color: "#303030",
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalCard: {
    borderRadius: 24,
    marginHorizontal: 12,
    marginBottom: 12,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    alignItems: "center",
    overflow: "hidden",
  },
  modalIconWrapper: {
    marginBottom: 16,
  },
  modalIconBg: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: {
    color: "#e2e2e2",
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    marginBottom: 8,
    textAlign: "center",
  },
  modalDesc: {
    color: "#4a4a4a",
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 20,
  },
  sessionRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    padding: 12,
    marginBottom: 8,
    gap: 10,
  },
  sessionIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(229,9,20,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  sessionDevice: {
    color: "#c0c0c0",
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  sessionDate: {
    color: "#404040",
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  modalBtn: {
    borderRadius: 12,
    overflow: "hidden",
    width: "100%",
    marginTop: 8,
  },
  modalBtnGradient: {
    height: 50,
    alignItems: "center",
    justifyContent: "center",
  },
});
