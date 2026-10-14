/**
 * IsoMath.js - 2.5D Isometric projection and inverse screen-to-grid raycasting math
 * Pure math module, zero DOM/Phaser coupling.
 */

export const DEFAULT_TILE_WIDTH = 64;
export const DEFAULT_TILE_HEIGHT = 32;

/**
 * Projects integer or fractional grid coordinates to 2D screen coordinates
 * @param {number} gridX
 * @param {number} gridY
 * @param {number} originX
 * @param {number} originY
 * @param {number} [tileWidth=64]
 * @param {number} [tileHeight=32]
 * @returns {{ x: number, y: number }}
 */
export function gridToScreen(gridX, gridY, originX = 0, originY = 0, tileWidth = DEFAULT_TILE_WIDTH, tileHeight = DEFAULT_TILE_HEIGHT) {
  const halfWidth = tileWidth / 2;
  const halfHeight = tileHeight / 2;
  return {
    x: originX + (gridX - gridY) * halfWidth,
    y: originY + (gridX + gridY) * halfHeight,
  };
}

/**
 * Inverse screen-to-grid raycast converting screen coordinates to continuous grid coordinates
 * @param {number} screenX
 * @param {number} screenY
 * @param {number} originX
 * @param {number} originY
 * @param {number} [tileWidth=64]
 * @param {number} [tileHeight=32]
 * @returns {{ x: number, y: number }}
 */
export function screenToGrid(screenX, screenY, originX = 0, originY = 0, tileWidth = DEFAULT_TILE_WIDTH, tileHeight = DEFAULT_TILE_HEIGHT) {
  const dx = screenX - originX;
  const dy = screenY - originY;
  const halfWidth = tileWidth / 2;
  const halfHeight = tileHeight / 2;

  const gridX = (dx / halfWidth + dy / halfHeight) / 2;
  const gridY = (dy / halfHeight - dx / halfWidth) / 2;

  return { x: gridX, y: gridY };
}

/**
 * Converts screen coordinate to discrete integer grid cell with rounding/snapping
 * @param {number} screenX
 * @param {number} screenY
 * @param {number} originX
 * @param {number} originY
 * @param {number} [tileWidth=64]
 * @param {number} [tileHeight=32]
 * @returns {{ gridX: number, gridY: number }}
 */
export function screenToGridCell(screenX, screenY, originX = 0, originY = 0, tileWidth = DEFAULT_TILE_WIDTH, tileHeight = DEFAULT_TILE_HEIGHT) {
  const continuous = screenToGrid(screenX, screenY, originX, originY, tileWidth, tileHeight);
  return {
    gridX: Math.round(continuous.x),
    gridY: Math.round(continuous.y),
  };
}

/**
 * Computes deterministic depth index for correct isometric z-ordering
 * @param {number} gridX
 * @param {number} gridY
 * @param {number} [layer=0]
 * @returns {number}
 */
export function getIsoDepth(gridX, gridY, layer = 0) {
  return (gridX + gridY) * 1000 + layer;
}

/**
 * Calculates the 4 vertices of a tile's diamond perimeter in screen coordinates
 * Top, Right, Bottom, Left
 * @param {number} gridX
 * @param {number} gridY
 * @param {number} originX
 * @param {number} originY
 * @param {number} [tileWidth=64]
 * @param {number} [tileHeight=32]
 * @returns {Array<{ x: number, y: number }>}
 */
export function getTileDiamondVertices(gridX, gridY, originX = 0, originY = 0, tileWidth = DEFAULT_TILE_WIDTH, tileHeight = DEFAULT_TILE_HEIGHT) {
  const center = gridToScreen(gridX, gridY, originX, originY, tileWidth, tileHeight);
  const halfWidth = tileWidth / 2;
  const halfHeight = tileHeight / 2;

  return [
    { x: center.x, y: center.y - halfHeight }, // Top
    { x: center.x + halfWidth, y: center.y },  // Right
    { x: center.x, y: center.y + halfHeight }, // Bottom
    { x: center.x - halfWidth, y: center.y },  // Left
  ];
}
