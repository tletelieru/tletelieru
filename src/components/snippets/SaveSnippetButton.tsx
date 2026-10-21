import { useCallback, useRef, useState } from 'react';
import Button from '@mui/material/Button';
import { useMessages } from '~/i18n/react';
import { saveSnippet, type SnippetDraft } from '~/lib/user-data/snippets';
import { useToolSlug } from '../tools/_shared/ToolContext';
import { snippetsMessages } from './messages';
import { SnippetEditorDialog } from './SnippetEditorDialog';

export interface SaveSnippetButtonProps {
  content: string;
  defaultTitle?: string;
  tags?: string[];
}

export function SaveSnippetButton({ content, defaultTitle, tags }: SaveSnippetButtonProps) {
  const t = useMessages(snippetsMessages);
  const slug = useToolSlug();
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const timerRef = useRef<number | undefined>(undefined);

  const openDialog = useCallback(() => setOpen(true), []);
  const closeDialog = useCallback(() => setOpen(false), []);

  const onSave = useCallback((draft: SnippetDraft) => {
    saveSnippet(draft);
    setSaved(true);
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setSaved(false), 1500);
  }, []);

  const initial: SnippetDraft = {
    title: defaultTitle ?? '',
    content,
    tags: tags ?? (slug ? [slug] : []),
  };

  return (
    <>
      <Button variant="outlined" size="small" disabled={!content} onClick={openDialog}>
        {saved ? t.saved : t.saveSnippet}
      </Button>
      <SnippetEditorDialog
        open={open}
        onClose={closeDialog}
        initial={initial}
        onSave={onSave}
        heading={t.saveSnippet}
      />
    </>
  );
}
