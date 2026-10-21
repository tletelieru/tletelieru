import { useMemo, useState } from 'react';
import Button from '@mui/material/Button';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import { formatRut, generateRuts, validateRut } from '~/lib/tools/rut';
import { clampInt, nonEmptyLines } from '~/lib/tools/_shared/lines';
import { useUrlState } from '~/lib/url-state';
import { CodeField } from '../_shared/CodeField';
import { OutputPanel } from '../_shared/OutputPanel';
import { ToolLayout } from '../_shared/ToolLayout';

type Mode = 'validate' | 'format' | 'generate';

const defaults = { mode: 'validate', input: '', dots: true, count: 10 };

function describeLine(line: string): string {
  const result = validateRut(line);
  if (result.valid) return `${result.formatted}  ✔ valid`;
  if (result.reason === 'dv') return `${line}  ✘ wrong check digit (expected ${result.expectedDv})`;
  return `${line}  ✘ not a RUT`;
}

export default function RutTool() {
  const [state, update] = useUrlState(defaults);
  const mode = state.mode as Mode;
  const [generated, setGenerated] = useState(() =>
    generateRuts({ count: clampInt(state.count, 1, 1000) }),
  );

  const lines = useMemo(() => nonEmptyLines(state.input), [state.input]);

  const output = useMemo(() => {
    if (mode === 'generate') {
      return generated.map((rut) => formatRut(rut, { dots: state.dots }) ?? rut).join('\n');
    }
    if (mode === 'format') {
      return lines
        .map((line) => formatRut(line, { dots: state.dots }) ?? `${line}  ✘ not a RUT`)
        .join('\n');
    }
    return lines.map(describeLine).join('\n');
  }, [mode, generated, lines, state.dots]);

  const validCount = useMemo(
    () => (mode === 'validate' ? lines.filter((line) => validateRut(line).valid).length : 0),
    [mode, lines],
  );

  const regenerate = (count = state.count) =>
    setGenerated(generateRuts({ count: clampInt(count, 1, 1000) }));

  return (
    <ToolLayout
      options={
        <>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={mode}
            onChange={(_, value: Mode | null) => value && update({ mode: value })}
            aria-label="Mode"
          >
            <ToggleButton value="validate">Validate</ToggleButton>
            <ToggleButton value="format">Format</ToggleButton>
            <ToggleButton value="generate">Generate</ToggleButton>
          </ToggleButtonGroup>
          {mode !== 'validate' ? (
            <FormControlLabel
              control={
                <Switch
                  checked={state.dots}
                  onChange={(event) => update({ dots: event.target.checked })}
                />
              }
              label="Dots (12.345.678-5)"
            />
          ) : null}
          {mode === 'generate' ? (
            <>
              <TextField
                type="number"
                label="How many"
                value={state.count}
                sx={{ width: 120 }}
                fullWidth={false}
                slotProps={{ htmlInput: { min: 1, max: 1000 } }}
                onChange={(event) => {
                  const count = clampInt(Number(event.target.value), 1, 1000);
                  update({ count });
                  regenerate(count);
                }}
              />
              <Button variant="outlined" onClick={() => regenerate()}>
                Generate again
              </Button>
            </>
          ) : null}
        </>
      }
      input={
        mode === 'generate' ? null : (
          <CodeField
            label="RUTs, one per line"
            placeholder={'12.345.678-5\n11111111-1\n10000013k'}
            value={state.input}
            onChange={(event) => update({ input: event.target.value })}
          />
        )
      }
      output={
        <OutputPanel
          value={output}
          actions={
            mode === 'validate' && lines.length ? (
              <Typography variant="body2" color="text.secondary">
                {validCount} / {lines.length} valid
              </Typography>
            ) : null
          }
        />
      }
    />
  );
}
