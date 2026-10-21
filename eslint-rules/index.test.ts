import { RuleTester, type Rule } from 'eslint';
import tseslint from 'typescript-eslint';
import { afterAll, describe, it } from 'vitest';
import local from './index.js';

Object.assign(RuleTester, { afterAll, describe, it, itOnly: it.only });

const rules = local.rules as unknown as Record<string, Rule.RuleModule>;

const tester = new RuleTester({
  languageOptions: {
    parser: tseslint.parser,
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

tester.run('prefer-logical-and', rules['prefer-logical-and'], {
  valid: [
    'const a = <div>{open && <span />}</div>;',
    'const a = <div>{open ? <span /> : <b />}</div>;',
    'const label = open ? "a" : null;',
    'const value = list.length ? list[0] : null;',
    'const a = <Panel error={failed ? message : null} />;',
    'const a = <Panel error={ok ? null : message} />;',
  ],
  invalid: [
    {
      code: 'const a = <div>{open ? <span /> : null}</div>;',
      output: 'const a = <div>{open && <span />}</div>;',
      errors: [{ messageId: 'useAnd' }],
    },
    {
      code: 'const a = <div>{open ? null : <span />}</div>;',
      output: 'const a = <div>{!open && <span />}</div>;',
      errors: [{ messageId: 'useAnd' }],
    },
    {
      code: 'const a = <div>{mode !== "x" ? <span /> : null}</div>;',
      output: 'const a = <div>{mode !== "x" && <span />}</div>;',
      errors: [{ messageId: 'useAnd' }],
    },
    {
      code: 'const a = <div>{mode === "x" ? null : <span />}</div>;',
      output: 'const a = <div>{!(mode === "x") && <span />}</div>;',
      errors: [{ messageId: 'useAnd' }],
    },
    {
      code: 'const a = <div>{a || b ? <span /> : null}</div>;',
      output: 'const a = <div>{(a || b) && <span />}</div>;',
      errors: [{ messageId: 'useAnd' }],
    },
    {
      code: 'const a = <div>{lines.length ? <span /> : null}</div>;',
      output: 'const a = <div>{lines.length > 0 && <span />}</div>;',
      errors: [{ messageId: 'useAnd' }],
    },
    {
      code: 'const a = <div>{mode === "v" && lines.length ? <span /> : null}</div>;',
      output: 'const a = <div>{mode === "v" && lines.length && <span />}</div>;',
      errors: [{ messageId: 'useAnd' }],
    },
    {
      code: 'const a = <Panel actions={open ? <span /> : null} />;',
      output: 'const a = <Panel actions={open && <span />} />;',
      errors: [{ messageId: 'useAnd' }],
    },
    {
      code: 'const a = <p>{done ? "ok" : null}</p>;',
      output: 'const a = <p>{done && "ok"}</p>;',
      errors: [{ messageId: 'useAnd' }],
    },
  ],
});

tester.run('no-leaked-length', rules['no-leaked-length'], {
  valid: [
    'const a = <div>{items.length > 0 && <span />}</div>;',
    'const ok = items.length && compute();',
  ],
  invalid: [
    {
      code: 'const a = <div>{items.length && <span />}</div>;',
      output: 'const a = <div>{items.length > 0 && <span />}</div>;',
      errors: [{ messageId: 'compare' }],
    },
    {
      code: 'const a = <div>{mode === "v" && lines.length && <span />}</div>;',
      output: 'const a = <div>{mode === "v" && lines.length > 0 && <span />}</div>;',
      errors: [{ messageId: 'compare' }],
    },
    {
      code: 'const a = <div>{a.length && b.length && <span />}</div>;',
      output: 'const a = <div>{a.length > 0 && b.length > 0 && <span />}</div>;',
      errors: [{ messageId: 'compare' }, { messageId: 'compare' }],
    },
  ],
});
