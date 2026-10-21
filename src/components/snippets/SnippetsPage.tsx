import { useCallback, useId, useMemo, useState, type ChangeEvent } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useMessages } from '~/i18n/react';
import { collectTags, filterSnippets } from '~/lib/snippets/search';
import {
  exportFileName,
  mergeSnippets,
  parseSnippetFile,
  serializeSnippets,
} from '~/lib/snippets/transfer';
import { useLocalStore } from '~/lib/storage';
import {
  removeSnippet,
  saveSnippet,
  snippetsStore,
  updateSnippet,
  type Snippet,
  type SnippetDraft,
} from '~/lib/user-data/snippets';
import { CopyButton } from '../tools/_shared/CopyButton';
import { snippetsMessages } from './messages';
import { SnippetEditorDialog } from './SnippetEditorDialog';

interface Target {
  open: boolean;
  snippet: Snippet | null;
}

const closed: Target = { open: false, snippet: null };

type ImportNotice = { kind: 'done'; imported: number; skipped: number } | { kind: 'invalid' };

interface SnippetCardProps {
  snippet: Snippet;
  onEdit: (snippet: Snippet) => void;
  onDelete: (snippet: Snippet) => void;
}

function SnippetCard({ snippet, onEdit, onDelete }: SnippetCardProps) {
  const t = useMessages(snippetsMessages);
  const headingId = useId();
  const edit = useCallback(() => onEdit(snippet), [onEdit, snippet]);
  const remove = useCallback(() => onDelete(snippet), [onDelete, snippet]);

  return (
    <Card variant="outlined" component="article" aria-labelledby={headingId}>
      <CardContent>
        <Stack spacing={1}>
          <Typography id={headingId} variant="subtitle1" component="h3" sx={{ fontWeight: 600 }}>
            {snippet.title}
          </Typography>
          {snippet.tags.length > 0 && (
            <Stack direction="row" spacing={0.5} useFlexGap sx={{ flexWrap: 'wrap' }}>
              {snippet.tags.map((tag) => (
                <Chip key={tag} label={tag} size="small" variant="outlined" />
              ))}
            </Stack>
          )}
          <Box
            component="pre"
            sx={{
              m: 0,
              p: 1,
              maxHeight: 160,
              overflow: 'hidden',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              fontFamily: 'var(--sl-font-mono, ui-monospace, monospace)',
              fontSize: 13,
              bgcolor: 'action.hover',
              borderRadius: 1,
            }}
          >
            {snippet.content}
          </Box>
        </Stack>
      </CardContent>
      <CardActions>
        <CopyButton text={snippet.content} />
        <Button size="small" onClick={edit}>
          {t.edit}
        </Button>
        <Button size="small" color="error" onClick={remove}>
          {t.remove}
        </Button>
      </CardActions>
    </Card>
  );
}

export default function SnippetsPage() {
  const t = useMessages(snippetsMessages);
  const snippets = useLocalStore(snippetsStore);
  const [query, setQuery] = useState('');
  const [tag, setTag] = useState<string | null>(null);
  const [editor, setEditor] = useState<Target>(closed);
  const [pendingDelete, setPendingDelete] = useState<Target>(closed);
  const [notice, setNotice] = useState<ImportNotice | null>(null);

  const tags = useMemo(() => collectTags(snippets), [snippets]);
  const activeTag = tag && tags.includes(tag) ? tag : null;
  const visible = useMemo(
    () => filterSnippets(snippets, query, activeTag),
    [snippets, query, activeTag],
  );

  const onQuery = useCallback(
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setQuery(event.target.value),
    [],
  );
  const openNew = useCallback(() => setEditor({ open: true, snippet: null }), []);
  const openEdit = useCallback((snippet: Snippet) => setEditor({ open: true, snippet }), []);
  const closeEditor = useCallback(() => setEditor((current) => ({ ...current, open: false })), []);
  const askDelete = useCallback(
    (snippet: Snippet) => setPendingDelete({ open: true, snippet }),
    [],
  );
  const cancelDelete = useCallback(
    () => setPendingDelete((current) => ({ ...current, open: false })),
    [],
  );
  const closeNotice = useCallback(() => setNotice(null), []);

  const onSave = useCallback(
    (draft: SnippetDraft) => {
      if (editor.snippet) updateSnippet(editor.snippet.id, draft);
      else saveSnippet(draft);
    },
    [editor.snippet],
  );

  const confirmDelete = useCallback(() => {
    if (pendingDelete.snippet) removeSnippet(pendingDelete.snippet.id);
    setPendingDelete((current) => ({ ...current, open: false }));
  }, [pendingDelete.snippet]);

  const exportAll = useCallback(() => {
    const now = Date.now();
    const blob = new Blob([serializeSnippets(snippetsStore.get(), now)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = exportFileName(now);
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }, []);

  const importFile = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const parsed = typeof reader.result === 'string' ? parseSnippetFile(reader.result) : null;
      if (!parsed) {
        setNotice({ kind: 'invalid' });
        return;
      }
      const result = mergeSnippets(snippetsStore.get(), parsed.snippets);
      snippetsStore.set(result.snippets);
      setNotice({
        kind: 'done',
        imported: result.imported,
        skipped: result.skipped + parsed.invalid,
      });
    };
    reader.onerror = () => setNotice({ kind: 'invalid' });
    reader.readAsText(file);
  }, []);

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField
          size="small"
          type="search"
          label={t.search}
          placeholder={t.searchPlaceholder}
          value={query}
          onChange={onQuery}
          sx={{ flexGrow: 1, minWidth: 220 }}
        />
        <Button variant="contained" onClick={openNew}>
          {t.newSnippet}
        </Button>
        <Button variant="outlined" onClick={exportAll} disabled={snippets.length === 0}>
          {t.exportAll}
        </Button>
        <Button variant="outlined" component="label">
          {t.importFile}
          <input hidden type="file" accept="application/json,.json" onChange={importFile} />
        </Button>
      </Stack>

      {notice && (
        <Alert severity={notice.kind === 'done' ? 'success' : 'error'} onClose={closeNotice}>
          {notice.kind === 'done' ? t.importDone(notice.imported, notice.skipped) : t.importInvalid}
        </Alert>
      )}

      {tags.length > 0 && (
        <Stack
          direction="row"
          spacing={0.5}
          useFlexGap
          role="group"
          aria-label={t.tagFilter}
          sx={{ flexWrap: 'wrap' }}
        >
          <Chip
            label={t.allTags}
            color={activeTag === null ? 'primary' : 'default'}
            variant={activeTag === null ? 'filled' : 'outlined'}
            aria-pressed={activeTag === null}
            onClick={() => setTag(null)}
          />
          {tags.map((item) => (
            <Chip
              key={item}
              label={item}
              color={activeTag === item ? 'primary' : 'default'}
              variant={activeTag === item ? 'filled' : 'outlined'}
              aria-pressed={activeTag === item}
              onClick={() => setTag(activeTag === item ? null : item)}
            />
          ))}
        </Stack>
      )}

      {snippets.length === 0 ? (
        <Alert severity="info">
          <Typography variant="subtitle2" component="p">
            {t.emptyTitle}
          </Typography>
          {t.emptyBody}
        </Alert>
      ) : (
        <>
          <Typography variant="body2" color="text.secondary">
            {t.count(visible.length, snippets.length)}
          </Typography>
          {visible.length === 0 ? (
            <Typography color="text.secondary">{t.noMatches}</Typography>
          ) : (
            <Stack spacing={1.5}>
              {visible.map((snippet) => (
                <SnippetCard
                  key={snippet.id}
                  snippet={snippet}
                  onEdit={openEdit}
                  onDelete={askDelete}
                />
              ))}
            </Stack>
          )}
        </>
      )}

      <SnippetEditorDialog
        key={editor.snippet?.id ?? 'new'}
        open={editor.open}
        onClose={closeEditor}
        initial={editor.snippet ?? undefined}
        onSave={onSave}
      />

      <Dialog open={pendingDelete.open} onClose={cancelDelete}>
        <DialogTitle>{t.confirmTitle}</DialogTitle>
        <DialogContent>
          <DialogContentText>{t.confirmBody(pendingDelete.snippet?.title ?? '')}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelDelete}>{t.cancel}</Button>
          <Button color="error" variant="contained" onClick={confirmDelete}>
            {t.remove}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
