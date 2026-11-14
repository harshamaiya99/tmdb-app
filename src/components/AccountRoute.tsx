import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';

export function AccountRoute({ children }: { children: ReactNode }) {
  const location = useLocation();

  if (!localStorage.getItem('tmdb_api_key')) {
    return (
      <Navigate
        to="/login"
        state={{ from: `${location.pathname}${location.search}${location.hash}` }}
        replace
      />
    );
  }

  return <>{children}</>;
}
