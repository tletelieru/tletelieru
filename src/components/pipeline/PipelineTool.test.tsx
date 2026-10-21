import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '~/i18n/react';
import { pipelineOperations } from '~/lib/pipeline/operations';
import { pipelineMessages } from './messages';
import PipelineTool from './PipelineTool';

function finalOutput(label = 'Final output'): string {
  return (screen.getByLabelText(label) as HTMLTextAreaElement).value;
}

function stepCard(position: number, name = 'Step'): HTMLElement {
  return screen.getByRole('listitem', { name: `${name} ${position}` });
}

async function addStep(label: string) {
  await userEvent.click(screen.getByRole('button', { name: 'Add step' }));
  await userEvent.click(within(screen.getByRole('menu')).getByRole('menuitem', { name: label }));
}

describe('PipelineTool', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('shows empty-state hints and passes the input through without steps', () => {
    render(<PipelineTool />);
    expect(screen.getByText(/Paste some text, then add steps/)).toBeInTheDocument();
    expect(screen.getByText(/No steps yet/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Input'), { target: { value: 'abc' } });
    expect(finalOutput()).toBe('abc');
  });

  it('builds a pipeline through the UI and syncs it to the URL', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(<PipelineTool />);
    fireEvent.change(screen.getByLabelText('Input'), { target: { value: 'b\na\nb' } });
    await addStep('Remove duplicate lines');
    await addStep('Sort lines');
    expect(finalOutput()).toBe('a\nb');

    await userEvent.click(within(stepCard(2)).getByRole('combobox', { name: 'Order' }));
    await userEvent.click(screen.getByRole('option', { name: 'Descending' }));
    expect(finalOutput()).toBe('b\na');

    await addStep('SQL IN (text)');
    fireEvent.change(within(stepCard(3)).getByLabelText('Column'), { target: { value: 'id' } });
    expect(finalOutput()).toBe("id IN ('b', 'a')");

    await userEvent.click(within(stepCard(1)).getByRole('button', { name: 'Move down' }));
    expect(within(stepCard(1)).getByRole('combobox', { name: 'Operation' })).toHaveTextContent(
      'Sort lines',
    );

    await userEvent.click(within(stepCard(2)).getByRole('button', { name: 'Show output' }));
    expect(
      (within(stepCard(2)).getByLabelText('Output of step 2') as HTMLTextAreaElement).value,
    ).toBe('b\na');

    act(() => vi.advanceTimersByTime(300));
    const params = new URLSearchParams(window.location.search);
    expect(params.get('steps')).toBe('sort:order=desc|dedupe|sql-in-text:column=id');
    expect(params.get('input')).toBe('b\na\nb');

    await userEvent.click(within(stepCard(1)).getByRole('button', { name: 'Remove' }));
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(finalOutput()).toBe("id IN ('b', 'a')");
  });

  it('changes the operation of a step', async () => {
    window.history.replaceState(null, '', '/?input=hello&steps=upper');
    render(<PipelineTool />);
    expect(finalOutput()).toBe('HELLO');
    await userEvent.click(within(stepCard(1)).getByRole('combobox', { name: 'Operation' }));
    await userEvent.click(screen.getByRole('option', { name: 'Base64 encode' }));
    expect(finalOutput()).toBe('aGVsbG8=');
  });

  it('hydrates input and steps from the URL', () => {
    window.history.replaceState(
      null,
      '',
      `/?input=${encodeURIComponent('First Name\nlast name')}&steps=${encodeURIComponent('case:to=constant|join:sep=%3B')}`,
    );
    render(<PipelineTool />);
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(within(stepCard(1)).getByRole('combobox', { name: 'Convert to' })).toHaveTextContent(
      'CONSTANT_CASE',
    );
    expect(within(stepCard(2)).getByLabelText('Separator (\\n, \\t)')).toHaveValue(';');
    expect(finalOutput()).toBe('FIRST_NAME;LAST_NAME');
  });

  it('stops the chain at the first failing step', () => {
    window.history.replaceState(
      null,
      '',
      '/?input=%7B%22a%22%3A1%2C%7D&steps=trim|json-format|upper',
    );
    render(<PipelineTool />);
    expect(within(stepCard(2)).getByRole('alert')).toHaveTextContent(
      "Line 1, column 7: Trailing comma before '}' is not allowed",
    );
    expect(
      within(stepCard(3)).getByText(/Not run because a previous step failed/),
    ).toBeInTheDocument();
    expect(screen.getByText('The pipeline stopped at step 2.')).toBeInTheDocument();
    expect(finalOutput()).toBe('');
  });

  it('loads a preset and its sample input', async () => {
    render(<PipelineTool />);
    await userEvent.click(screen.getByRole('button', { name: 'Examples' }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'Base64 decode → JSON format' }));
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(finalOutput()).toContain('"name": "Ada"');
  });

  it('renders in Spanish inside a Spanish locale', () => {
    window.history.replaceState(null, '', '/?input=x&steps=rut-format');
    render(
      <LocaleProvider locale="es">
        <PipelineTool />
      </LocaleProvider>,
    );
    expect(screen.getByRole('button', { name: 'Agregar paso' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ejemplos' })).toBeInTheDocument();
    const card = stepCard(1, 'Paso');
    expect(within(card).getByRole('combobox', { name: 'Operación' })).toHaveTextContent(
      'Formatear RUT',
    );
    expect(within(card).getByRole('combobox', { name: 'Formato' })).toHaveTextContent(
      'Puntos y guion',
    );
    expect(within(card).getByRole('alert')).toHaveTextContent(
      'La línea 1 no es un identificador válido: x',
    );
    expect(screen.getByText('El pipeline se detuvo en el paso 1.')).toBeInTheDocument();
    expect(screen.getByLabelText('Resultado final')).toHaveValue('');
  });
});

describe('pipeline messages', () => {
  it('labels every operation, option and enum value in both locales', () => {
    for (const locale of ['en', 'es'] as const) {
      const t = pipelineMessages[locale];
      for (const operation of pipelineOperations) {
        expect(t.ops[operation.id]).toBeDefined();
        for (const spec of operation.options) {
          expect(t.options[spec.key]).toBeDefined();
        }
      }
      for (const id of ['html-encode', 'json-escape']) {
        const operation = pipelineOperations.find((item) => item.id === id);
        for (const spec of operation?.options ?? []) {
          if (spec.kind !== 'enum' || spec.values.includes('yes')) continue;
          for (const value of spec.values) expect(t.values[spec.key]?.[value]).toBeDefined();
        }
      }
    }
  });

  it('describes JSON unescape errors', () => {
    const bs = String.fromCharCode(92);
    const error = {
      code: 'json-unescape-invalid',
      data: { reason: 'invalid-escape', sequence: `${bs}x`, line: 2, column: 1 },
    };
    expect(pipelineMessages.en.error(error)).toBe(`Invalid escape ${bs}x at line 2, column 1.`);
    expect(pipelineMessages.es.error(error)).toBe(`Escape inválido ${bs}x en línea 2, columna 1.`);
  });
});
