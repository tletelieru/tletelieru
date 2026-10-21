import { Suspense } from 'react';
import Alert from '@mui/material/Alert';
import LinearProgress from '@mui/material/LinearProgress';
import { toolComponents } from './components';
import { ToolRoot } from './_shared/ToolRoot';

export default function ToolIsland({ slug }: { slug: string }) {
  const Tool = toolComponents[slug];
  return (
    <ToolRoot>
      {Tool ? (
        <Suspense fallback={<LinearProgress />}>
          <Tool />
        </Suspense>
      ) : (
        <Alert severity="error">Unknown tool: {slug}</Alert>
      )}
    </ToolRoot>
  );
}
