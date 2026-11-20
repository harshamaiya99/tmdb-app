import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ExperienceProvider, useExperience } from '@/contexts/ExperienceContext';

function ExperienceProbe() {
  const { experience, setExperience } = useExperience();
  return (
    <>
      <p>Current experience: {experience}</p>
      <button type="button" onClick={() => setExperience('expressive')}>Choose Expressive</button>
      <button type="button" onClick={() => setExperience('screenroom')}>Choose Screenroom</button>
    </>
  );
}

describe('ExperienceProvider', () => {
  beforeEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset.experience;
  });

  afterEach(() => {
    delete document.documentElement.dataset.experience;
  });

  it('uses Cinema for missing or invalid saved preferences', () => {
    localStorage.setItem('ui_experience', 'unknown');

    render(
      <ExperienceProvider>
        <ExperienceProbe />
      </ExperienceProvider>,
    );

    expect(screen.getByText('Current experience: cinema')).toBeInTheDocument();
    expect(document.documentElement).toHaveAttribute('data-experience', 'cinema');
  });

  it('persists experience changes and restores them on the next visit', async () => {
    const user = userEvent.setup();
    const firstRender = render(
      <ExperienceProvider>
        <ExperienceProbe />
      </ExperienceProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'Choose Expressive' }));

    expect(screen.getByText('Current experience: expressive')).toBeInTheDocument();
    expect(localStorage.getItem('ui_experience')).toBe('expressive');
    expect(document.documentElement).toHaveAttribute('data-experience', 'expressive');

    firstRender.unmount();
    render(
      <ExperienceProvider>
        <ExperienceProbe />
      </ExperienceProvider>,
    );

    expect(screen.getByText('Current experience: expressive')).toBeInTheDocument();
  });

  it('accepts and persists the Screenroom experience', async () => {
    const user = userEvent.setup();
    render(
      <ExperienceProvider>
        <ExperienceProbe />
      </ExperienceProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'Choose Screenroom' }));

    expect(screen.getByText('Current experience: screenroom')).toBeInTheDocument();
    expect(localStorage.getItem('ui_experience')).toBe('screenroom');
    expect(document.documentElement).toHaveAttribute('data-experience', 'screenroom');
  });
});
