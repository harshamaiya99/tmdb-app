import { type ReactNode } from 'react';
import { useLazyLoad } from '@/hooks/useLazyLoad';

interface LazySectionProps {
  children: ReactNode;
  className?: string;
  minHeight?: string;
}

export function LazySection({ children, className, minHeight = 'min-h-[240px]' }: LazySectionProps) {
  const { ref, isVisible } = useLazyLoad();

  return (
    <div ref={ref} className={className}>
      {isVisible ? children : <div className={minHeight} aria-hidden="true" />}
    </div>
  );
}