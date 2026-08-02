import { useEffect } from 'react';
import { useTitle } from '@/contexts/TitleContext';

export function usePageTitle(title: string) {
  const { setTitle } = useTitle();

  useEffect(() => {
    setTitle(title);
  }, [setTitle, title]);
}
