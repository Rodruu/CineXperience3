import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Modal,
  BackHandler,
  Platform,
  Image,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';

const DRAWER_W = 300;
const USE_NATIVE = Platform.OS !== 'web';

interface DrawerMenuProps {
  visible: boolean;
  onClose: () => void;
  onReportError: () => void;
  onLogout: () => void;
  userName?: string;
  photoUri?: string | null;
}

interface MenuItemProps {
  icon: string;
  label: string;
  onPress: () => void;
  danger?: boolean;
  accent?: string;
  badge?: string;
}

function MenuItem({ icon, label, onPress, danger, accent, badge }: MenuItemProps) {
  const color = danger ? '#ef4444' : accent ?? '#d4d4d4';
  const iconBg = danger
    ? 'rgba(239,68,68,0.12)'
    : accent
    ? `${accent}1a`
    : 'rgba(255,255,255,0.06)';

  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.65}>
      <View style={[styles.menuIconWrap, { backgroundColor: iconBg }]}>
        <Feather name={icon as any} size={17} color={color} />
      </View>
      <Text style={[styles.menuLabel, { color }]}>{label}</Text>
      {badge ? (
        <View style={styles.menuBadge}>
          <Text style={styles.menuBadgeText}>{badge}</Text>
        </View>
      ) : !danger ? (
        <Feather name="chevron-right" size={15} color="rgba(255,255,255,0.15)" />
      ) : null}
    </TouchableOpacity>
  );
}

function AboutSection() {
  return (
    <View style={styles.aboutBox}>
      <View style={styles.aboutLogoRow}>
        <View style={styles.aboutDot} />
        <Text style={styles.aboutLogoText}>CINE XPERIENCE</Text>
        <View style={styles.aboutDot} />
      </View>
      <Text style={styles.aboutVersion}>Versión 1.0</Text>
      <Text style={styles.aboutDesc}>Aplicación privada de streaming.</Text>
      <Text style={styles.aboutDesc}>No disponible en tiendas.</Text>
      <Text style={styles.aboutDesc2}>Solo Android · Uso exclusivo</Text>
    </View>
  );
}

export function DrawerMenu({
  visible,
  onClose,
  onReportError,
  onLogout,
  userName,
  photoUri,
}: DrawerMenuProps) {
  const insets = useSafeAreaInsets();
  const slideX = useRef(new Animated.Value(-DRAWER_W)).current;
  const fadeOp = useRef(new Animated.Value(0)).current;
  const [showAbout, setShowAbout] = useState(false);
  const [isRendered, setIsRendered] = useState(false);

  useEffect(() => {
    if (visible) {
      setIsRendered(true);
      setShowAbout(false);
      Animated.parallel([
        Animated.spring(slideX, {
          toValue: 0,
          useNativeDriver: USE_NATIVE,
          speed: 22,
          bounciness: 2,
        }),
        Animated.timing(fadeOp, { toValue: 1, duration: 220, useNativeDriver: USE_NATIVE }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideX, { toValue: -DRAWER_W, duration: 210, useNativeDriver: USE_NATIVE }),
        Animated.timing(fadeOp, { toValue: 0, duration: 210, useNativeDriver: USE_NATIVE }),
      ]).start(() => setIsRendered(false));
    }
  }, [visible]);

  useEffect(() => {
    if (Platform.OS === 'android') {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        if (visible) {
          onClose();
          return true;
        }
        return false;
      });
      return () => sub.remove();
    }
  }, [visible, onClose]);

  if (!isRendered && !visible) return null;

  const initial = userName?.charAt(0)?.toUpperCase() ?? '?';

  function nav(path: string) {
    onClose();
    setTimeout(() => router.push(path as any), 50);
  }

  return (
    <Modal visible={isRendered} transparent onRequestClose={onClose} animationType="none" statusBarTranslucent>
      <View style={StyleSheet.absoluteFill}>
        <Animated.View style={[styles.overlay, { opacity: fadeOp }]}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
        </Animated.View>

        <Animated.View
          style={[
            styles.drawer,
            { transform: [{ translateX: slideX }], paddingTop: insets.top },
          ]}
        >
          <LinearGradient
            colors={['#1a0000', '#2d0000', '#0a0a0a']}
            locations={[0, 0.4, 1]}
            style={styles.drawerHeader}
          >
            <View style={styles.avatarWrap}>
              {photoUri ? (
                <Image source={{ uri: photoUri }} style={styles.drawerAvatar} />
              ) : (
                <View style={styles.avatarInitial}>
                  <Text style={styles.avatarInitialText}>{initial}</Text>
                </View>
              )}
              <View style={styles.onlineDot} />
            </View>
            <Text style={styles.drawerName} numberOfLines={1}>
              {userName ?? 'Usuario'}
            </Text>
            <View style={styles.premiumTag}>
              <Feather name="shield" size={10} color="#e50914" />
              <Text style={styles.premiumTagText}>Acceso Premium</Text>
            </View>
          </LinearGradient>

          <ScrollView style={styles.drawerBody} showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionLabel}>NAVEGACIÓN</Text>
            <MenuItem icon="home" label="Inicio" onPress={() => nav('/(tabs)')} />
            <MenuItem icon="film" label="Películas" onPress={() => nav('/(tabs)/movies')} />
            <MenuItem icon="tv" label="Series" onPress={() => nav('/(tabs)/series')} />
            <MenuItem icon="clock" label="Recientes" accent="#f59e0b" onPress={() => nav('/(tabs)/recent')} />
            <MenuItem icon="user" label="Mi Perfil" onPress={() => nav('/(tabs)/profile')} />

            <View style={styles.sep} />

            <Text style={styles.sectionLabel}>SOPORTE</Text>
            <MenuItem
              icon="alert-triangle"
              label="Reportar Error"
              accent="#f59e0b"
              onPress={() => { onClose(); setTimeout(onReportError, 100); }}
              badge="!"
            />
            <MenuItem
              icon="info"
              label="Acerca de la App"
              accent="#6366f1"
              onPress={() => setShowAbout(!showAbout)}
            />

            {showAbout && <AboutSection />}

            <View style={styles.sep} />

            <MenuItem
              icon="log-out"
              label="Cerrar Sesión"
              onPress={() => { onClose(); setTimeout(onLogout, 50); }}
              danger
            />
          </ScrollView>

          <View style={[styles.drawerFooter, { paddingBottom: insets.bottom + 12 }]}>
            <Text style={styles.footerText}>🎬 Cine Xperience · App Privada</Text>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.72)',
  },
  drawer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: DRAWER_W,
    backgroundColor: '#080808',
    borderRightWidth: 1,
    borderRightColor: 'rgba(229,9,20,0.15)',
  },
  drawerHeader: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 22,
  },
  avatarWrap: {
    marginBottom: 12,
    position: 'relative',
    alignSelf: 'flex-start',
  },
  drawerAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: 'rgba(229,9,20,0.6)',
  },
  avatarInitial: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#1a0000',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(229,9,20,0.5)',
  },
  avatarInitialText: {
    color: '#e50914',
    fontSize: 26,
    fontFamily: 'Inter_700Bold',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#22c55e',
    borderWidth: 2,
    borderColor: '#080808',
  },
  drawerName: {
    color: '#f5f5f5',
    fontSize: 17,
    fontFamily: 'Inter_700Bold',
    marginBottom: 6,
  },
  premiumTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(229,9,20,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(229,9,20,0.2)',
  },
  premiumTagText: {
    color: '#e50914',
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.3,
  },
  drawerBody: {
    flex: 1,
    paddingTop: 8,
  },
  sectionLabel: {
    color: '#3a3a3a',
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 1.5,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 11,
    gap: 12,
  },
  menuIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
  },
  menuBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#f59e0b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuBadgeText: {
    color: '#000',
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
  },
  sep: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.055)',
    marginVertical: 6,
    marginHorizontal: 16,
  },
  aboutBox: {
    marginHorizontal: 16,
    marginVertical: 8,
    backgroundColor: 'rgba(99,102,241,0.07)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.15)',
    padding: 14,
    alignItems: 'center',
  },
  aboutLogoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  aboutDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#e50914',
  },
  aboutLogoText: {
    color: '#e2e2e2',
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 2,
  },
  aboutVersion: {
    color: '#6366f1',
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 6,
  },
  aboutDesc: {
    color: '#5a5a5a',
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: 16,
  },
  aboutDesc2: {
    color: '#3a3a3a',
    fontSize: 10,
    fontFamily: 'Inter_400Regular',
    marginTop: 6,
    textAlign: 'center',
  },
  drawerFooter: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  footerText: {
    color: '#2a2a2a',
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
  },
});
