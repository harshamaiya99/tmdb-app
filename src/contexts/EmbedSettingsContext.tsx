import { createContext, useContext, useState, type ReactNode } from 'react';
import {
  createEmbedLink,
  isValidRegion,
  normalizeEmbedLinks,
  normalizeRegion,
  type EmbedLink,
} from '@/lib/embedSettings';

const MOVIE_EMBED_STORAGE_KEY = 'tmdb_movie_embed_links';
const TV_EMBED_STORAGE_KEY = 'tmdb_tv_embed_links';
const LEGACY_MOVIE_EMBED_STORAGE_KEY = 'tmdb_movie_embed_url';
const LEGACY_TV_EMBED_STORAGE_KEY = 'tmdb_tv_embed_url';
const REGION_STORAGE_KEY = 'tmdb_content_region';

function getDefaultRegion(): string {
  const localeParts = Intl.DateTimeFormat().resolvedOptions().locale.split('-');
  const region = localeParts.slice(1).find(isValidRegion);
  const normalizedRegion = region?.toUpperCase() ?? '';
  return normalizedRegion || 'US';
}

interface EmbedSettings {
  movieLinks: EmbedLink[];
  tvLinks: EmbedLink[];
  region: string;
}

interface EmbedSettingsContextValue extends EmbedSettings {
  saveRegion: (region: string) => void;
  saveSettings: (settings: EmbedSettings) => void;
  resetSettings: () => EmbedSettings;
}

const defaultSettings: EmbedSettings = {
  movieLinks: import.meta.env.VITE_MOVIE_EMBED_URL
    ? [createEmbedLink(import.meta.env.VITE_MOVIE_EMBED_URL)]
    : [],
  tvLinks: import.meta.env.VITE_TV_EMBED_URL
    ? [createEmbedLink(import.meta.env.VITE_TV_EMBED_URL)]
    : [],
  region: getDefaultRegion(),
};

const EmbedSettingsContext = createContext<EmbedSettingsContextValue | null>(null);

function readLinks(storageKey: string, legacyStorageKey: string, defaults: EmbedLink[]): EmbedLink[] {
  const savedLinks = localStorage.getItem(storageKey);
  if (savedLinks !== null) {
    const parsed: unknown = JSON.parse(savedLinks);
    if (
      !Array.isArray(parsed)
      || !parsed.every((link) => (
        typeof link === 'object'
        && link !== null
        && typeof link.name === 'string'
        && typeof link.urlTemplate === 'string'
      ))
    ) {
      throw new Error(`Saved embed links in ${storageKey} are invalid.`);
    }
    return normalizeEmbedLinks(parsed);
  }

  const legacyTemplate = localStorage.getItem(legacyStorageKey);
  return legacyTemplate
    ? normalizeEmbedLinks([createEmbedLink(legacyTemplate)])
    : defaults;
}

function loadSettings(): EmbedSettings {
  const savedRegion = localStorage.getItem(REGION_STORAGE_KEY)?.toUpperCase() ?? '';
  return {
    movieLinks: readLinks(MOVIE_EMBED_STORAGE_KEY, LEGACY_MOVIE_EMBED_STORAGE_KEY, defaultSettings.movieLinks),
    tvLinks: readLinks(TV_EMBED_STORAGE_KEY, LEGACY_TV_EMBED_STORAGE_KEY, defaultSettings.tvLinks),
    region: isValidRegion(savedRegion) ? savedRegion : defaultSettings.region,
  };
}

export function EmbedSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState(loadSettings);

  const saveRegion = (nextRegion: string) => {
    const region = normalizeRegion(nextRegion);
    if (region) {
      localStorage.setItem(REGION_STORAGE_KEY, region);
    } else {
      localStorage.removeItem(REGION_STORAGE_KEY);
    }
    setSettings((currentSettings) => ({ ...currentSettings, region }));
  };

  const saveSettings = (nextSettings: EmbedSettings) => {
    const region = normalizeRegion(nextSettings.region);
    const normalizedSettings = {
      movieLinks: normalizeEmbedLinks(nextSettings.movieLinks),
      tvLinks: normalizeEmbedLinks(nextSettings.tvLinks),
      region,
    };
    localStorage.setItem(MOVIE_EMBED_STORAGE_KEY, JSON.stringify(normalizedSettings.movieLinks));
    localStorage.setItem(TV_EMBED_STORAGE_KEY, JSON.stringify(normalizedSettings.tvLinks));
    if (normalizedSettings.region) {
      localStorage.setItem(REGION_STORAGE_KEY, normalizedSettings.region);
    } else {
      localStorage.removeItem(REGION_STORAGE_KEY);
    }
    localStorage.removeItem(LEGACY_MOVIE_EMBED_STORAGE_KEY);
    localStorage.removeItem(LEGACY_TV_EMBED_STORAGE_KEY);
    setSettings(normalizedSettings);
  };

  const resetSettings = () => {
    localStorage.removeItem(MOVIE_EMBED_STORAGE_KEY);
    localStorage.removeItem(TV_EMBED_STORAGE_KEY);
    localStorage.removeItem(LEGACY_MOVIE_EMBED_STORAGE_KEY);
    localStorage.removeItem(LEGACY_TV_EMBED_STORAGE_KEY);
    localStorage.removeItem(REGION_STORAGE_KEY);
    setSettings(defaultSettings);
    return defaultSettings;
  };

  return (
    <EmbedSettingsContext.Provider value={{ ...settings, saveRegion, saveSettings, resetSettings }}>
      {children}
    </EmbedSettingsContext.Provider>
  );
}

export function useEmbedSettings() {
  const context = useContext(EmbedSettingsContext);
  if (!context) {
    throw new Error('useEmbedSettings must be used within an EmbedSettingsProvider');
  }
  return context;
}
