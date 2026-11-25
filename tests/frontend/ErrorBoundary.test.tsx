import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ErrorBoundary } from '../../src/components/ErrorBoundary.tsx';

function BrokenChild({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('Simulated chart crash');
  }
  return <p>Healthy view rendered</p>;
}

describe('ErrorBoundary', () => {
  it('renders accessible recovery UI when a child throws and recovers on Try Again', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const user = userEvent.setup();

    const { rerender } = render(
      <ErrorBoundary>
        <BrokenChild shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Something went wrong rendering this view'
    );
    expect(screen.getByText('Simulated chart crash')).toBeInTheDocument();

    rerender(
      <ErrorBoundary>
        <BrokenChild shouldThrow={false} />
      </ErrorBoundary>
    );

    await user.click(screen.getByRole('button', { name: /Try Again/i }));
    expect(screen.getByText('Healthy view rendered')).toBeInTheDocument();

    consoleSpy.mockRestore();
  });
});
