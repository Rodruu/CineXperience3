import React, { createContext, useContext, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { loginDirect } from '@/services/supabase';
import type { Sesion } from '@/types';

interface User {
  id: number;
  nombre: string;
}

interface AuthContextType {
  user: User | null;
  sessionToken: string | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<LoginCallResult>;
  logout: () => Promise<void>;
}

export type LoginCallResult =
  | { type: 'success' }
  | { type: 'error'; message: string }
  | { type: 'device_limit'; sessions: Pick<Sesion, 'id' | 'device_label' | 'last_seen'>[] };

const AuthContext = createContext<AuthContextType | null>(null);

async function secureGet(key: string): Promise<string | null> {
  if (Platform.OS === 'web') return localStorage.getItem(key);
  return SecureStore.getItemAsync(key);
}

async function secureSet(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') { localStorage.setItem(key, value); return; }
  await SecureStore.setItemAsync(key, value);
}

async function secureDelete(key: string): Promise<void> {
  if (Platform.OS === 'web') { localStorage.removeItem(key); return; }
  await SecureStore.deleteItemAsync(key);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => { loadStoredSession(); }, []);

  async function loadStoredSession() {
    try {
      const token = await secureGet('session_token');
      const userData = await secureGet('user');
      if (token && userData) {
        setSessionToken(token);
        setUser(JSON.parse(userData));
      }
    } catch {
    } finally {
      setIsLoading(false);
    }
  }

  async function login(username: string, password: string): Promise<LoginCallResult> {
    const result = await loginDirect(username, password);

    if (!result.success) {
      if (result.error === 'device_limit' && result.sessions) {
        return { type: 'device_limit', sessions: result.sessions };
      }
      return { type: 'error', message: result.error };
    }

    await secureSet('session_token', result.session_token);
    await secureSet('user', JSON.stringify(result.user));
    setSessionToken(result.session_token);
    setUser(result.user);
    return { type: 'success' };
  }

  async function logout() {
    await secureDelete('session_token');
    await secureDelete('user');
    setSessionToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, sessionToken, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
