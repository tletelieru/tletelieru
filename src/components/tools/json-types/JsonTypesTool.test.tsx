import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { LocaleProvider } from '~/i18n/react';
import JsonTypesTool from './JsonTypesTool';

function output(label = 'Output'): string {
  return (screen.getByLabelText(label) as HTMLTextAreaElement).value;
}

describe('JsonTypesTool', () => {
  it('generates TypeScript interfaces', () => {
    render(<JsonTypesTool />);
    fireEvent.change(screen.getByLabelText('JSON'), {
      target: { value: '{"a":1,"b":[{"c":"x"}]}' },
    });
    expect(output()).toBe(
      'export interface Root {\n  a: number;\n  b: BItem[];\n}\n\nexport interface BItem {\n  c: string;\n}',
    );
    expect(screen.getByText('2 types')).toBeInTheDocument();
  });

  it('switches to Go and renames the root', async () => {
    render(<JsonTypesTool />);
    fireEvent.change(screen.getByLabelText('JSON'), { target: { value: '{"user_id":1}' } });
    await userEvent.click(screen.getByRole('button', { name: 'Go' }));
    await userEvent.type(screen.getByLabelText('Root type name'), 'event');
    expect(output()).toBe('type Event struct {\n\tUserID int64 `json:"user_id"`\n}');
  });

  it('hydrates the Zod target from the URL', () => {
    window.history.replaceState(null, '', `/?target=zod&input=${encodeURIComponent('[1]')}`);
    render(<JsonTypesTool />);
    expect(output()).toContain('export const RootSchema = z.array(z.number().int());');
  });

  it('shows JSON errors', () => {
    render(<JsonTypesTool />);
    fireEvent.change(screen.getByLabelText('JSON'), { target: { value: '{"a":}' } });
    expect(screen.getByRole('alert')).toHaveTextContent('Line 1, column 6');
  });

  it('renders in Spanish', () => {
    window.history.replaceState(null, '', `/?input=${encodeURIComponent('{a:1}')}`);
    render(
      <LocaleProvider locale="es">
        <JsonTypesTool />
      </LocaleProvider>,
    );
    expect(screen.getByLabelText('Nombre del tipo raíz')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Los nombres de propiedad deben ir entre comillas dobles',
    );
  });
});

describe('JsonTypesTool output placeholder', () => {
  it('previews the types of the placeholder JSON', async () => {
    render(<JsonTypesTool />);
    const placeholder = () => screen.getByLabelText('Output').getAttribute('placeholder');
    expect(placeholder()).toContain('coupon?: string;');
    await userEvent.click(screen.getByRole('button', { name: 'Zod' }));
    expect(placeholder()).toContain('export const AddressSchema = z.object({');
  });
});
