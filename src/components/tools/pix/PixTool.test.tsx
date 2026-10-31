import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { LocaleProvider } from '~/i18n/react';
import PixTool from './PixTool';

const CODE =
  '00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-4266554400005204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***63041D3D';

function output(): HTMLTextAreaElement {
  return screen.getByLabelText('Output') as HTMLTextAreaElement;
}

describe('PixTool', () => {
  it('parses a BR Code', () => {
    render(<PixTool />);
    fireEvent.change(screen.getByLabelText('Pix BR Code (copy and paste)'), {
      target: { value: CODE },
    });
    expect(output().value).toContain('Receiver: Fulano de Tal');
    expect(output().value).toContain('CRC: 1D3D · valid');
  });

  it('reports a broken code', () => {
    render(<PixTool />);
    fireEvent.change(screen.getByLabelText('Pix BR Code (copy and paste)'), {
      target: { value: 'nope' },
    });
    expect(screen.getByRole('alert')).toHaveTextContent('not valid EMV TLV');
  });

  it('generates a BR Code from the form', async () => {
    render(<PixTool />);
    await userEvent.click(screen.getByRole('button', { name: 'Generate' }));
    fireEvent.change(screen.getByLabelText('Receiver name'), {
      target: { value: 'Fulano de Tal' },
    });
    fireEvent.change(screen.getByLabelText('City'), { target: { value: 'BRASILIA' } });
    fireEvent.change(screen.getByLabelText('Pix key'), {
      target: { value: '123e4567-e12b-12d1-a456-426655440000' },
    });
    expect(output().value).toBe(CODE);
  });

  it('validates keys', async () => {
    render(<PixTool />);
    await userEvent.click(screen.getByRole('button', { name: 'Validate key' }));
    fireEvent.change(screen.getByLabelText('Pix keys (one per line)'), {
      target: { value: '529.982.247-25\nnope' },
    });
    expect(output().value).toBe('529.982.247-25 · CPF · valid\nnope · unknown key type · invalid');
  });

  it('previews the result of each input placeholder', async () => {
    render(<PixTool />);
    expect(output().placeholder).toContain('Key type: Random key (EVP)');
    await userEvent.click(screen.getByRole('button', { name: 'Generate' }));
    expect(output().placeholder).toBe(CODE);
  });

  it('renders in Spanish', () => {
    render(
      <LocaleProvider locale="es">
        <PixTool />
      </LocaleProvider>,
    );
    expect(screen.getByRole('button', { name: 'Validar llave' })).toBeInTheDocument();
  });
});
