import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { AccountRoute } from '../../src/components/AccountRoute';

function LoginRoute() {
  const location = useLocation();
  return (
    <>
      <p>Account setup</p>
      <output aria-label="Requested account path">{String(location.state?.from ?? '')}</output>
    </>
  );
}

function renderAccountRoute() {
  return render(
    <MemoryRouter
      initialEntries={['/account/watchlist?page=2']}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <Routes>
        <Route
          path="/account/:section"
          element={<AccountRoute><p>Private account page</p></AccountRoute>}
        />
        <Route path="/login" element={<LoginRoute />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('AccountRoute', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('sends users without an API key to optional account setup and remembers the route', () => {
    renderAccountRoute();

    expect(screen.getByText('Account setup')).toBeInTheDocument();
    expect(screen.getByLabelText('Requested account path')).toHaveTextContent(
      '/account/watchlist?page=2',
    );
    expect(screen.queryByText('Private account page')).not.toBeInTheDocument();
  });

  it('allows account routes when the user has configured an API key', () => {
    localStorage.setItem('tmdb_api_key', 'user-key');
    renderAccountRoute();

    expect(screen.getByText('Private account page')).toBeInTheDocument();
  });
});
