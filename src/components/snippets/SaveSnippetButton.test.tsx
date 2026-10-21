import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { LocaleProvider } from '~/i18n/react';
import { snippetsStore } from '~/lib/user-data/snippets';
import { ToolProvider } from '../tools/_shared/ToolContext';
import { SaveSnippetButton } from './SaveSnippetButton';

describe('SaveSnippetButton', () => {
  afterEach(() => window.localStorage.clear());

  it('saves the prefilled content and confirms', async () => {
    const user = userEvent.setup();
    render(
      <ToolProvider slug="sql-in-text">
        <SaveSnippetButton content="IN ('a', 'b')" defaultTitle="SQL IN" />
      </ToolProvider>,
    );
    await user.click(screen.getByRole('button', { name: 'Save snippet' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByLabelText(/Title/)).toHaveValue('SQL IN');
    expect(within(dialog).getByLabelText(/Tags/)).toHaveValue('sql-in-text');
    expect(within(dialog).getByLabelText(/Content/)).toHaveValue("IN ('a', 'b')");
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Saved' })).toBeInTheDocument();
    expect(snippetsStore.get()).toEqual([
      expect.objectContaining({ title: 'SQL IN', content: "IN ('a', 'b')", tags: ['sql-in-text'] }),
    ]);
  });

  it('uses explicit tags and is disabled without content', () => {
    const { rerender } = render(<SaveSnippetButton content="" />);
    expect(screen.getByRole('button', { name: 'Save snippet' })).toBeDisabled();
    rerender(
      <LocaleProvider locale="es">
        <SaveSnippetButton content="x" tags={['a']} />
      </LocaleProvider>,
    );
    expect(screen.getByRole('button', { name: 'Guardar snippet' })).toBeEnabled();
  });
});
