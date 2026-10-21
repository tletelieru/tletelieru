const PAREN_FREE = new Set([
  'Identifier',
  'MemberExpression',
  'CallExpression',
  'ChainExpression',
  'Literal',
  'TemplateLiteral',
  'UnaryExpression',
  'BinaryExpression',
  'TSNonNullExpression',
  'ThisExpression',
]);

function isNull(node) {
  return node.type === 'Literal' && node.value === null;
}

function isElement(node) {
  return node.type === 'JSXElement' || node.type === 'JSXFragment';
}

function isLengthAccess(node) {
  const target = node.type === 'ChainExpression' ? node.expression : node;
  return (
    target.type === 'MemberExpression' &&
    !target.computed &&
    target.property.type === 'Identifier' &&
    target.property.name === 'length'
  );
}

function isChildPosition(node) {
  const container = node.parent;
  return (
    container.type === 'JSXExpressionContainer' &&
    (container.parent.type === 'JSXElement' || container.parent.type === 'JSXFragment')
  );
}

function isAndChain(node) {
  return node.type === 'LogicalExpression' && node.operator === '&&';
}

function flattenAnd(node) {
  return isAndChain(node) ? [...flattenAnd(node.left), ...flattenAnd(node.right)] : [node];
}

function needsParens(node) {
  if (node.type === 'LogicalExpression') return node.operator !== '&&';
  return !PAREN_FREE.has(node.type);
}

function asOperand(node, text) {
  return needsParens(node) ? `(${text})` : text;
}

function condition(node, text, negate) {
  if (negate) {
    const operand =
      PAREN_FREE.has(node.type) && node.type !== 'BinaryExpression' ? text : `(${text})`;
    return `!${operand}`;
  }
  if (isLengthAccess(node)) return `${text} > 0`;
  return asOperand(node, text);
}

const preferLogicalAnd = {
  meta: {
    type: 'suggestion',
    fixable: 'code',
    schema: [],
    messages: {
      useAnd: 'Render conditionally with `condition && element` instead of a ternary with null.',
    },
  },
  create(context) {
    const source = context.sourceCode;
    return {
      ConditionalExpression(node) {
        const consequentNull = isNull(node.consequent);
        const alternateNull = isNull(node.alternate);
        if (consequentNull === alternateNull) return;
        const element = alternateNull ? node.consequent : node.alternate;
        if (!isElement(element) && !isChildPosition(node)) return;
        context.report({
          node,
          messageId: 'useAnd',
          fix(fixer) {
            const test = condition(node.test, source.getText(node.test), consequentNull);
            return fixer.replaceText(node, `${test} && ${source.getText(element)}`);
          },
        });
      },
    };
  },
};

const noLeakedLength = {
  meta: {
    type: 'problem',
    fixable: 'code',
    schema: [],
    messages: {
      compare: 'Compare `.length > 0` so React never renders a stray 0.',
    },
  },
  create(context) {
    const source = context.sourceCode;
    return {
      LogicalExpression(node) {
        if (!isAndChain(node) || isAndChain(node.parent)) return;
        const operands = flattenAnd(node);
        const last = operands[operands.length - 1];
        if (!isElement(last) && !isChildPosition(node)) return;
        for (const operand of operands.slice(0, -1)) {
          if (!isLengthAccess(operand)) continue;
          context.report({
            node: operand,
            messageId: 'compare',
            fix: (fixer) => fixer.replaceText(operand, `${source.getText(operand)} > 0`),
          });
        }
      },
    };
  },
};

export default {
  meta: { name: 'local' },
  rules: {
    'prefer-logical-and': preferLogicalAnd,
    'no-leaked-length': noLeakedLength,
  },
};
