import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  gridToScreen,
  screenToGrid,
  screenToGridCell,
  getIsoDepth,
  getTileDiamondVertices,
} from '../src/render/IsoMath.js';

describe('IsoMath 2.5D Isometric Coordinate Tests', () => {
  const TILE_WIDTH = 64;
  const TILE_HEIGHT = 32;
  const ORIGIN_X = 200;
  const ORIGIN_Y = 100;

  it('correctly projects (0, 0) grid coordinate to origin', () => {
    const screen = gridToScreen(0, 0, ORIGIN_X, ORIGIN_Y, TILE_WIDTH, TILE_HEIGHT);
    assert.strictEqual(screen.x, 200);
    assert.strictEqual(screen.y, 100);
  });

  it('projects diagonal and orthogonal grid coordinates accurately', () => {
    // (1, 0)
    const p1 = gridToScreen(1, 0, ORIGIN_X, ORIGIN_Y, TILE_WIDTH, TILE_HEIGHT);
    assert.strictEqual(p1.x, 200 + 32);
    assert.strictEqual(p1.y, 100 + 16);

    // (0, 1)
    const p2 = gridToScreen(0, 1, ORIGIN_X, ORIGIN_Y, TILE_WIDTH, TILE_HEIGHT);
    assert.strictEqual(p2.x, 200 - 32);
    assert.strictEqual(p2.y, 100 + 16);

    // (2, 2)
    const p3 = gridToScreen(2, 2, ORIGIN_X, ORIGIN_Y, TILE_WIDTH, TILE_HEIGHT);
    assert.strictEqual(p3.x, 200);
    assert.strictEqual(p3.y, 100 + 64);
  });

  it('inverts screen coordinates back to grid coordinates accurately', () => {
    const testCases = [
      { gx: 0, gy: 0 },
      { gx: 3, gy: 5 },
      { gx: 10, gy: 2 },
      { gx: -2, gy: 4 },
    ];

    for (const tc of testCases) {
      const screen = gridToScreen(tc.gx, tc.gy, ORIGIN_X, ORIGIN_Y, TILE_WIDTH, TILE_HEIGHT);
      const grid = screenToGrid(screen.x, screen.y, ORIGIN_X, ORIGIN_Y, TILE_WIDTH, TILE_HEIGHT);
      assert.ok(Math.abs(grid.x - tc.gx) < 1e-6, `Grid X should match: expected ${tc.gx}, got ${grid.x}`);
      assert.ok(Math.abs(grid.y - tc.gy) < 1e-6, `Grid Y should match: expected ${tc.gy}, got ${grid.y}`);
    }
  });

  it('snaps fractional screen touches to correct integer grid cells', () => {
    // Exactly at center of tile (3, 3)
    const center = gridToScreen(3, 3, ORIGIN_X, ORIGIN_Y, TILE_WIDTH, TILE_HEIGHT);
    const cell = screenToGridCell(center.x + 2, center.y - 2, ORIGIN_X, ORIGIN_Y, TILE_WIDTH, TILE_HEIGHT);
    assert.strictEqual(cell.gridX, 3);
    assert.strictEqual(cell.gridY, 3);
  });

  it('calculates deterministic isometric depth for correct sprite layering', () => {
    const d00 = getIsoDepth(0, 0);
    const d10 = getIsoDepth(1, 0);
    const d01 = getIsoDepth(0, 1);
    const d11 = getIsoDepth(1, 1);

    assert.ok(d10 > d00, '(1,0) should have greater depth than (0,0)');
    assert.ok(d01 > d00, '(0,1) should have greater depth than (0,0)');
    assert.ok(d11 > d10, '(1,1) should be in front of (1,0)');
    assert.ok(d11 > d01, '(1,1) should be in front of (0,1)');

    // Layer priority
    const base = getIsoDepth(2, 2, 0);
    const overlay = getIsoDepth(2, 2, 1);
    assert.ok(overlay > base, 'Higher sublayer must have higher depth on same tile');
  });

  it('computes 4 polygon diamond vertices for grid cell outline rendering', () => {
    const vertices = getTileDiamondVertices(0, 0, ORIGIN_X, ORIGIN_Y, TILE_WIDTH, TILE_HEIGHT);
    assert.strictEqual(vertices.length, 4);
    // top
    assert.deepStrictEqual(vertices[0], { x: 200, y: 100 - 16 });
    // right
    assert.deepStrictEqual(vertices[1], { x: 200 + 32, y: 100 });
    // bottom
    assert.deepStrictEqual(vertices[2], { x: 200, y: 100 + 16 });
    // left
    assert.deepStrictEqual(vertices[3], { x: 200 - 32, y: 100 });
  });
});
