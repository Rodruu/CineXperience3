import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,
  Linking,
  Alert,
  Platform,
  FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import type { Contenido } from '@/types';

const WHATSAPP_NUMBER = '543813337442';
const EMAIL_ADDRESS = 'nelsonmiranda@gmail.com';

const ERROR_TYPES = [
  {
    id: 'iframe_caido',
    emoji: '📺',
    label: 'Reproductor / Iframe caído',
    desc: 'El video no carga o está caído',
    color: '#e50914',
  },
  {
    id: 'sin_audio',
    emoji: '🔇',
    label: 'Sin audio',
    desc: 'El video se ve pero no hay sonido',
    color: '#f59e0b',
  },
  {
    id: 'carga_lenta',
    emoji: '🐌',
    label: 'Carga muy lenta',
    desc: 'Buffering constante o lentitud',
    color: '#f59e0b',
  },
  {
    id: 'app_cerrada',
    emoji: '💥',
    label: 'La app se cerró',
    desc: 'Crash inesperado de la aplicación',
    color: '#ef4444',
  },
  {
    id: 'contenido_falta',
    emoji: '❓',
    label: 'Falta contenido',
    desc: 'Contenido asignado no aparece',
    color: '#6366f1',
  },
  {
    id: 'otro',
    emoji: '🐛',
    label: 'Otro error',
    desc: 'Cualquier otro problema',
    color: '#5a5a5a',
  },
];

interface ReportErrorModalProps {
  visible: boolean;
  onClose: () => void;
  userName?: string;
  content: Contenido[];
}

type Step = 'type' | 'detail' | 'contact';

export function ReportErrorModal({ visible, onClose, userName, content }: ReportErrorModalProps) {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<Step>('type');
  const [errorType, setErrorType] = useState<string | null>(null);
  const [selectedContent, setSelectedContent] = useState<Contenido | null>(null);
  const [selectedSeason, setSelectedSeason] = useState<number | null>(null);
  const [selectedEpisode, setSelectedEpisode] = useState<number | null>(null);
  const [extraNote, setExtraNote] = useState('');

  function resetState() {
    setStep('type');
    setErrorType(null);
    setSelectedContent(null);
    setSelectedSeason(null);
    setSelectedEpisode(null);
    setExtraNote('');
  }

  function handleClose() {
    resetState();
    onClose();
  }

  function goBack() {
    if (step === 'detail') setStep('type');
    else if (step === 'contact') setStep(errorType === 'iframe_caido' ? 'detail' : 'type');
    else handleClose();
  }

  function buildMessage(): { text: string; subject: string } {
    const typeObj = ERROR_TYPES.find((t) => t.id === errorType);
    const now = new Date().toLocaleString('es-AR', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

    let contentLine = '';
    if (selectedContent) {
      contentLine = `\n🎬 *Contenido:* ${selectedContent.titulo}`;
      if (selectedContent.tipo === 'serie' && selectedSeason != null) {
        contentLine += `\n📂 *Temporada:* ${selectedSeason}`;
        if (selectedEpisode != null) {
          contentLine += `\n▶️ *Capítulo:* ${selectedEpisode}`;
        }
      }
    }

    const noteBlock = extraNote.trim() ? `\n\n💬 *Nota:* ${extraNote.trim()}` : '';

    const text =
      `🚨 *REPORTE - Cine Xperience*\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `👤 *Usuario:* ${userName ?? 'Desconocido'}\n` +
      `⚠️ *Problema:* ${typeObj?.label ?? errorType}` +
      contentLine +
      `\n📅 *Fecha:* ${now}` +
      noteBlock +
      `\n━━━━━━━━━━━━━━━━━━━━\n_Enviado desde Cine Xperience_`;

    const subject = `[Cine Xperience] ${typeObj?.label ?? 'Error'}${selectedContent ? ` - ${selectedContent.titulo}` : ''}`;

    return { text, subject };
  }

  async function openWhatsApp() {
    const { text } = buildMessage();
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
        handleClose();
      } else {
        Alert.alert('WhatsApp no encontrado', 'Instala WhatsApp para usar esta opción.');
      }
    } catch {
      Alert.alert('Error', 'No se pudo abrir WhatsApp.');
    }
  }

  async function openEmail() {
    const { text, subject } = buildMessage();
    const body = text.replace(/\*/g, '').replace(/━/g, '-');
    const url = `mailto:${EMAIL_ADDRESS}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    try {
      await Linking.openURL(url);
      handleClose();
    } catch {
      Alert.alert('Error', 'No se pudo abrir el correo electrónico.');
    }
  }

  function canContinueFromDetail(): boolean {
    if (errorType === 'iframe_caido') return selectedContent !== null;
    return true;
  }

  const seasons = selectedContent?.tipo === 'serie' ? selectedContent.temporadas ?? [] : [];
  const episodes =
    selectedSeason != null
      ? seasons.find((s) => s.numero === selectedSeason)?.episodios ?? []
      : [];

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="slide"
      onRequestClose={goBack}
      statusBarTranslucent
    >
      <View style={[styles.root, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={goBack} style={styles.backBtn} activeOpacity={0.7}>
            <Feather name={step === 'type' ? 'x' : 'arrow-left'} size={22} color="#e2e2e2" />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>Reportar Problema</Text>
            <Text style={styles.headerSub}>
              {step === 'type' ? 'Paso 1 — Tipo de error' : step === 'detail' ? 'Paso 2 — Detalles' : 'Paso 3 — Enviar reporte'}
            </Text>
          </View>
          <View style={{ width: 36 }} />
        </View>

        {/* Progress bar */}
        <View style={styles.progressBar}>
          {(['type', 'detail', 'contact'] as Step[]).map((s, i) => (
            <View
              key={s}
              style={[
                styles.progressDot,
                {
                  backgroundColor:
                    s === step
                      ? '#e50914'
                      : (step === 'contact' || (step === 'detail' && i === 0))
                      ? 'rgba(229,9,20,0.35)'
                      : 'rgba(255,255,255,0.1)',
                  flex: i === 1 ? 1 : undefined,
                  width: i === 1 ? undefined : 10,
                },
              ]}
            />
          ))}
        </View>

        <ScrollView
          style={styles.body}
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {step === 'type' && (
            <StepType
              selected={errorType}
              onSelect={(id) => {
                setErrorType(id);
                setSelectedContent(null);
                setSelectedSeason(null);
                setSelectedEpisode(null);
              }}
              onNext={() => {
                if (!errorType) return;
                setStep(errorType === 'iframe_caido' ? 'detail' : 'contact');
              }}
            />
          )}

          {step === 'detail' && errorType === 'iframe_caido' && (
            <StepDetail
              content={content}
              selectedContent={selectedContent}
              onSelectContent={(c) => {
                setSelectedContent(c);
                setSelectedSeason(null);
                setSelectedEpisode(null);
              }}
              seasons={seasons}
              selectedSeason={selectedSeason}
              onSelectSeason={(n) => { setSelectedSeason(n); setSelectedEpisode(null); }}
              episodes={episodes}
              selectedEpisode={selectedEpisode}
              onSelectEpisode={setSelectedEpisode}
              extraNote={extraNote}
              onChangeNote={setExtraNote}
              canContinue={canContinueFromDetail()}
              onNext={() => setStep('contact')}
            />
          )}

          {step === 'contact' && (
            <StepContact
              errorLabel={ERROR_TYPES.find((t) => t.id === errorType)?.label ?? ''}
              contentTitle={selectedContent?.titulo}
              onWhatsApp={openWhatsApp}
              onEmail={openEmail}
            />
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

function StepType({
  selected,
  onSelect,
  onNext,
}: {
  selected: string | null;
  onSelect: (id: string) => void;
  onNext: () => void;
}) {
  return (
    <View>
      <Text style={styles.stepTitle}>¿Qué tipo de problema tenés?</Text>
      <Text style={styles.stepDesc}>Seleccioná la opción que mejor describe el error.</Text>

      {ERROR_TYPES.map((t) => (
        <TouchableOpacity
          key={t.id}
          style={[
            styles.errorCard,
            selected === t.id && { borderColor: t.color, backgroundColor: `${t.color}12` },
          ]}
          onPress={() => onSelect(t.id)}
          activeOpacity={0.75}
        >
          <Text style={styles.errorEmoji}>{t.emoji}</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.errorLabel, selected === t.id && { color: t.color }]}>
              {t.label}
            </Text>
            <Text style={styles.errorDesc}>{t.desc}</Text>
          </View>
          <View
            style={[
              styles.radioOuter,
              selected === t.id && { borderColor: t.color },
            ]}
          >
            {selected === t.id && <View style={[styles.radioInner, { backgroundColor: t.color }]} />}
          </View>
        </TouchableOpacity>
      ))}

      <TouchableOpacity
        style={[styles.primaryBtn, !selected && styles.primaryBtnDisabled]}
        onPress={onNext}
        disabled={!selected}
        activeOpacity={0.85}
      >
        <Text style={styles.primaryBtnText}>Continuar</Text>
        <Feather name="arrow-right" size={16} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

function StepDetail({
  content,
  selectedContent,
  onSelectContent,
  seasons,
  selectedSeason,
  onSelectSeason,
  episodes,
  selectedEpisode,
  onSelectEpisode,
  extraNote,
  onChangeNote,
  canContinue,
  onNext,
}: {
  content: Contenido[];
  selectedContent: Contenido | null;
  onSelectContent: (c: Contenido) => void;
  seasons: import('@/types').Temporada[];
  selectedSeason: number | null;
  onSelectSeason: (n: number) => void;
  episodes: import('@/types').Episodio[];
  selectedEpisode: number | null;
  onSelectEpisode: (n: number) => void;
  extraNote: string;
  onChangeNote: (t: string) => void;
  canContinue: boolean;
  onNext: () => void;
}) {
  return (
    <View>
      <Text style={styles.stepTitle}>¿Cuál es el contenido afectado?</Text>
      <Text style={styles.stepDesc}>Seleccioná la película o serie con el iframe caído.</Text>

      <Text style={styles.fieldLabel}>Seleccionar contenido</Text>
      {content.length === 0 ? (
        <View style={styles.emptyContent}>
          <Text style={styles.emptyContentText}>Sin contenido asignado</Text>
        </View>
      ) : (
        <View style={styles.contentList}>
          {content.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.contentItem,
                selectedContent?.id === item.id && styles.contentItemSelected,
              ]}
              onPress={() => onSelectContent(item)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.contentTypeDot,
                  { backgroundColor: item.tipo === 'serie' ? '#1d4ed8' : '#e50914' },
                ]}
              />
              <Text style={styles.contentItemTitle} numberOfLines={1}>
                {item.titulo}
              </Text>
              <Text style={styles.contentItemType}>
                {item.tipo === 'serie' ? 'SERIE' : 'FILM'}
              </Text>
              {selectedContent?.id === item.id && (
                <Feather name="check" size={15} color="#e50914" />
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {selectedContent?.tipo === 'serie' && seasons.length > 0 && (
        <>
          <Text style={styles.fieldLabel}>Temporada</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
            {seasons.map((s) => (
              <TouchableOpacity
                key={s.id}
                style={[styles.chip, selectedSeason === s.numero && styles.chipSelected]}
                onPress={() => onSelectSeason(s.numero)}
              >
                <Text style={[styles.chipText, selectedSeason === s.numero && styles.chipTextSelected]}>
                  T{s.numero}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </>
      )}

      {selectedSeason != null && episodes.length > 0 && (
        <>
          <Text style={styles.fieldLabel}>Capítulo</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
            {episodes.map((e) => (
              <TouchableOpacity
                key={e.id}
                style={[styles.chip, selectedEpisode === e.numero && styles.chipSelected]}
                onPress={() => onSelectEpisode(e.numero)}
              >
                <Text style={[styles.chipText, selectedEpisode === e.numero && styles.chipTextSelected]}>
                  E{e.numero}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </>
      )}

      <Text style={styles.fieldLabel}>Nota adicional (opcional)</Text>
      <TextInput
        style={styles.noteInput}
        value={extraNote}
        onChangeText={onChangeNote}
        placeholder="Ej: el reproductor carga pero luego se cae..."
        placeholderTextColor="#3a3a3a"
        multiline
        numberOfLines={3}
        textAlignVertical="top"
      />

      <TouchableOpacity
        style={[styles.primaryBtn, !canContinue && styles.primaryBtnDisabled]}
        onPress={onNext}
        disabled={!canContinue}
        activeOpacity={0.85}
      >
        <Text style={styles.primaryBtnText}>Continuar</Text>
        <Feather name="arrow-right" size={16} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

function StepContact({
  errorLabel,
  contentTitle,
  onWhatsApp,
  onEmail,
}: {
  errorLabel: string;
  contentTitle?: string;
  onWhatsApp: () => void;
  onEmail: () => void;
}) {
  return (
    <View>
      <Text style={styles.stepTitle}>¿Cómo querés enviar el reporte?</Text>
      <Text style={styles.stepDesc}>
        El mensaje llegará directamente al administrador con todos los detalles.
      </Text>

      <View style={styles.summaryBox}>
        <View style={styles.summaryRow}>
          <Feather name="alert-circle" size={14} color="#f59e0b" />
          <Text style={styles.summaryText}>{errorLabel}</Text>
        </View>
        {contentTitle && (
          <View style={styles.summaryRow}>
            <Feather name="film" size={14} color="#6366f1" />
            <Text style={styles.summaryText}>{contentTitle}</Text>
          </View>
        )}
      </View>

      <Text style={styles.fieldLabel}>Elegir canal de contacto</Text>

      <TouchableOpacity style={[styles.contactBtn, styles.whatsappBtn]} onPress={onWhatsApp} activeOpacity={0.85}>
        <View style={styles.contactBtnIcon}>
          <Text style={{ fontSize: 22 }}>💬</Text>
        </View>
        <View style={styles.contactBtnText}>
          <Text style={styles.contactBtnTitle}>WhatsApp</Text>
          <Text style={styles.contactBtnSub}>Respuesta rápida · +54 381 333-7442</Text>
        </View>
        <Feather name="arrow-right" size={16} color="rgba(255,255,255,0.4)" />
      </TouchableOpacity>

      <TouchableOpacity style={[styles.contactBtn, styles.emailBtn]} onPress={onEmail} activeOpacity={0.85}>
        <View style={styles.contactBtnIcon}>
          <Text style={{ fontSize: 22 }}>📧</Text>
        </View>
        <View style={styles.contactBtnText}>
          <Text style={styles.contactBtnTitle}>Correo Electrónico</Text>
          <Text style={styles.contactBtnSub}>nelsonmiranda@gmail.com</Text>
        </View>
        <Feather name="arrow-right" size={16} color="rgba(255,255,255,0.4)" />
      </TouchableOpacity>

      <View style={styles.privacyNote}>
        <Feather name="lock" size={12} color="#3a3a3a" />
        <Text style={styles.privacyText}>
          Tu reporte solo es visto por el administrador de Cine Xperience.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#030303',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.07)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#f5f5f5',
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
    textAlign: 'center',
  },
  headerSub: {
    color: '#5a5a5a',
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    marginTop: 2,
  },
  progressBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  progressDot: {
    height: 3,
    borderRadius: 2,
  },
  body: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  stepTitle: {
    color: '#f5f5f5',
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    marginBottom: 6,
    marginTop: 8,
  },
  stepDesc: {
    color: '#5a5a5a',
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    marginBottom: 20,
    lineHeight: 18,
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#0b0b0b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    padding: 14,
    marginBottom: 8,
  },
  errorEmoji: { fontSize: 26 },
  errorLabel: {
    color: '#e2e2e2',
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 2,
  },
  errorDesc: {
    color: '#5a5a5a',
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#e50914',
    borderRadius: 12,
    height: 52,
    marginTop: 20,
  },
  primaryBtnDisabled: {
    opacity: 0.35,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
  },
  fieldLabel: {
    color: '#6b6b6b',
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 16,
  },
  emptyContent: {
    padding: 16,
    backgroundColor: '#0b0b0b',
    borderRadius: 10,
    alignItems: 'center',
  },
  emptyContentText: {
    color: '#3a3a3a',
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
  },
  contentList: { gap: 6 },
  contentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#0b0b0b',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  contentItemSelected: {
    borderColor: 'rgba(229,9,20,0.4)',
    backgroundColor: 'rgba(229,9,20,0.07)',
  },
  contentTypeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  contentItemTitle: {
    flex: 1,
    color: '#e2e2e2',
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
  },
  contentItemType: {
    color: '#3a3a3a',
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.5,
  },
  chipRow: {
    flexGrow: 0,
    marginBottom: 4,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginRight: 8,
  },
  chipSelected: {
    backgroundColor: 'rgba(229,9,20,0.15)',
    borderColor: '#e50914',
  },
  chipText: {
    color: '#5a5a5a',
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
  },
  chipTextSelected: {
    color: '#e50914',
  },
  noteInput: {
    backgroundColor: '#0b0b0b',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    color: '#e2e2e2',
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    padding: 12,
    minHeight: 80,
  },
  summaryBox: {
    backgroundColor: '#0b0b0b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    padding: 14,
    gap: 8,
    marginBottom: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  summaryText: {
    color: '#c4c4c4',
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    flex: 1,
  },
  contactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  whatsappBtn: {
    backgroundColor: 'rgba(37,211,102,0.07)',
    borderColor: 'rgba(37,211,102,0.25)',
  },
  emailBtn: {
    backgroundColor: 'rgba(99,102,241,0.07)',
    borderColor: 'rgba(99,102,241,0.2)',
  },
  contactBtnIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactBtnText: { flex: 1 },
  contactBtnTitle: {
    color: '#e2e2e2',
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 2,
  },
  contactBtnSub: {
    color: '#5a5a5a',
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
  },
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 4,
  },
  privacyText: {
    color: '#2a2a2a',
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    flex: 1,
    lineHeight: 16,
  },
});
