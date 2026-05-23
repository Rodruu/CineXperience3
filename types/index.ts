export interface Persona {
  id: number;
  nombre: string;
  username?: string;
  bloqueado: boolean;
  tipo_perfil: 'permanente' | 'temporal';
}

export interface Contenido {
  id: number;
  tmdb_id?: number;
  titulo: string;
  tipo: 'pelicula' | 'serie';
  poster?: string;
  year?: string;
  temporadas?: Temporada[];
}

export interface Temporada {
  id: number;
  contenido_id: number;
  numero: number;
  nombre?: string;
  episodios?: Episodio[];
}

export interface Episodio {
  id: number;
  temporada_id: number;
  numero: number;
  nombre?: string;
  iframe_url: string;
}

export interface Sesion {
  id: number;
  persona_id: number;
  session_token: string;
  device_hash: string;
  device_label: string;
  last_seen: string;
}

export interface TMDBDetails {
  id: number;
  title?: string;
  name?: string;
  overview?: string;
  poster_path?: string;
  backdrop_path?: string;
  vote_average?: number;
  release_date?: string;
  first_air_date?: string;
  genres?: { id: number; name: string }[];
  runtime?: number;
  number_of_seasons?: number;
}

export interface LoginResult {
  success: true;
  session_token: string;
  user: { id: number; nombre: string };
}

export interface LoginError {
  success: false;
  error: string;
}

export interface LoginDeviceLimit {
  success: false;
  deviceLimit: true;
  sessions: Pick<Sesion, 'id' | 'device_label' | 'last_seen'>[];
}

export type LoginResponse = LoginResult | LoginError | LoginDeviceLimit;
