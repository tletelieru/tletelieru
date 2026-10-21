import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ZonePicker, zoneSearchText } from './ZonePicker';

describe('zoneSearchText', () => {
  it('includes the readable name and the UTC offset', () => {
    const text = zoneSearchText('America/Sao_Paulo', Date.UTC(2026, 0, 15));
    expect(text).toContain('America/Sao Paulo');
    expect(text).toContain('UTC-03:00');
  });
});

async function search(text: string) {
  const input = screen.getByRole('combobox', { name: 'Zone' });
  await userEvent.clear(input);
  await userEvent.type(input, text);
  return within(screen.getByRole('listbox')).getAllByRole('option');
}

describe('ZonePicker', () => {
  it('shows offsets next to each zone and filters by offset', async () => {
    render(<ZonePicker label="Zone" value="America/Santiago" onChange={vi.fn()} />);
    const options = await search('+05:30');
    expect(options.length).toBeGreaterThan(0);
    for (const option of options) expect(option).toHaveTextContent('UTC+05:30');
    expect(options.some((option) => option.textContent?.startsWith('Asia/'))).toBe(true);
  });

  it('keeps the zone name as the accessible name of each option', async () => {
    render(<ZonePicker label="Zone" value="America/Santiago" onChange={vi.fn()} />);
    await search('UTC');
    expect(screen.getByRole('option', { name: 'UTC' })).toHaveTextContent('UTC+00:00');
  });
});
