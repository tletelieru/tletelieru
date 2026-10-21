import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '~/i18n/react';
import Base64Tool from './Base64Tool';

function outputValue(label = 'Output'): string {
  return (screen.getByLabelText(label) as HTMLTextAreaElement).value;
}

describe('Base64Tool', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('encodes UTF-8 text and shows the sizes', async () => {
    render(<Base64Tool />);
    await userEvent.type(screen.getByLabelText('Text to encode'), 'ñandú ✓');
    expect(outputValue()).toBe('w7FhbmTDuiDinJM=');
    expect(screen.getByText('11 B → 16 B')).toBeInTheDocument();
  });

  it('hydrates URL-safe, unpadded encoding from the URL', () => {
    window.history.replaceState(null, '', '/?alphabet=url&padding=0&input=%3F%3F%3F%3E');
    render(<Base64Tool />);
    expect(outputValue()).toBe('Pz8_Pg');
  });

  it('hydrates decode mode from the URL', () => {
    window.history.replaceState(null, '', '/?mode=decode&input=w7FhbmTDuiDinJM');
    render(<Base64Tool />);
    expect(outputValue()).toBe('ñandú ✓');
  });

  it('reports invalid characters with their position', () => {
    window.history.replaceState(null, '', '/?mode=decode&input=Zm9v*YmFy');
    render(<Base64Tool />);
    expect(screen.getByText('Invalid character "*" at position 5.')).toBeInTheDocument();
  });

  it('downloads decoded binary data as a file', async () => {
    const createObjectURL = vi.fn(() => 'blob:test');
    const revokeObjectURL = vi.fn();
    Object.assign(URL, { createObjectURL, revokeObjectURL });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    window.history.replaceState(
      null,
      '',
      '/?mode=decode&input=data%3Aimage%2Fpng%3Bbase64%2CiVBORw',
    );
    render(<Base64Tool />);
    expect(
      screen.getByText(
        'The decoded bytes are not valid UTF-8 text. Use "Download file" to save them.',
      ),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Download file' }));
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(click).toHaveBeenCalledTimes(1);
    expect((click.mock.contexts[0] as HTMLAnchorElement).download).toBe('decoded.png');
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:test');
  });

  it('encodes a picked file as Base64 and as a data URI', async () => {
    window.history.replaceState(null, '', '/?mode=file');
    render(<Base64Tool />);
    await userEvent.upload(
      screen.getByLabelText('Choose file'),
      new File(['hello'], 'hello.txt', { type: 'text/plain' }),
    );
    await waitFor(() => expect(outputValue()).toBe('aGVsbG8='));
    expect(screen.getByText('hello.txt · text/plain · 5 B')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Data URI' }));
    expect(outputValue()).toBe('data:text/plain;base64,aGVsbG8=');
    expect(window.location.search).not.toContain('aGVsbG8');
  });

  it('renders in Spanish inside a Spanish locale', () => {
    window.history.replaceState(null, '', '/?mode=decode&input=Zm9vY');
    render(
      <LocaleProvider locale="es">
        <Base64Tool />
      </LocaleProvider>,
    );
    expect(screen.getByRole('button', { name: 'Decodificar' })).toBeInTheDocument();
    expect(screen.getByLabelText('Base64 o data URI a decodificar')).toHaveValue('Zm9vY');
    expect(
      screen.getByText('Los datos Base64 tienen un largo imposible (sobra o falta un carácter).'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copiar' })).toBeInTheDocument();
  });
});
