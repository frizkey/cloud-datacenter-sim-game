import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

describe('Production Readiness Contract Schemas (T001)', () => {
  const contractsDir = resolve(process.cwd(), 'specs/005-production-grade-readiness/contracts');

  it('has blueprint-schema.json with valid structure', () => {
    const schemaPath = resolve(contractsDir, 'blueprint-schema.json');
    assert.ok(existsSync(schemaPath), 'blueprint-schema.json must exist');
    const schema = JSON.parse(readFileSync(schemaPath, 'utf8'));
    assert.equal(schema.title, 'BlueprintSchema');
    assert.ok(Array.isArray(schema.required));
    assert.ok(schema.required.includes('nodes'));
    assert.ok(schema.required.includes('connections'));
  });

  it('has client-contract-schema.json with valid structure', () => {
    const schemaPath = resolve(contractsDir, 'client-contract-schema.json');
    assert.ok(existsSync(schemaPath), 'client-contract-schema.json must exist');
    const schema = JSON.parse(readFileSync(schemaPath, 'utf8'));
    assert.equal(schema.title, 'ClientContractSchema');
    assert.ok(schema.required.includes('requirements'));
    assert.ok(schema.required.includes('financials'));
    assert.ok(schema.properties.clientTier.enum.includes('ENTERPRISE'));
  });

  it('has tech-tree-schema.json with valid structure', () => {
    const schemaPath = resolve(contractsDir, 'tech-tree-schema.json');
    assert.ok(existsSync(schemaPath), 'tech-tree-schema.json must exist');
    const schema = JSON.parse(readFileSync(schemaPath, 'utf8'));
    assert.equal(schema.title, 'TechTreeSchema');
    assert.ok(schema.required.includes('nodes'));
  });
});
