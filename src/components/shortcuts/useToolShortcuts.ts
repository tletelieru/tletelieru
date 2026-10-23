import { useCallback, useRef, useState, type KeyboardEvent } from 'react';
import { useMessages } from '~/i18n/react';
import { trackToolEvent } from '~/lib/analytics';
import { matchShortcut } from '~/lib/shortcuts';
import { useToolContext } from '../tools/_shared/ToolContext';
import { shortcutMessages } from './messages';

export const NOTICE_DURATION = 2500;

export interface ToolShortcuts {
  onKeyDown: (event: KeyboardEvent) => void;
  notice: string | null;
  dismiss: () => void;
}

export function useToolShortcuts(): ToolShortcuts {
  const { slug, inputRef, outputRef } = useToolContext();
  const t = useMessages(shortcutMessages);
  const [notice, setNotice] = useState<string | null>(null);
  const timerRef = useRef<number | undefined>(undefined);

  const show = useCallback((message: string) => {
    window.clearTimeout(timerRef.current);
    setNotice(message);
    timerRef.current = window.setTimeout(() => setNotice(null), NOTICE_DURATION);
  }, []);

  const dismiss = useCallback(() => {
    window.clearTimeout(timerRef.current);
    setNotice(null);
  }, []);

  const onKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const action = matchShortcut(event);
      if (!action) return;
      const input = inputRef.current;
      const output = outputRef.current?.value ?? '';

      if (action === 'copy-output') {
        event.preventDefault();
        if (!output) {
          show(t.nothingToCopy);
          return;
        }
        Promise.resolve()
          .then(() => navigator.clipboard.writeText(output))
          .then(
            () => {
              trackToolEvent('copied', slug);
              show(t.copied);
            },
            () => show(t.copyFailed),
          );
        return;
      }

      if (!input) return;
      event.preventDefault();

      if (action === 'clear-input') {
        input.set('');
        show(t.cleared);
        return;
      }

      if (!output) {
        show(t.nothingToMove);
        return;
      }
      input.set(output);
      show(t.swapped);
    },
    [slug, inputRef, outputRef, show, t],
  );

  return { onKeyDown, notice, dismiss };
}
