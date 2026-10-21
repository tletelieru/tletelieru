import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '~/i18n/react';
import { sqlOptionDefaults } from '~/lib/tools/sql/format';
import { SqlOptions, ValueStatsText } from './SqlOptions';

describe('SqlOptions', () => {
  it('reports option changes', async () => {
    const update = vi.fn();
    render(<SqlOptions state={sqlOptionDefaults} update={update} />);
    await userEvent.click(screen.getByRole('button', { name: 'Backticks' }));
    await userEvent.click(screen.getByRole('button', { name: 'One per line' }));
    await userEvent.click(screen.getByRole('button', { name: 'Newlines only' }));
    await userEvent.click(screen.getByLabelText('Remove duplicates'));
    expect(update.mock.calls).toEqual([
      [{ quote: 'backtick' }],
      [{ layout: 'multi' }],
      [{ sep: 'newline' }],
      [{ dedupe: false }],
    ]);
  });

  it('hides optional controls', () => {
    render(
      <SqlOptions
        state={sqlOptionDefaults}
        update={vi.fn()}
        quoteStyle={false}
        escape={false}
        layout={false}
        batch={false}
      />,
    );
    expect(screen.queryByLabelText('Quote style')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Layout')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Batch size (0 = none)')).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Escape quotes (' → '')")).not.toBeInTheDocument();
  });
});

describe('SqlOptions in Spanish', () => {
  it('renders Spanish labels', () => {
    render(
      <LocaleProvider locale="es">
        <SqlOptions state={sqlOptionDefaults} update={vi.fn()} />
        <ValueStatsText stats={{ total: 1, unique: 1, duplicatesRemoved: 0 }} />
      </LocaleProvider>,
    );
    expect(screen.getByRole('button', { name: 'Cualquier separador' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Comillas simples' })).toBeInTheDocument();
    expect(screen.getByLabelText('Quitar duplicados')).toBeInTheDocument();
    expect(screen.getByLabelText('Tamaño de lote (0 = sin lotes)')).toBeInTheDocument();
    expect(screen.getByText('1 valor · 1 únicos · 0 duplicados eliminados')).toBeInTheDocument();
  });
});

describe('ValueStatsText', () => {
  it('renders nothing without values', () => {
    const { container } = render(
      <ValueStatsText stats={{ total: 0, unique: 0, duplicatesRemoved: 0 }} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the counts', () => {
    render(<ValueStatsText stats={{ total: 1, unique: 1, duplicatesRemoved: 0 }} />);
    expect(screen.getByText('1 value · 1 unique · 0 duplicates removed')).toBeInTheDocument();
  });
});
