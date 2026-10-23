import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '~/i18n/react';
import CronTool from './CronTool';

function output(label = 'Next runs'): string {
  return (screen.getByLabelText(label, { selector: 'textarea' }) as HTMLTextAreaElement).value;
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-10-23T12:00:00Z') });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('CronTool', () => {
  it('describes the expression and lists the next runs in the zone', () => {
    render(<CronTool />);
    fireEvent.change(screen.getByLabelText('Cron expression'), {
      target: { value: '0 9 * * 1-5' },
    });
    expect(screen.getByRole('note')).toHaveTextContent('At 09:00, Monday through Friday');
    const lines = output().split('\n');
    expect(lines[0]).toBe('At 09:00, Monday through Friday');
    expect(lines.slice(2)).toHaveLength(5);
    expect(lines[2]).toContain('(2026-10-26T12:00:00.000Z)');
    expect(screen.getByText('5 fields')).toBeInTheDocument();
  });

  it('supports seconds and the run count from the URL', () => {
    window.history.replaceState(null, '', '/?zone=UTC&count=2&input=*%2F30%20*%20*%20*%20*%20*');
    render(<CronTool />);
    const lines = output().split('\n');
    expect(lines.slice(2)).toHaveLength(2);
    expect(lines[2]).toContain('(2026-10-23T12:00:30.000Z)');
    expect(screen.getByText('6 fields (with seconds)')).toBeInTheDocument();
  });

  it('shows errors', () => {
    window.history.replaceState(null, '', '/?input=*%20*%20*');
    render(<CronTool />);
    expect(screen.getByRole('alert')).toHaveTextContent('found 3');
  });

  it('renders in Spanish', () => {
    window.history.replaceState(null, '', '/?input=0%209%20*%20*%201-5');
    render(
      <LocaleProvider locale="es">
        <CronTool />
      </LocaleProvider>,
    );
    expect(screen.getByRole('note')).toHaveTextContent('A las 09:00, de lunes a viernes');
    expect(screen.getByRole('button', { name: 'Recalcular desde ahora' })).toBeInTheDocument();
  });
});

describe('CronTool output placeholder', () => {
  it('previews the placeholder expression', () => {
    render(<CronTool />);
    const placeholder = screen
      .getByLabelText('Next runs', { selector: 'textarea' })
      .getAttribute('placeholder');
    expect(placeholder).toContain(
      'Every 15 minutes, between 09:00 and 18:59, Monday through Friday',
    );
    expect(placeholder).toContain('(2026-10-23T12:15:00.000Z)');
  });
});
