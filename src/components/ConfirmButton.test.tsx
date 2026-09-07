import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmButton } from './ConfirmButton';

describe('ConfirmButton', () => {
  it('needs two clicks to fire — no native dialog', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<ConfirmButton onConfirm={onConfirm} caption="gone forever" />);

    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.getByText('gone forever')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Really delete?' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('Cancel disarms without firing', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<ConfirmButton onConfirm={onConfirm} />);

    await user.click(screen.getByRole('button', { name: 'Delete' }));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
  });
});
