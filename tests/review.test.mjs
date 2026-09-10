import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const source = readFileSync(new URL('../src/lib/review-types.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 } }).outputText;
const { validateFindings, applyFindings } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
const proposal = (original, suggested) => ({ original, suggested, reason: 'Synthetic fixture', category: 'language' });

test('rejects invented, ambiguous, overlapping and malformed proposals', () => {
  const {findings, discarded} = validateFindings({findings: [proposal('beta', 'B'), proposal('beta gamma', 'C'), proposal('missing', 'D'), proposal('a', 'A'), null]}, 'Alpha beta gamma.');
  assert.equal(findings.length, 1);
  assert.equal(discarded, 4);
  assert.equal(findings[0].start, 6);
  assert.throws(() => validateFindings({}, 'Alpha'));
});

test('applies only selected edits using original offsets despite changed lengths', () => {
  const sample = 'Alpha beta gamma.';
  const {findings} = validateFindings({findings: [proposal('Alpha', 'A longer opening'), proposal('beta', 'B'), proposal('gamma', '')]}, sample);
  assert.equal(applyFindings(sample, [findings[0], findings[2]]), 'A longer opening beta .');
  assert.equal(applyFindings(sample, []), sample);
  assert.equal(sample, 'Alpha beta gamma.');
});

test('accepts an empty review without inventing changes', () => {
  assert.deepEqual(validateFindings({findings: []}, 'Synthetic fixture'), {findings: [], discarded: 0});
});
