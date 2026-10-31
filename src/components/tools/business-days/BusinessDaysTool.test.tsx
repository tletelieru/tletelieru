import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { LocaleProvider } from '~/i18n/react';
import BusinessDaysTool from './BusinessDaysTool';

function output(): HTMLTextAreaElement {
  return screen.getByLabelText('Output') as HTMLTextAreaElement;
}

describe('BusinessDaysTool', () => {
  it('adds business days and names skipped holidays', () => {
    render(<BusinessDaysTool />);
    fireEvent.change(screen.getByLabelText('Business days (+/−)'), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText('Dates (YYYY-MM-DD, one per line)'), {
      target: { value: '2024-09-17' },
    });
    expect(output().value).toBe(
      [
        '2024-09-17 (Tue) +1 → 2024-09-23 (Mon)',
        '  2024-09-18 (Wed) Independence Day',
        '  2024-09-19 (Thu) Army Day',
        '  2024-09-20 (Fri) Fiestas Patrias bridge day',
      ].join('\n'),
    );
  });

  it('switches country', async () => {
    render(<BusinessDaysTool />);
    await userEvent.click(screen.getByRole('button', { name: 'Brazil' }));
    fireEvent.change(screen.getByLabelText('Business days (+/−)'), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText('Dates (YYYY-MM-DD, one per line)'), {
      target: { value: '2026-02-13' },
    });
    expect(output().value).toContain('→ 2026-02-18 (Wed)');
  });

  it('counts between dates', async () => {
    render(<BusinessDaysTool />);
    await userEvent.click(screen.getByRole('button', { name: 'Count between' }));
    fireEvent.change(screen.getByLabelText('Date pairs (YYYY-MM-DD YYYY-MM-DD, one per line)'), {
      target: { value: '2026-10-26 2026-10-30' },
    });
    expect(output().value).toBe('2026-10-26 → 2026-10-30: 4 business days · 4 calendar days');
  });

  it('reports bad dates', () => {
    render(<BusinessDaysTool />);
    fireEvent.change(screen.getByLabelText('Dates (YYYY-MM-DD, one per line)'), {
      target: { value: 'nope' },
    });
    expect(screen.getByRole('alert')).toHaveTextContent('Line 1');
  });

  it('previews the result of the input placeholder', () => {
    render(<BusinessDaysTool />);
    expect(output().placeholder).toContain('2026-09-15 (Tue) +5');
  });

  it('renders in Spanish', () => {
    render(
      <LocaleProvider locale="es">
        <BusinessDaysTool />
      </LocaleProvider>,
    );
    expect(screen.getByRole('button', { name: 'Brasil' })).toBeInTheDocument();
    expect((screen.getByLabelText('Resultado') as HTMLTextAreaElement).placeholder).toContain(
      'Independencia Nacional',
    );
  });
});
