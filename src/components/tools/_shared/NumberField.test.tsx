import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { clampInt } from '~/lib/tools/_shared/lines';
import { NumberField } from './NumberField';

function Clamped() {
  const [value, setValue] = useState(4);
  return (
    <NumberField
      label="Length"
      value={value}
      onChange={(event) => setValue(clampInt(Number(event.target.value), 4, 256))}
    />
  );
}

describe('NumberField', () => {
  it('lets the last digit be deleted and keeps the value', () => {
    render(<Clamped />);
    const input = screen.getByLabelText('Length') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '' } });
    expect(input.value).toBe('');
    fireEvent.blur(input);
    expect(input.value).toBe('4');
  });

  it('shows what is typed and clamps on blur', () => {
    render(<Clamped />);
    const input = screen.getByLabelText('Length') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '1' } });
    expect(input.value).toBe('1');
    fireEvent.change(input, { target: { value: '12' } });
    expect(input.value).toBe('12');
    fireEvent.change(input, { target: { value: '1' } });
    fireEvent.blur(input);
    expect(input.value).toBe('4');
  });
});
