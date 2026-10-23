import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { LocaleProvider } from '~/i18n/react';
import CurlConvertTool from './CurlConvertTool';

function output(label = 'Output'): string {
  return (screen.getByLabelText(label) as HTMLTextAreaElement).value;
}

const command = `curl https://api.example.com/items -H 'Authorization: Bearer secret' -v`;

describe('CurlConvertTool', () => {
  it('converts to fetch and lists ignored flags', () => {
    render(<CurlConvertTool />);
    fireEvent.change(screen.getByLabelText('cURL command'), { target: { value: command } });
    expect(output()).toContain('await fetch("https://api.example.com/items", {');
    expect(output()).toContain('"Authorization": "Bearer secret",');
    expect(screen.getByText('Ignored options: -v')).toBeInTheDocument();
  });

  it('switches the target language', async () => {
    render(<CurlConvertTool />);
    fireEvent.change(screen.getByLabelText('cURL command'), { target: { value: command } });
    await userEvent.click(screen.getByRole('button', { name: 'Python requests' }));
    expect(output()).toContain('import requests');
  });

  it('never reads the command from the URL', () => {
    window.history.replaceState(null, '', `/?input=${encodeURIComponent(command)}`);
    render(<CurlConvertTool />);
    expect((screen.getByLabelText('cURL command') as HTMLTextAreaElement).value).toBe('');
  });

  it('never writes the command to the URL', async () => {
    render(<CurlConvertTool />);
    fireEvent.change(screen.getByLabelText('cURL command'), { target: { value: command } });
    await userEvent.click(screen.getByRole('button', { name: 'axios' }));
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(window.location.search).toBe('?target=axios');
  });

  it('shows parse errors', () => {
    render(<CurlConvertTool />);
    fireEvent.change(screen.getByLabelText('cURL command'), { target: { value: 'wget x' } });
    expect(screen.getByRole('alert')).toHaveTextContent('The command must start with curl.');
  });

  it('renders in Spanish', () => {
    render(
      <LocaleProvider locale="es">
        <CurlConvertTool />
      </LocaleProvider>,
    );
    fireEvent.change(screen.getByLabelText('Comando cURL'), { target: { value: "curl 'x" } });
    expect(screen.getByRole('alert')).toHaveTextContent("Comilla ' sin cerrar.");
    expect(screen.getByText(/no se guarda en la URL/)).toBeInTheDocument();
  });
});

describe('CurlConvertTool output placeholder', () => {
  it('previews the conversion of the placeholder command', async () => {
    render(<CurlConvertTool />);
    const placeholder = () => screen.getByLabelText('Output').getAttribute('placeholder');
    expect(placeholder()).toContain('fetch("https://api.example.com/v1/orders?dry_run=1"');
    await userEvent.click(screen.getByRole('button', { name: 'axios' }));
    expect(placeholder()).toContain('"sku": "A-1",');
  });
});
