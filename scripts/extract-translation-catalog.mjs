import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const root = process.cwd();
const sourceFiles = [
  'src/landing/LandingPage.tsx',
  'src/prototype/PrototypeApp.tsx',
  'src/navigation/NativeTabShell.tsx',
  'src/prototype/studentCatalog.ts',
  'src/prototype/platformDemoData.ts',
  'src/prototype/commerceDemoData.ts',
  'src/features/pricing/academicYearPlans.ts',
];
const translatedDataProperties = new Set([
  'action', 'bio', 'body', 'category', 'course', 'createdAt', 'description', 'duration',
  'expires', 'lastActive', 'level', 'method', 'relationship', 'result', 'role', 'shortName',
  'source', 'status', 'subject', 'subscription', 'summary', 'target', 'tierName', 'time',
  'title', 'type', 'unlocks',
]);
const translatedAttributes = new Set([
  'accessibilityHint',
  'accessibilityLabel',
  'label',
  'placeholder',
  'title',
]);

const normalize = (value) => value.replace(/\s+/g, ' ').trim();
const isTranslatable = (value) => {
  if (!value || !/[A-Za-z]/.test(value)) return false;
  if (/^(#[0-9a-f]{3,8}|rgba?\(|https?:|[a-z]+_[a-z0-9_]+$)/i.test(value)) return false;
  return true;
};
const slug = (value) => value
  .toLowerCase()
  .replace(/[’']/g, '')
  .replace(/[^a-z0-9]+/g, '.')
  .replace(/^\.|\.$/g, '')
  .slice(0, 64) || 'text';

const records = new Map();
function add(source, file, node, sourceFile, kind) {
  const text = normalize(source);
  if (!isTranslatable(text)) return;
  const location = `${file}:${sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1}`;
  const existing = records.get(text);
  if (existing) {
    if (!existing.locations.includes(location)) existing.locations.push(location);
    return;
  }
  records.set(text, {
    key: '',
    english: text,
    kurdish: '',
    screen: file.includes('/landing/') ? 'Landing' : file.includes('/navigation/') ? 'Navigation' : 'Application',
    context: kind,
    placeholders: [...text.matchAll(/\{([^}]+)\}/g)].map((match) => match[1]),
    status: 'Not started',
    reviewerNotes: '',
    locations: [location],
  });
}

for (const file of sourceFiles) {
  const absolute = path.join(root, file);
  const contents = fs.readFileSync(absolute, 'utf8');
  const sourceFile = ts.createSourceFile(file, contents, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

  function visit(node) {
    if (ts.isJsxText(node)) add(node.getText(sourceFile), file, node, sourceFile, 'Visible text');

    if (ts.isJsxAttribute(node) && translatedAttributes.has(node.name.getText(sourceFile))) {
      if (node.initializer && ts.isStringLiteral(node.initializer)) {
        add(node.initializer.text, file, node, sourceFile, `${node.name.getText(sourceFile)} attribute`);
      }
    }

    if (ts.isJsxAttribute(node) && node.name.getText(sourceFile) === 'cells' && node.initializer && ts.isJsxExpression(node.initializer)) {
      const expression = node.initializer.expression;
      if (expression && ts.isArrayLiteralExpression(expression)) {
        for (const element of expression.elements) {
          if (ts.isStringLiteral(element)) add(element.text, file, element, sourceFile, 'Table heading');
        }
      }
    }

    if (ts.isJsxExpression(node) && node.expression) {
      const visitExpression = (expressionNode) => {
        if (ts.isStringLiteral(expressionNode) || ts.isNoSubstitutionTemplateLiteral(expressionNode)) {
          add(expressionNode.text, file, expressionNode, sourceFile, 'Dynamic visible text');
        }
        if (ts.isTemplateHead(expressionNode) || ts.isTemplateMiddle(expressionNode) || ts.isTemplateTail(expressionNode)) {
          add(expressionNode.text, file, expressionNode, sourceFile, 'Dynamic text fragment');
        }
        ts.forEachChild(expressionNode, visitExpression);
      };
      visitExpression(node.expression);
    }

    if (ts.isPropertyAssignment(node)) {
      const propertyName = node.name.getText(sourceFile).replace(/^['"]|['"]$/g, '');
      if (translatedDataProperties.has(propertyName) && (ts.isStringLiteral(node.initializer) || ts.isNoSubstitutionTemplateLiteral(node.initializer))) {
        add(node.initializer.text, file, node.initializer, sourceFile, `Data field: ${propertyName}`);
      }
    }

    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
}

const keyCounts = new Map();
const usedKeys = new Set();
const outputPath = path.join(root, 'translations', 'ckb-IQ.catalog.json');
const previousByEnglish = new Map();
if (fs.existsSync(outputPath)) {
  const previous = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
  for (const entry of previous.entries ?? []) previousByEnglish.set(entry.english, entry);
}

const catalog = [...records.values()]
  .sort((a, b) => a.screen.localeCompare(b.screen) || a.locations[0].localeCompare(b.locations[0], undefined, { numeric: true }))
  .map((record) => {
    const prefix = record.screen.toLowerCase();
    const base = `${prefix}.${slug(record.english)}`;
    const count = (keyCounts.get(base) ?? 0) + 1;
    keyCounts.set(base, count);
    const previous = previousByEnglish.get(record.english);
    const preferredKey = previous?.key ?? (count === 1 ? base : `${base}.${count}`);
    let key = preferredKey;
    let suffix = 2;
    while (usedKeys.has(key)) key = `${preferredKey}.${suffix++}`;
    usedKeys.add(key);
    return {
      ...record,
      key,
      kurdish: previous?.kurdish ?? '',
      status: previous?.status ?? 'Not started',
      reviewerNotes: previous?.reviewerNotes ?? '',
    };
  });

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify({
  locale: 'ckb-IQ',
  language: 'Sorani Kurdish',
  direction: 'rtl',
  instructions: 'Fill kurdish, update status, and preserve every placeholder exactly. Do not edit key or english.',
  entries: catalog,
}, null, 2)}\n`);
console.log(`Wrote ${catalog.length} entries to ${path.relative(root, outputPath)}`);
