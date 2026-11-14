import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { AccountCallbackPage } from '@/pages/AccountCallbackPage';

function renderCallback(initialEntry: string) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/account/callback" element={<AccountCallbackPage />} />
        <Route path="/account/watchlist" element={<p>Account page</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('AccountCallbackPage', () => {
  it('explains when TMDB authorization was denied', () => {
    renderCallback('/account/callback?error=denied');

    expect(screen.getByText('TMDB access was not approved')).toBeInTheDocument();
    expect(screen.getByText(/try connecting your TMDB account again/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Continue to account' })).toHaveAttribute(
      'href',
      '/account/watchlist',
    );
  });

  it('does not process credentials in the browser callback page', () => {
    renderCallback('/account/callback?request_token=secret&approved=true');

    expect(screen.getByText('TMDB account connection')).toBeInTheDocument();
    expect(screen.getByText(/handled securely by the app/)).toBeInTheDocument();
  });
});
