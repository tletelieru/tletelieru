import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import RutTool from './RutTool';

describe('RutTool', () => {
  it('validates each line and shows a summary', async () => {
    render(<RutTool />);
    await userEvent.type(
      screen.getByLabelText('RUTs, one per line'),
      '12345678-5{enter}12345678-9',
    );

    const output = screen.getByLabelText('Output') as HTMLTextAreaElement;
    expect(output.value).toBe(
      '12.345.678-5  ✔ valid\n12345678-9  ✘ wrong check digit (expected 5)',
    );
    expect(screen.getByText('1 / 2 valid')).toBeInTheDocument();
  });

  it('hydrates mode and options from the URL', () => {
    window.history.replaceState(null, '', '/?mode=format&dots=0&input=12.345.678-5');
    render(<RutTool />);
    expect((screen.getByLabelText('Output') as HTMLTextAreaElement).value).toBe('12345678-5');
  });

  it('generates the requested amount of RUTs', () => {
    window.history.replaceState(null, '', '/?mode=generate&count=3');
    render(<RutTool />);
    const values = (screen.getByLabelText('Output') as HTMLTextAreaElement).value.split('\n');
    expect(values).toHaveLength(3);
  });
});
