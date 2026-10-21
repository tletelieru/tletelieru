import { splitValues } from '../tools/sql/values';
import { getTool } from '../tools/registry';
import {
  detectors,
  largeDetectors,
  MAX_LINES,
  type DetectContext,
  type Detection,
  type Detector,
} from './detectors';

export type { Detection } from './detectors';

export const MAX_DETECT_LENGTH = 200 * 1024;

function buildContext(text: string): DetectContext {
  const trimmed = text.trim();
  const large = text.length > MAX_DETECT_LENGTH;
  if (large) return { text, trimmed, lines: [], values: [], large };
  const lines = trimmed
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const values = lines.length > MAX_LINES ? [] : splitValues(trimmed);
  return { text, trimmed, lines: lines.length > MAX_LINES ? [] : lines, values, large };
}

function safeRun(detector: Detector, context: DetectContext): Detection[] {
  try {
    return detector(context);
  } catch {
    return [];
  }
}

export function detectInput(text: string): Detection[] {
  if (typeof text !== 'string' || !text.trim()) return [];
  const context = buildContext(text);
  const list = context.large ? largeDetectors : detectors;
  const best = new Map<string, { detection: Detection; order: number }>();
  let order = 0;
  for (const detector of list) {
    for (const detection of safeRun(detector, context)) {
      if (!getTool(detection.slug)) continue;
      const current = best.get(detection.slug);
      if (!current || detection.confidence > current.detection.confidence) {
        best.set(detection.slug, { detection, order: current?.order ?? order });
      }
      order++;
    }
  }
  return [...best.values()]
    .sort((a, b) => b.detection.confidence - a.detection.confidence || a.order - b.order)
    .map((entry) => entry.detection);
}
