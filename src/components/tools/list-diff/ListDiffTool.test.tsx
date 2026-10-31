import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { LocaleProvider } from '~/i18n/react';
import ListDiffTool from './ListDiffTool';

function output(): HTMLTextAreaElement {
  return screen.getByLabelText('Output') as HTMLTextAreaElement;
}

describe('ListDiffTool', () => {
  it('reports the four groups', () => {
    render(<ListDiffTool />);
    fireEvent.change(screen.getByLabelText('List A'), { target: { value: 'a,1\nb,2\nc,3' } });
    fireEvent.change(screen.getByLabelText('List B'), { target: { value: 'b,2\nc,4\nd,5' } });
    expect(output().value).toBe(
      [
        'Only in A (1)',
        '  a  1',
        '',
        'Only in B (1)',
        '  d  5',
        '',
        'Amount mismatches (1)',
        '  c  A 3  B 4  Δ 1',
        '',
        'In both (1)',
        '  b  2',
        '',
        'Totals: A 6 · B 11',
      ].join('\n'),
    );
  });

  it('compares plain IDs when amounts are off', async () => {
    render(<ListDiffTool />);
    await userEvent.click(screen.getByLabelText('Second column is an amount (id,amount)'));
    fireEvent.change(screen.getByLabelText('List A'), { target: { value: 'x\ny' } });
    fireEvent.change(screen.getByLabelText('List B'), { target: { value: 'y' } });
    expect(output().value).toContain('Only in A (1)\n  x');
  });

  it('shows rows with bad amounts', () => {
    render(<ListDiffTool />);
    fireEvent.change(screen.getByLabelText('List A'), { target: { value: 'a,1\nb,x' } });
    expect(screen.getByRole('alert')).toHaveTextContent('List A, line 2');
  });

  it('previews the result of the input placeholder', () => {
    render(<ListDiffTool />);
    expect(output().placeholder).toContain('tx-1003  A 4300  B 4350  Δ 50');
  });

  it('renders in Spanish', () => {
    render(
      <LocaleProvider locale="es">
        <ListDiffTool />
      </LocaleProvider>,
    );
    expect(screen.getByLabelText('Lista A')).toBeInTheDocument();
    expect((screen.getByLabelText('Resultado') as HTMLTextAreaElement).placeholder).toContain(
      'Solo en A (1)',
    );
  });
});
