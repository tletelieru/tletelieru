import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { LocaleProvider } from '~/i18n/react';
import RegexTool from './RegexTool';

function value(label: string): string {
  return (screen.getByLabelText(label) as HTMLTextAreaElement).value;
}

describe('RegexTool', () => {
  it('lists and highlights matches', () => {
    render(<RegexTool />);
    fireEvent.change(screen.getByLabelText('Pattern'), { target: { value: '(\\d+)' } });
    fireEvent.change(screen.getByLabelText('Test text'), { target: { value: 'a1 b22' } });
    expect(value('Matches')).toBe('#1 [1–2] "1"\n  $1 = "1"\n#2 [4–6] "22"\n  $1 = "22"');
    expect(screen.getByText('2 matches')).toBeInTheDocument();
    expect(screen.getByLabelText('Highlighted matches').querySelectorAll('mark')).toHaveLength(2);
  });

  it('toggles flags and previews replacements', async () => {
    window.history.replaceState(null, '', '/?pattern=a&input=AaA');
    render(<RegexTool />);
    await userEvent.click(screen.getByRole('button', { name: 'i (ignore case)' }));
    expect(screen.getByText('3 matches')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Replace with (optional)'), { target: { value: '-' } });
    expect(value('Replace preview')).toBe('---');
  });

  it('shows invalid pattern errors', () => {
    window.history.replaceState(null, '', '/?pattern=%5B&input=x');
    render(<RegexTool />);
    expect(screen.getByRole('alert')).toHaveTextContent('Invalid pattern:');
  });

  it('blocks risky patterns until allowed', async () => {
    window.history.replaceState(null, '', `/?pattern=${encodeURIComponent('(a+)+$')}&input=aaa`);
    render(<RegexTool />);
    expect(screen.getByRole('alert')).toHaveTextContent('nests quantifiers');
    await userEvent.click(screen.getByLabelText('Run risky pattern anyway'));
    expect(screen.getByText('1 match')).toBeInTheDocument();
  });

  it('renders in Spanish', () => {
    window.history.replaceState(null, '', '/?input=x');
    render(
      <LocaleProvider locale="es">
        <RegexTool />
      </LocaleProvider>,
    );
    expect(screen.getByLabelText('Patrón')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'i (ignorar mayúsculas)' })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Escribe un patrón.');
  });
});

describe('RegexTool output placeholder', () => {
  it('previews the matches of the placeholder text', () => {
    render(<RegexTool />);
    const placeholder = screen.getByLabelText('Matches').getAttribute('placeholder');
    expect(placeholder).toContain('#1 [8–23] "ana@example.com"');
    expect(placeholder).toContain('$<domain> = "mail.test.org"');
  });
});
