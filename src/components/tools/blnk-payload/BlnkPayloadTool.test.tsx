import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { LocaleProvider } from '~/i18n/react';
import BlnkPayloadTool from './BlnkPayloadTool';

function output(): HTMLTextAreaElement {
  return screen.getByLabelText('Output') as HTMLTextAreaElement;
}

function fill(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

describe('BlnkPayloadTool', () => {
  it('builds the payload', () => {
    render(<BlnkPayloadTool />);
    fill('Amount', '100.50');
    fill('Currency', 'clp');
    fill('Reference', 'ref_1');
    fill('Source', '@World');
    fill('Destination', 'bln_1');
    expect(JSON.parse(output().value)).toMatchObject({
      amount: 100.5,
      precision: 100,
      currency: 'CLP',
      reference: 'ref_1',
      skip_queue: false,
    });
    expect(screen.getByText('precise_amount: 10050')).toBeInTheDocument();
  });

  it('lists missing fields', () => {
    render(<BlnkPayloadTool />);
    fill('Amount', '1');
    expect(screen.getByRole('alert')).toHaveTextContent('Reference is required');
  });

  it('generates a reference only on click', async () => {
    render(<BlnkPayloadTool />);
    const field = screen.getByLabelText('Reference') as HTMLInputElement;
    expect(field.value).toBe('');
    await userEvent.click(screen.getByRole('button', { name: 'Generate reference' }));
    expect(field.value).toMatch(/^ref_[0-9a-f-]{36}$/);
  });

  it('previews the result of the input placeholder', () => {
    render(<BlnkPayloadTool />);
    expect(JSON.parse(output().placeholder)).toMatchObject({
      amount: 750.25,
      meta_data: { order_id: 'A-1042' },
    });
  });

  it('renders in Spanish', () => {
    render(
      <LocaleProvider locale="es">
        <BlnkPayloadTool />
      </LocaleProvider>,
    );
    expect(screen.getByLabelText('Permitir sobregiro')).toBeInTheDocument();
  });
});
