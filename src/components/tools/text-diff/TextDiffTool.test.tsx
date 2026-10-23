import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { LocaleProvider } from '~/i18n/react';
import TextDiffTool from './TextDiffTool';

function patch(label = 'Unified diff'): string {
  return (screen.getByLabelText(label) as HTMLTextAreaElement).value;
}

describe('TextDiffTool', () => {
  it('diffs two texts with counts and a unified patch', () => {
    render(<TextDiffTool />);
    fireEvent.change(screen.getByLabelText('Original'), { target: { value: 'a\nb' } });
    fireEvent.change(screen.getByLabelText('Changed'), { target: { value: 'a\nc' } });
    expect(screen.getByText('+1 added · −1 removed')).toBeInTheDocument();
    expect(patch()).toBe('--- original\n+++ changed\n@@ -1,2 +1,2 @@\n a\n-b\n+c');
    const visual = screen.getByLabelText('Line diff');
    expect(visual.querySelectorAll('[data-kind="removed"]')).toHaveLength(1);
    expect(visual.querySelectorAll('[data-kind="added"]')).toHaveLength(1);
  });

  it('ignores case and whitespace', async () => {
    window.history.replaceState(null, '', '/?input=Hello%20%20World&changed=hello%20world');
    render(<TextDiffTool />);
    await userEvent.click(screen.getByLabelText('Ignore whitespace'));
    await userEvent.click(screen.getByLabelText('Ignore case'));
    expect(screen.getByText('No differences.')).toBeInTheDocument();
    expect(patch()).toBe('');
  });

  it('switches to the unified view', async () => {
    window.history.replaceState(null, '', '/?input=a&changed=b');
    render(<TextDiffTool />);
    await userEvent.click(screen.getByRole('button', { name: 'Unified' }));
    expect(screen.getByLabelText('Line diff').querySelectorAll('[data-kind]')).toHaveLength(2);
  });

  it('renders in Spanish', () => {
    window.history.replaceState(null, '', '/?input=a&changed=a%0Ab');
    render(
      <LocaleProvider locale="es">
        <TextDiffTool />
      </LocaleProvider>,
    );
    expect(screen.getByLabelText('Modificado')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Lado a lado' })).toBeInTheDocument();
    expect(screen.getByText('+1 agregadas · −0 eliminadas')).toBeInTheDocument();
  });
});

describe('TextDiffTool output placeholder', () => {
  it('previews the diff of the placeholders', () => {
    render(<TextDiffTool />);
    expect(screen.getByLabelText('Unified diff').getAttribute('placeholder')).toContain(
      '-banana\n+blueberry',
    );
  });
});
