import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

describe('Project Scaffold Sanity', () => {
  it('has package.json with Phaser 4 dependency', () => {
    const pkgPath = resolve(process.cwd(), 'package.json');
    assert.ok(existsSync(pkgPath), 'package.json must exist');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
    assert.equal(pkg.name, 'cloud-datacenter-sim-game');
    assert.ok(pkg.dependencies.phaser, 'phaser dependency must be present');
  });

  it('has full simulation research design document', () => {
    const docPath = resolve(process.cwd(), 'docs/CLOUD_DATACENTER_SIMULATION_GAME_DESIGN.md');
    assert.ok(existsSync(docPath), 'Design doc must exist');
    const content = readFileSync(docPath, 'utf8');
    assert.ok(content.length > 5000, 'Design doc must contain full research content');
  });

  it('has HTML entrypoint and canvas container', () => {
    const htmlPath = resolve(process.cwd(), 'index.html');
    assert.ok(existsSync(htmlPath), 'index.html must exist');
    const content = readFileSync(htmlPath, 'utf8');
    assert.ok(content.includes('id="game-container"'), 'Container must exist in index.html');
  });
});
