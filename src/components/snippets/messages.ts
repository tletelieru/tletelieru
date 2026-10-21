import { defineMessages } from '~/i18n/react';

export const snippetsMessages = defineMessages({
  en: {
    search: 'Search snippets',
    searchPlaceholder: 'Title, tag or content',
    allTags: 'All',
    tagFilter: 'Filter by tag',
    newSnippet: 'New snippet',
    exportAll: 'Export',
    importFile: 'Import',
    edit: 'Edit',
    remove: 'Delete',
    cancel: 'Cancel',
    save: 'Save',
    saveSnippet: 'Save snippet',
    saved: 'Saved',
    newTitle: 'New snippet',
    editTitle: 'Edit snippet',
    titleLabel: 'Title',
    tagsLabel: 'Tags',
    tagsHelp: 'Comma-separated, e.g. sql, postgres',
    contentLabel: 'Content',
    titleRequired: 'Add a title.',
    contentRequired: 'Add some content.',
    confirmTitle: 'Delete snippet?',
    confirmBody: (title: string) => `“${title}” will be removed from this browser.`,
    emptyTitle: 'No snippets yet',
    emptyBody:
      'Snippets are stored only in this browser (localStorage); nothing is sent anywhere. Use Export to back them up or move them to another device.',
    noMatches: 'No snippets match your search.',
    count: (shown: number, total: number) =>
      shown === total
        ? `${total} snippet${total === 1 ? '' : 's'}`
        : `${shown} of ${total} snippets`,
    importDone: (imported: number, skipped: number) =>
      `Imported ${imported} snippet${imported === 1 ? '' : 's'}, skipped ${skipped}.`,
    importInvalid: 'That file is not a valid snippets export.',
  },
  es: {
    search: 'Buscar snippets',
    searchPlaceholder: 'Título, etiqueta o contenido',
    allTags: 'Todos',
    tagFilter: 'Filtrar por etiqueta',
    newSnippet: 'Nuevo snippet',
    exportAll: 'Exportar',
    importFile: 'Importar',
    edit: 'Editar',
    remove: 'Eliminar',
    cancel: 'Cancelar',
    save: 'Guardar',
    saveSnippet: 'Guardar snippet',
    saved: 'Guardado',
    newTitle: 'Nuevo snippet',
    editTitle: 'Editar snippet',
    titleLabel: 'Título',
    tagsLabel: 'Etiquetas',
    tagsHelp: 'Separadas por comas, por ejemplo: sql, postgres',
    contentLabel: 'Contenido',
    titleRequired: 'Agrega un título.',
    contentRequired: 'Agrega contenido.',
    confirmTitle: '¿Eliminar snippet?',
    confirmBody: (title: string) => `Se eliminará “${title}” de este navegador.`,
    emptyTitle: 'Aún no hay snippets',
    emptyBody:
      'Los snippets se guardan solo en este navegador (localStorage); no se envía nada a ningún lado. Usa Exportar para respaldarlos o llevarlos a otro dispositivo.',
    noMatches: 'Ningún snippet coincide con la búsqueda.',
    count: (shown: number, total: number) =>
      shown === total
        ? `${total} snippet${total === 1 ? '' : 's'}`
        : `${shown} de ${total} snippets`,
    importDone: (imported: number, skipped: number) =>
      `Snippets importados: ${imported}. Omitidos: ${skipped}.`,
    importInvalid: 'El archivo no es una exportación de snippets válida.',
  },
});
