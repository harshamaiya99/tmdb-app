import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AccountMediaActions } from '@/components/AccountMediaActions';

const mocks = vi.hoisted(() => ({
  useTMDBAccount: vi.fn(),
  useCachedQuery: vi.fn(),
}));

vi.mock('@/contexts/TMDBAccountContext', () => ({
  useTMDBAccount: mocks.useTMDBAccount,
}));

vi.mock('@/hooks/useCachedQuery', () => ({
  useCachedQuery: mocks.useCachedQuery,
}));

describe('AccountMediaActions', () => {
  beforeEach(() => {
    mocks.useTMDBAccount.mockReturnValue({
      account: null,
      connectTMDBAccount: vi.fn(),
      isConnected: false,
    });
    mocks.useCachedQuery.mockReturnValue({
      data: undefined,
      error: undefined,
    });
  });

  it.each([false, true])('shows only watchlist and favorite actions when connected=%s', (isConnected) => {
    mocks.useTMDBAccount.mockReturnValue({
      account: isConnected ? { id: 1 } : null,
      connectTMDBAccount: vi.fn(),
      isConnected,
    });
    if (isConnected) {
      mocks.useCachedQuery.mockReturnValue({
        data: { watchlist: false, favorite: false, rated: false },
        error: undefined,
      });
    }

    render(
      <AccountMediaActions
        mediaId={1}
        mediaType="movie"
        mediaTitle="Example movie"
        showAddToList={false}
        showRatings={false}
      />,
    );

    const actions = within(screen.getByRole('region', { name: 'TMDB account actions' }));
    expect(actions.getAllByRole('button')).toHaveLength(2);
    expect(actions.getByRole('button', { name: 'Add to watchlist' })).toBeInTheDocument();
    expect(actions.getByRole('button', { name: 'Add to favorites' })).toBeInTheDocument();
    expect(actions.queryByRole('button', { name: /rate/i })).not.toBeInTheDocument();
    expect(actions.queryByRole('button', { name: /add to list/i })).not.toBeInTheDocument();
  });
});
