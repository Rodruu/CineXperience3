import { createClient } from '@supabase/supabase-js';
import * as Crypto from 'expo-crypto';
import type { Contenido, Sesion } from '@/types';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE = process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE!;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

const REST = `${SUPABASE_URL}/rest/v1`;

export const TMDB_BASE = 'https://api.themoviedb.org/3';
export const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';
export const TMDB_BACKDROP_BASE = 'https://image.tmdb.org/t/p/w1280';
export const TMDB_TOKEN = process.env.EXPO_PUBLIC_TMDB_TOKEN!;

export const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);
export const supabaseAdmin = supabase;

function serviceHeaders(extra: Record<string, string> = {}): Record<string, string> {
  return {
    apikey: SUPABASE_SERVICE_ROLE,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...extra,
  };
}

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

async function sha256Hex(text: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, text, {
    encoding: Crypto.CryptoEncoding.HEX,
  });
}

export interface DirectLoginResult {
  success: true;
  session_token: string;
  user: { id: number; nombre: string };
}
export interface DirectLoginError {
  success: false;
  error: string;
  sessions?: Pick<Sesion, 'id' | 'device_label' | 'last_seen'>[];
}

export async function loginDirect(
  username: string,
  password: string
): Promise<DirectLoginResult | DirectLoginError> {
  try {
    const personaRes = await fetch(
      `${REST}/personas?username=eq.${encodeURIComponent(username)}&select=id,nombre,password_hash,bloqueado&limit=1`,
      { headers: serviceHeaders() }
    );

    if (!personaRes.ok) {
      return { success: false, error: 'Error al conectar con el servidor.' };
    }

    const personas = await personaRes.json();
    if (!personas || personas.length === 0) {
      return { success: false, error: 'Credenciales incorrectas.' };
    }

    const persona = personas[0];

    if (persona.bloqueado) {
      return { success: false, error: 'Cuenta bloqueada. Contacta al administrador.' };
    }

    const passwordHash = await sha256Hex(password);
    if (passwordHash !== persona.password_hash) {
      return { success: false, error: 'Credenciales incorrectas.' };
    }

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const sessionRes = await fetch(
      `${REST}/sesiones?persona_id=eq.${persona.id}&last_seen=gt.${encodeURIComponent(thirtyDaysAgo)}&select=id,device_label,last_seen&order=last_seen.desc`,
      { headers: serviceHeaders() }
    );

    const activeSessions = await sessionRes.json();

    if (Array.isArray(activeSessions) && activeSessions.length >= 3) {
      return {
        success: false,
        error: 'device_limit',
        sessions: activeSessions,
      };
    }

    const session_token = generateUUID();
    const now = new Date().toISOString();

    const insertRes = await fetch(`${REST}/sesiones`, {
      method: 'POST',
      headers: serviceHeaders({ Prefer: 'return=minimal' }),
      body: JSON.stringify({
        persona_id: persona.id,
        session_token,
        device_hash: 'cine-xperience-app',
        device_label: 'Cine Xperience App',
        last_seen: now,
      }),
    });

    if (!insertRes.ok) {
      const err = await insertRes.text();
      return { success: false, error: `Error al crear sesion: ${err}` };
    }

    return {
      success: true,
      session_token,
      user: { id: persona.id, nombre: persona.nombre },
    };
  } catch (e) {
    return { success: false, error: 'Error de conexion. Verifica tu internet.' };
  }
}

export async function fetchMyContent(personaId: number): Promise<Contenido[]> {
  const { data, error } = await supabaseAdmin
    .from('persona_contenido')
    .select(`
      contenido:contenidos (
        id, titulo, tipo, poster, year, tmdb_id,
        temporadas (
          id, contenido_id, numero, nombre,
          episodios (id, temporada_id, numero, nombre, iframe_url)
        )
      )
    `)
    .eq('persona_id', personaId);

  if (error) throw error;
  const items = (data ?? []).map((item: { contenido: unknown }) => item.contenido).filter(Boolean);
  return items as Contenido[];
}

export async function fetchMySessions(
  personaId: number
): Promise<Pick<Sesion, 'id' | 'device_label' | 'last_seen'>[]> {
  const { data, error } = await supabaseAdmin
    .from('sesiones')
    .select('id, device_label, last_seen')
    .eq('persona_id', personaId)
    .order('last_seen', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function revokeSession(sessionId: number): Promise<void> {
  const { error } = await supabaseAdmin.from('sesiones').delete().eq('id', sessionId);
  if (error) throw error;
}

export async function fetchTMDBDetails(tmdbId: number, tipo: 'pelicula' | 'serie') {
  const endpoint = tipo === 'pelicula' ? `movie/${tmdbId}` : `tv/${tmdbId}`;
  const res = await fetch(`${TMDB_BASE}/${endpoint}?language=es-ES`, {
    headers: { Authorization: `Bearer ${TMDB_TOKEN}` },
  });
  if (!res.ok) return null;
  return res.json();
}

export async function fetchTMDBSeason(tmdbId: number, seasonNumber: number) {
  const res = await fetch(`${TMDB_BASE}/tv/${tmdbId}/season/${seasonNumber}?language=es-ES`, {
    headers: { Authorization: `Bearer ${TMDB_TOKEN}` },
  });
  if (!res.ok) return null;
  return res.json();
}

export async function fetchTMDBCredits(tmdbId: number, tipo: 'pelicula' | 'serie') {
  const endpoint = tipo === 'pelicula' ? `movie/${tmdbId}/credits` : `tv/${tmdbId}/credits`;
  const res = await fetch(`${TMDB_BASE}/${endpoint}?language=es-ES`, {
    headers: { Authorization: `Bearer ${TMDB_TOKEN}` },
  });
  if (!res.ok) return null;
  return res.json();
}

export async function fetchTMDBSimilar(tmdbId: number, tipo: 'pelicula' | 'serie') {
  const endpoint = tipo === 'pelicula' ? `movie/${tmdbId}/recommendations` : `tv/${tmdbId}/recommendations`;
  const res = await fetch(`${TMDB_BASE}/${endpoint}?language=es-ES&page=1`, {
    headers: { Authorization: `Bearer ${TMDB_TOKEN}` },
  });
  if (!res.ok) return null;
  return res.json();
}
