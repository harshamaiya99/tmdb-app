import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

export type UIExperience = 'cinema' | 'expressive' | 'screenroom';

interface ExperienceContextValue {
  experience: UIExperience;
  setExperience: (experience: UIExperience) => void;
}

const EXPERIENCE_STORAGE_KEY = 'ui_experience';
const ExperienceContext = createContext<ExperienceContextValue | null>(null);

function readExperience(): UIExperience {
  try {
    const savedExperience = window.localStorage.getItem(EXPERIENCE_STORAGE_KEY);
    if (savedExperience === 'expressive' || savedExperience === 'screenroom') return savedExperience;
    return 'cinema';
  } catch {
    return 'cinema';
  }
}

export function ExperienceProvider({ children }: { children: ReactNode }) {
  const [experience, setCurrentExperience] = useState<UIExperience>(readExperience);

  useEffect(() => {
    window.document.documentElement.dataset.experience = experience;
  }, [experience]);

  const setExperience = useCallback((nextExperience: UIExperience) => {
    window.localStorage.setItem(EXPERIENCE_STORAGE_KEY, nextExperience);
    setCurrentExperience(nextExperience);
  }, []);

  return createElement(
    ExperienceContext.Provider,
    { value: { experience, setExperience } },
    children,
  );
}

export function useExperience() {
  const context = useContext(ExperienceContext);
  if (!context) throw new Error('useExperience must be used within ExperienceProvider');
  return context;
}
