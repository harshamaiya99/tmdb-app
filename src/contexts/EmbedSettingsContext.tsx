import { createContext, useContext, useState, type ReactNode } from 'react';

const MOVIE_EMBED_STORAGE_KEY = 'tmdb_movie_embed_url';
const TV_EMBED_STORAGE_KEY = 'tmdb_tv_embed_url';

interface EmbedSettings {
  movieUrlTemplate: string;
  tvUrlTemplate: string;
}

interface EmbedSettingsContextValue extends EmbedSettings {
  saveSettings: (settings: EmbedSettings) => void;
  resetSettings: () => void;
}

const defaultSettings: EmbedSettings = {
  movieUrlTemplate: import.meta.env.VITE_MOVIE_EMBED_URL ?? '',
  tvUrlTemplate: import.meta.env.VITE_TV_EMBED_URL ?? '',
};

const EmbedSettingsContext = createContext<EmbedSettingsContextValue | null>(null);

function loadSettings(): EmbedSettings {
  return {
    movieUrlTemplate: localStorage.getItem(MOVIE_EMBED_STORAGE_KEY) ?? defaultSettings.movieUrlTemplate,
    tvUrlTemplate: localStorage.getItem(TV_EMBED_STORAGE_KEY) ?? defaultSettings.tvUrlTemplate,
  };
}

export function EmbedSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState(loadSettings);

  const saveSettings = (nextSettings: EmbedSettings) => {
    if (nextSettings.movieUrlTemplate.trim()) {
      localStorage.setItem(MOVIE_EMBED_STORAGE_KEY, nextSettings.movieUrlTemplate.trim());
    } else {
      localStorage.removeItem(MOVIE_EMBED_STORAGE_KEY);
    }

    if (nextSettings.tvUrlTemplate.trim()) {
      localStorage.setItem(TV_EMBED_STORAGE_KEY, nextSettings.tvUrlTemplate.trim());
    } else {
      localStorage.removeItem(TV_EMBED_STORAGE_KEY);
    }

    setSettings({
      movieUrlTemplate: nextSettings.movieUrlTemplate.trim() || defaultSettings.movieUrlTemplate,
      tvUrlTemplate: nextSettings.tvUrlTemplate.trim() || defaultSettings.tvUrlTemplate,
    });
  };

  const resetSettings = () => {
    localStorage.removeItem(MOVIE_EMBED_STORAGE_KEY);
    localStorage.removeItem(TV_EMBED_STORAGE_KEY);
    setSettings(defaultSettings);
  };

  return (
    <EmbedSettingsContext.Provider value={{ ...settings, saveSettings, resetSettings }}>
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
