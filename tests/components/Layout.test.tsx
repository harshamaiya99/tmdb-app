import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { ExperienceProvider, useExperience } from '@/contexts/ExperienceContext';
import { TitleProvider } from '@/contexts/TitleContext';
import { TMDBAccountProvider } from '@/contexts/TMDBAccountContext';
import { ThemeProvider } from '@/hooks/useTheme';
import { Layout } from '@/components/Layout';

function ExperienceSwitcher() {
  const { setExperience } = useExperience();
  return <button type="button" onClick={() => setExperience('screenroom')}>Switch experience</button>;
}

describe('Layout', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('ui_experience', 'expressive');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        isConnected: false,
        account: null,
        isListAccountConnected: false,
        listAccountId: '',
        canConnectLists: false,
      }),
    }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('uses the Studio brand by default and retains the Watch Tower footer', async () => {
    localStorage.setItem('ui_experience', 'cinema');
    render(
      <ThemeProvider>
        <ExperienceProvider>
          <TitleProvider>
            <MemoryRouter initialEntries={['/movie/123']}>
              <TMDBAccountProvider>
                <Layout><div>Page content</div></Layout>
              </TMDBAccountProvider>
            </MemoryRouter>
          </TitleProvider>
        </ExperienceProvider>
      </ThemeProvider>,
    );

    expect(await screen.findByRole('link', { name: 'Studio home' })).toBeInTheDocument();
    expect(within(screen.getByRole('banner')).queryByText('WATCHTOWER')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Go back' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'WATCHTOWER' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Mobile main navigation' })).toBeInTheDocument();
    expect(screen.queryByText('YOUR LIBRARY')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Watchlist' })).not.toBeInTheDocument();
    expect(screen.getByText('Page content')).toBeInTheDocument();
  });

  it('switches shells without changing hook order', async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <ExperienceProvider>
          <TitleProvider>
            <MemoryRouter>
              <TMDBAccountProvider>
                <ExperienceSwitcher />
                <Layout><div>Page content</div></Layout>
              </TMDBAccountProvider>
            </MemoryRouter>
          </TitleProvider>
        </ExperienceProvider>
      </ThemeProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'Switch experience' }));

    expect(await screen.findByRole('link', { name: 'Screenroom home' })).toBeInTheDocument();
    expect(screen.getByText('Page content')).toBeInTheDocument();
  });

  it('shows the Midnight Matinee library only for connected accounts', async () => {
    localStorage.setItem('ui_experience', 'expressive');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        isConnected: true,
        account: { username: 'filmfan', name: 'Film Fan', avatar: null },
        isListAccountConnected: true,
        listAccountId: '123',
        canConnectLists: true,
      }),
    }));

    render(
      <ThemeProvider>
        <ExperienceProvider>
          <TitleProvider>
            <MemoryRouter>
              <TMDBAccountProvider>
                <Layout><div>Page content</div></Layout>
              </TMDBAccountProvider>
            </MemoryRouter>
          </TitleProvider>
        </ExperienceProvider>
      </ThemeProvider>,
    );

    expect(await screen.findByText('YOUR LIBRARY')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Watchlist' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'My lists' })).toBeInTheDocument();
  });

  it('collapses the Midnight Matinee sidebar to an accessible icon rail', async () => {
    const user = userEvent.setup();
    localStorage.setItem('ui_experience', 'expressive');
    render(
      <ThemeProvider>
        <ExperienceProvider>
          <TitleProvider>
            <MemoryRouter>
              <TMDBAccountProvider>
                <Layout><div>Page content</div></Layout>
              </TMDBAccountProvider>
            </MemoryRouter>
          </TitleProvider>
        </ExperienceProvider>
      </ThemeProvider>,
    );

    const collapseButton = await screen.findByRole('button', { name: 'Collapse sidebar' });
    await user.click(collapseButton);

    expect(screen.getByRole('button', { name: 'Expand sidebar' })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByRole('link', { name: 'Discover' })).toBeInTheDocument();
    expect(within(screen.getByRole('complementary')).getByRole('link', { name: 'Settings' })).toBeInTheDocument();
    expect(screen.getByText('Page content').closest('.matinee-shell')).toHaveClass('matinee-sidebar-collapsed');
  });
});
