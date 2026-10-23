import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { LocaleProvider } from '~/i18n/react';
import CsvTableTool from './CsvTableTool';

function output(): HTMLTextAreaElement {
  return screen.getByLabelText('Output') as HTMLTextAreaElement;
}

describe('CsvTableTool', () => {
  it('turns CSV into a Slack-ready table and shows stats', () => {
    render(<CsvTableTool />);
    fireEvent.change(screen.getByLabelText('CSV'), { target: { value: 'a,b\n1,2' } });
    expect(output().value).toBe(
      ['```', '┌───┬───┐', '│ a │ b │', '├───┼───┤', '│ 1 │ 2 │', '└───┴───┘', '```'].join('\n'),
    );
    expect(screen.getByText('1 row · 2 columns')).toBeInTheDocument();
  });

  it('switches to Markdown without the code block', async () => {
    render(<CsvTableTool />);
    fireEvent.change(screen.getByLabelText('CSV'), { target: { value: 'a,b\n1,x' } });
    await userEvent.click(screen.getByRole('button', { name: 'Markdown' }));
    await userEvent.click(screen.getByLabelText('Wrap in a code block (Slack)'));
    expect(output().value).toBe('| a   | b   |\n| --: | :-- |\n|   1 | x   |');
  });

  it('copies as TSV without trailing zeros', async () => {
    render(<CsvTableTool />);
    fireEvent.change(screen.getByLabelText('CSV'), { target: { value: 'a,b\n927.5000,x' } });
    await userEvent.click(screen.getByRole('button', { name: 'Tabs (TSV)' }));
    expect(screen.queryByLabelText('Wrap in a code block (Slack)')).not.toBeInTheDocument();
    await userEvent.click(screen.getByLabelText('Drop trailing zeros (927.5000 → 927.5)'));
    expect(output().value).toBe('a\tb\n927.5\tx');
  });

  it('previews the result of the input placeholder', () => {
    render(<CsvTableTool />);
    expect(output().placeholder).toContain('│ 32188 │ USDCLP   │ 927.5000 │');
  });

  it('shows CSV errors', () => {
    render(<CsvTableTool />);
    fireEvent.change(screen.getByLabelText('CSV'), { target: { value: 'a\n"open' } });
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Line 2: the quoted field that starts here is never closed',
    );
  });

  it('renders in Spanish', () => {
    render(
      <LocaleProvider locale="es">
        <CsvTableTool />
      </LocaleProvider>,
    );
    expect(screen.getByRole('button', { name: 'Cuadro' })).toBeInTheDocument();
    expect(screen.getByLabelText('Alinear números a la derecha')).toBeInTheDocument();
  });
});
