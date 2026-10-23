import { afterEach, describe, expect, it, vi } from 'vitest';
import { resetToolEvents, trackToolEvent } from './analytics';

type CountWindow = Window & { goatcounter?: { count?: (vars: unknown) => void } };

afterEach(() => {
  delete (window as CountWindow).goatcounter;
  resetToolEvents();
});

describe('trackToolEvent', () => {
  it('sends a tool event to GoatCounter with only the slug', () => {
    const count = vi.fn();
    (window as CountWindow).goatcounter = { count };
    trackToolEvent('copied', 'rut');
    trackToolEvent('copied', 'rut');
    expect(count).toHaveBeenCalledTimes(2);
    expect(count).toHaveBeenCalledWith({ path: 'tool-copied/rut', title: 'rut', event: true });
  });

  it('counts "used" once per tool and visit', () => {
    const count = vi.fn();
    (window as CountWindow).goatcounter = { count };
    trackToolEvent('used', 'rut');
    trackToolEvent('used', 'rut');
    trackToolEvent('used', 'cpf');
    expect(count.mock.calls.map(([vars]) => (vars as { path: string }).path)).toEqual([
      'tool-used/rut',
      'tool-used/cpf',
    ]);
  });

  it('does nothing without a slug or before the script loads', () => {
    const count = vi.fn();
    trackToolEvent('used', 'rut');
    (window as CountWindow).goatcounter = { count };
    trackToolEvent('copied', null);
    expect(count).not.toHaveBeenCalled();
  });
});
