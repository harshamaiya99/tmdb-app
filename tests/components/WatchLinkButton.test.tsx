import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { WatchLinkButton } from '@/components/WatchLinkButton';

describe('WatchLinkButton', () => {
  it('opens a single configured link directly', () => {
    render(
      <WatchLinkButton
        links={[{ name: 'Primary', url: 'https://example.com/movie/1' }]}
        label="Watch movie"
      />,
    );

    expect(screen.getByRole('link', { name: 'Watch movie' })).toHaveAttribute(
      'href',
      'https://example.com/movie/1',
    );
  });

  it('offers each configured source when multiple links are available', async () => {
    const user = userEvent.setup();
    render(
      <WatchLinkButton
        links={[
          { name: 'Primary', url: 'https://example.com/movie/1' },
          { name: 'Backup', url: 'https://backup.example.com/movie/1' },
        ]}
        label="Watch movie"
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Watch movie' }));

    expect(screen.getByRole('menuitem', { name: 'Primary' })).toHaveAttribute(
      'href',
      'https://example.com/movie/1',
    );
    expect(screen.getByRole('menuitem', { name: 'Backup' })).toHaveAttribute(
      'href',
      'https://backup.example.com/movie/1',
    );
  });

  it('disables the action when there are no configured links', () => {
    render(<WatchLinkButton links={[]} label="Watch episode" />);

    expect(screen.getByRole('button', { name: 'Watch episode' })).toBeDisabled();
  });
});
