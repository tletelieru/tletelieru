import { useCallback, useId, useState, type ChangeEvent, type SubmitEvent } from 'react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { useMessages } from '~/i18n/react';
import { formatTagInput, parseTagInput, validateDraft } from '~/lib/snippets/draft';
import type { SnippetDraft } from '~/lib/user-data/snippets';
import { CodeField } from '../tools/_shared/CodeField';
import { snippetsMessages } from './messages';

export interface SnippetEditorDialogProps {
  open: boolean;
  onClose: () => void;
  initial?: SnippetDraft;
  onSave: (draft: SnippetDraft) => void;
  heading?: string;
}

type FormProps = Omit<SnippetEditorDialogProps, 'open'>;

function EditorForm({ onClose, initial, onSave, heading }: FormProps) {
  const t = useMessages(snippetsMessages);
  const id = useId();
  const [title, setTitle] = useState(initial?.title ?? '');
  const [tags, setTags] = useState(formatTagInput(initial?.tags ?? []));
  const [content, setContent] = useState(initial?.content ?? '');
  const [touched, setTouched] = useState(false);

  const draft: SnippetDraft = { title, content, tags: parseTagInput(tags) };
  const errors = validateDraft(draft);
  const showTitleError = touched && errors.title;
  const showContentError = touched && errors.content;

  const onTitle = useCallback(
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setTitle(event.target.value),
    [],
  );
  const onTags = useCallback(
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setTags(event.target.value),
    [],
  );
  const onContent = useCallback(
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setContent(event.target.value),
    [],
  );

  const submit = useCallback(
    (event: SubmitEvent<HTMLFormElement>) => {
      event.preventDefault();
      const next: SnippetDraft = { title, content, tags: parseTagInput(tags) };
      const result = validateDraft(next);
      if (result.title || result.content) {
        setTouched(true);
        return;
      }
      onSave(next);
      onClose();
    },
    [title, content, tags, onSave, onClose],
  );

  return (
    <form onSubmit={submit} noValidate>
      <DialogTitle id={`${id}-title`}>
        {heading ?? (initial ? t.editTitle : t.newTitle)}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField
            id={`${id}-name`}
            label={t.titleLabel}
            value={title}
            onChange={onTitle}
            required
            autoFocus
            error={showTitleError}
            helperText={showTitleError ? t.titleRequired : undefined}
          />
          <TextField
            id={`${id}-tags`}
            label={t.tagsLabel}
            value={tags}
            onChange={onTags}
            helperText={t.tagsHelp}
          />
          <CodeField
            id={`${id}-content`}
            label={t.contentLabel}
            value={content}
            onChange={onContent}
            required
            minRows={8}
            error={showContentError}
            helperText={showContentError ? t.contentRequired : undefined}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t.cancel}</Button>
        <Button type="submit" variant="contained">
          {t.save}
        </Button>
      </DialogActions>
    </form>
  );
}

export function SnippetEditorDialog({ open, ...props }: SnippetEditorDialogProps) {
  return (
    <Dialog open={open} onClose={props.onClose} fullWidth maxWidth="md">
      <EditorForm {...props} />
    </Dialog>
  );
}
