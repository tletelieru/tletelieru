import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { LocaleProvider } from '~/i18n/react';
import UuidTool from './UuidTool';

function outputLines(label = 'Output'): string[] {
  return (screen.getByLabelText(label) as HTMLTextAreaElement).value.split('\n');
}

describe('UuidTool', () => {
  it('generates v4 UUIDs by default', () => {
    render(<UuidTool />);
    const ids = outputLines();
    expect(ids).toHaveLength(5);
    for (const id of ids) expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab]/);
  });

  it('hydrates type, count, case and hyphens from the URL', () => {
    window.history.replaceState(null, '', '/?type=v7&count=3&case=upper&hyphens=0');
    render(<UuidTool />);
    const ids = outputLines();
    expect(ids).toHaveLength(3);
    for (const id of ids) expect(id).toMatch(/^[0-9A-F]{12}7[0-9A-F]{19}$/);
  });

  it('switches type and regenerates', async () => {
    window.history.replaceState(null, '', '/?count=2');
    render(<UuidTool />);
    await userEvent.click(screen.getByLabelText('Type'));
    await userEvent.click(within(screen.getByRole('listbox')).getByText('ULID'));
    for (const id of outputLines()) expect(id).toMatch(/^[0-7][0-9A-HJKMNP-TV-Z]{25}$/);
  });

  it('generates nanoids with a custom alphabet and reports invalid ones', async () => {
    window.history.replaceState(null, '', '/?type=nanoid&count=2&size=8&alphabet=ab');
    render(<UuidTool />);
    for (const id of outputLines()) expect(id).toMatch(/^[ab]{8}$/);
    const alphabet = screen.getByLabelText('Alphabet');
    await userEvent.clear(alphabet);
    await userEvent.type(alphabet, 'aa');
    expect(screen.getByText('The alphabet has repeated characters.')).toBeInTheDocument();
  });

  it('hydrates inspect mode from the URL', () => {
    window.history.replaceState(
      null,
      '',
      `/?mode=inspect&input=${encodeURIComponent(
        '018f4df7-3e00-7000-8000-000000000000\n01ARYZ6S41TSV4RRFFQ69G5FAV\n00000000-0000-0000-0000-000000000000\nnope',
      )}`,
    );
    render(<UuidTool />);
    expect(outputLines()).toEqual([
      '018f4df7-3e00-7000-8000-000000000000  ✔ UUID v7 · RFC 9562 variant · 2024-05-06T12:53:20.000Z',
      '01ARYZ6S41TSV4RRFFQ69G5FAV  ✔ ULID · 2016-07-30T22:36:16.385Z',
      '00000000-0000-0000-0000-000000000000  ✔ nil UUID',
      'nope  ✘ not a UUID or ULID',
    ]);
    expect(screen.getByText('3 / 4 recognized')).toBeInTheDocument();
  });

  it('inspects typed ids', async () => {
    window.history.replaceState(null, '', '/?mode=inspect');
    render(<UuidTool />);
    await userEvent.type(
      screen.getByLabelText('UUIDs or ULIDs, one per line'),
      'b4cc8000-a838-11ee-8000-000000000000',
    );
    expect(outputLines()).toEqual([
      'b4cc8000-a838-11ee-8000-000000000000  ✔ UUID v1 · RFC 9562 variant · 2024-01-01T00:00:00.000Z',
    ]);
  });

  it('renders in Spanish inside a Spanish locale', () => {
    window.history.replaceState(
      null,
      '',
      '/?mode=inspect&input=ffffffff-ffff-ffff-ffff-ffffffffffff%0Anope',
    );
    render(
      <LocaleProvider locale="es">
        <UuidTool />
      </LocaleProvider>,
    );
    expect(screen.getByRole('button', { name: 'Inspeccionar' })).toBeInTheDocument();
    expect(outputLines('Resultado')).toEqual([
      'ffffffff-ffff-ffff-ffff-ffffffffffff  ✔ UUID máximo',
      'nope  ✘ no es un UUID ni un ULID',
    ]);
    expect(screen.getByText('1 / 2 reconocidos')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Pegar' })).toBeInTheDocument();
  });
});
