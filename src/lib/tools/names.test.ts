import { describe, expect, it } from 'vitest';
import {
  buildNormalizeOptions,
  defaultNameSettings,
  formatAll,
  formatLine,
  formatLines,
  presetStripsAccents,
  resolveNameSettings,
  splitParts,
  type NameSettings,
} from './names';

function settings(patch: Partial<NameSettings> = {}): NameSettings {
  return { ...defaultNameSettings, ...patch };
}

describe('resolveNameSettings', () => {
  it('keeps known values and falls back on unknown ones', () => {
    expect(
      resolveNameSettings({
        format: 'upper',
        strategy: 'particle',
        convention: 'single',
        preset: 'email',
        enye: 'ni',
        apostrophe: 'space',
        hyphen: 'remove',
        stripAccents: true,
      }),
    ).toEqual({
      format: 'upper',
      strategy: 'particle',
      convention: 'single',
      preset: 'email',
      enye: 'ni',
      apostrophe: 'space',
      hyphen: 'remove',
      stripAccents: true,
    });
    expect(
      resolveNameSettings({
        format: 'shout',
        strategy: 'surnameCount',
        convention: 'triple',
        preset: 'latin1',
        enye: 'x',
        apostrophe: '-',
        hyphen: '_',
        stripAccents: false,
      }),
    ).toEqual(defaultNameSettings);
  });
});

describe('buildNormalizeOptions', () => {
  it('returns undefined when nothing is set', () => {
    expect(buildNormalizeOptions(settings())).toBeUndefined();
  });

  it('only includes the rules that are set', () => {
    expect(buildNormalizeOptions(settings({ preset: 'ascii', enye: 'keep' }))).toEqual({
      preset: 'ascii',
      enye: 'keep',
    });
    expect(
      buildNormalizeOptions(
        settings({ stripAccents: true, apostrophe: 'remove', hyphen: 'space' }),
      ),
    ).toEqual({ stripAccents: true, apostrophe: 'remove', hyphen: 'space' });
  });

  it('knows which presets strip accents', () => {
    expect(presetStripsAccents('ascii')).toBe(true);
    expect(presetStripsAccents('email')).toBe(true);
    expect(presetStripsAccents('strict')).toBe(false);
    expect(presetStripsAccents('none')).toBe(false);
  });
});

describe('formatLine', () => {
  it.each([
    ['MARÍA DE LOS ÁNGELES MATUS DE LA PARRA', 'María de los Ángeles Matus de la Parra'],
    ['juan de la fuente rojas', 'Juan de la Fuente Rojas'],
    ["bernardo o'higgins riquelme", "Bernardo O'Higgins Riquelme"],
    ['ana maría pérez-cotapos soto', 'Ana María Pérez-Cotapos Soto'],
  ])('formats %j as a name', (input, expected) => {
    expect(formatLine(input, settings())).toBe(expected);
  });

  it('uses the chosen format', () => {
    expect(formatLine('juan de la fuente rojas', settings({ format: 'upper' }))).toBe(
      'JUAN DE LA FUENTE ROJAS',
    );
    expect(formatLine('juan de la fuente rojas', settings({ format: 'capitalize' }))).toBe(
      'Juan De La Fuente Rojas',
    );
  });

  it('normalizes before formatting', () => {
    const name = "María José Muñoz O'Higgins";
    expect(formatLine(name, settings({ preset: 'ascii' }))).toBe('Maria Jose Munoz Ohiggins');
    expect(formatLine(name, settings({ preset: 'email', format: 'lower' }))).toBe(
      'mariajosemunozohiggins',
    );
    expect(formatLine(name, settings({ enye: 'ni' }))).toBe("María José Munioz O'Higgins");
    expect(formatLine(name, settings({ stripAccents: true }))).toBe("Maria Jose Munoz O'Higgins");
    expect(formatLine(name, settings({ preset: 'ascii', enye: 'keep' }))).toBe(
      'Maria Jose Muñoz Ohiggins',
    );
    expect(
      formatLine(
        "ana pérez-cotapos o'higgins",
        settings({ hyphen: 'space', apostrophe: 'remove' }),
      ),
    ).toBe('Ana Pérez Cotapos Ohiggins');
  });

  it('keeps blank lines blank', () => {
    expect(formatLine('   ', settings())).toBe('');
  });
});

describe('formatLines', () => {
  it('formats every line and keeps blank ones', () => {
    expect(
      formatLines('MARÍA JOSÉ MUÑOZ NÚÑEZ\n\r\njuan de la fuente rojas', settings({ enye: 'n' })),
    ).toBe('María José Munoz Núnez\n\nJuan de la Fuente Rojas');
  });
});

describe('formatAll', () => {
  it('lists every format', () => {
    expect(formatAll('pedro soto de la vega', settings())).toEqual([
      { id: 'upper', value: 'PEDRO SOTO DE LA VEGA' },
      { id: 'lower', value: 'pedro soto de la vega' },
      { id: 'capitalize', value: 'Pedro Soto De La Vega' },
      { id: 'capitalizeName', value: 'Pedro Soto de la Vega' },
    ]);
  });
});

describe('splitParts', () => {
  it('splits the formatted name into the six parts', () => {
    expect(splitParts('JOSÉ MIGUEL CARRERA VERDUGO', settings())).toEqual([
      { id: 'givenNames', value: 'José Miguel' },
      { id: 'surnames', value: 'Carrera Verdugo' },
      { id: 'firstName', value: 'José' },
      { id: 'middleName', value: 'Miguel' },
      { id: 'firstSurname', value: 'Carrera' },
      { id: 'secondSurname', value: 'Verdugo' },
    ]);
  });

  it('follows the split strategy', () => {
    const values = (name: string, patch: Partial<NameSettings>) =>
      Object.fromEntries(splitParts(name, settings(patch)).map((part) => [part.id, part.value]));
    expect(values('juan de la fuente rojas', {})).toMatchObject({
      givenNames: 'Juan',
      firstSurname: 'de la Fuente',
      secondSurname: 'Rojas',
    });
    expect(values('juan de la fuente rojas', { strategy: 'particle' })).toMatchObject({
      givenNames: 'Juan de la Fuente',
      surnames: 'Rojas',
    });
    const longName = 'MARÍA DE LOS ÁNGELES MATUS DE LA PARRA';
    expect(values(longName, {})).toMatchObject({
      firstName: 'María de los Ángeles',
      firstSurname: 'Matus de la Parra',
      secondSurname: '',
    });
    expect(values(longName, { strategy: 'lastTwo' })).toMatchObject({
      firstName: 'María de los Ángeles',
      middleName: '',
      firstSurname: 'Matus',
      secondSurname: 'de la Parra',
    });
  });

  it('follows the surname convention', () => {
    const parts = Object.fromEntries(
      splitParts('Pedro Soto de la Vega', settings({ convention: 'single' })).map((part) => [
        part.id,
        part.value,
      ]),
    );
    expect(parts).toEqual({
      givenNames: 'Pedro Soto',
      surnames: 'de la Vega',
      firstName: 'Pedro',
      middleName: 'Soto',
      firstSurname: 'de la Vega',
      secondSurname: '',
    });
  });

  it('returns empty parts for a blank name', () => {
    expect(splitParts('  ', settings()).every((part) => part.value === '')).toBe(true);
  });
});
