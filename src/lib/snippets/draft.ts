import { normalizeTags, type SnippetDraft } from '../user-data/snippets';

export interface DraftErrors {
  title: boolean;
  content: boolean;
}

export function parseTagInput(text: string): string[] {
  return normalizeTags(text.split(','));
}

export function formatTagInput(tags: readonly string[]): string {
  return tags.join(', ');
}

export function validateDraft(draft: SnippetDraft): DraftErrors {
  return { title: !draft.title.trim(), content: !draft.content.trim() };
}

export function isDraftValid(draft: SnippetDraft): boolean {
  const errors = validateDraft(draft);
  return !errors.title && !errors.content;
}
