import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { LocaleProvider } from '~/i18n/react';
import JsonDiffTool from './JsonDiffTool';

function output(label = 'Changes'): string {
  return (screen.getByLabelText(label) as HTMLTextAreaElement).value;
}

describe('JsonDiffTool', () => {
  it('lists changes ignoring key order', () => {
    render(<JsonDiffTool />);
    fireEvent.change(screen.getByLabelText('Original JSON'), {
      target: { value: '{"a":1,"b":2}' },
    });
    fireEvent.change(screen.getByLabelText('Changed JSON'), {
      target: { value: '{"b":3,"a":1,"c":true}' },
    });
    expect(output()).toBe('~ $.b: 2 → 3\n+ $.c: true');
    expect(screen.getByText('+1 added · −0 removed · ~1 changed')).toBeInTheDocument();
  });

  it('compares arrays as sets', async () => {
    window.history.replaceState(null, '', '/?input=%5B1%2C2%5D&changed=%5B2%2C1%5D');
    render(<JsonDiffTool />);
    expect(output()).toBe('~ $[0]: 1 → 2\n~ $[1]: 2 → 1');
    await userEvent.click(screen.getByRole('button', { name: 'As sets' }));
    expect(output()).toBe('Both documents are equal.');
  });

  it('reports which side has invalid JSON', () => {
    window.history.replaceState(null, '', '/?input=%7B%7D&changed=%7B');
    render(<JsonDiffTool />);
    expect(screen.getByRole('alert')).toHaveTextContent('Changed JSON · Line 1, column 2');
  });

  it('renders in Spanish', () => {
    window.history.replaceState(null, '', '/?input=%7B%7D&changed=%7B%22a%22%3A1%7D');
    render(
      <LocaleProvider locale="es">
        <JsonDiffTool />
      </LocaleProvider>,
    );
    expect(screen.getByRole('button', { name: 'Como conjuntos' })).toBeInTheDocument();
    expect(screen.getByText('+1 agregados · −0 eliminados · ~0 modificados')).toBeInTheDocument();
    expect(output('Cambios')).toBe('+ $.a: 1');
  });
});

describe('JsonDiffTool output placeholder', () => {
  it('previews the diff of the placeholders', () => {
    render(<JsonDiffTool />);
    expect(screen.getByLabelText('Changes').getAttribute('placeholder')).toBe(
      [
        '~ $.name: "Ana" → "Ana María"',
        '~ $.roles[0]: "admin" → "dev"',
        '- $.roles[1]: "dev"',
        '- $.active: true',
        '+ $.team: "core"',
      ].join('\n'),
    );
  });
});
