import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '~/i18n/react';
import CaseTool from './CaseTool';

describe('CaseTool', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows every case for single-line input', async () => {
    render(<CaseTool />);
    await userEvent.type(screen.getByLabelText('Text, one item per line'), 'parseHTTPResponse');

    expect((screen.getByLabelText('Output (snake_case)') as HTMLTextAreaElement).value).toBe(
      'parse_http_response',
    );
    const list = screen.getByRole('list', { name: 'All cases' });
    const items = within(list).getAllByRole('listitem');
    expect(items).toHaveLength(11);
    expect(within(list).getByText('parseHttpResponse')).toBeInTheDocument();
    expect(within(list).getByText('PARSE_HTTP_RESPONSE')).toBeInTheDocument();
    expect(within(list).getByText('parse/http/response')).toBeInTheDocument();
  });

  it('copies a single case from the list', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    window.history.replaceState(null, '', '/?input=XMLHttpRequest');
    render(<CaseTool />);

    const row = screen.getByText('kebab-case').closest('li');
    if (!row) throw new Error('row not found');
    await act(async () => {
      fireEvent.click(within(row).getByRole('button', { name: 'Copy' }));
    });
    expect(writeText).toHaveBeenCalledWith('xml-http-request');
  });

  it('hydrates multi-line input, target case and accents option from the URL', () => {
    window.history.replaceState(
      null,
      '',
      '/?to=pascal&ascii=1&input=%C3%81rbol+de+Navidad%0Auser_id%0Aversion2Update',
    );
    render(<CaseTool />);
    expect((screen.getByLabelText('Output (PascalCase)') as HTMLTextAreaElement).value).toBe(
      'ArbolDeNavidad\nUserId\nVersion2Update',
    );
    expect(screen.queryByRole('list', { name: 'All cases' })).not.toBeInTheDocument();
  });

  it('renders in Spanish inside a Spanish locale', () => {
    window.history.replaceState(null, '', '/?to=title&input=%C3%A1rbol+de+navidad');
    render(
      <LocaleProvider locale="es">
        <CaseTool />
      </LocaleProvider>,
    );
    expect(screen.getByLabelText('Texto, un elemento por línea')).toHaveValue('árbol de navidad');
    expect(screen.getByLabelText('Convertir a')).toBeInTheDocument();
    expect(screen.getByText('Quitar tildes')).toBeInTheDocument();
    expect((screen.getByLabelText('Resultado (Tipo Título)') as HTMLTextAreaElement).value).toBe(
      'Árbol De Navidad',
    );
    const list = screen.getByRole('list', { name: 'Todos los formatos' });
    expect(within(list).getByText('Tipo oración')).toBeInTheDocument();
    expect(within(list).getByText('MAYÚSCULAS')).toBeInTheDocument();
    expect(within(list).getByText('ÁRBOL DE NAVIDAD')).toBeInTheDocument();
    expect(within(list).getByText('snake_case')).toBeInTheDocument();
    expect(within(list).getAllByRole('button', { name: 'Copiar' })).toHaveLength(11);
  });
});

describe('CaseTool output placeholder', () => {
  it('previews the result of the input placeholder', () => {
    render(<CaseTool />);
    const placeholder = screen.getByLabelText('Output (snake_case)').getAttribute('placeholder');
    expect(placeholder).toContain('parse_http_response');
    expect(placeholder).toContain('user_id');
  });
});
