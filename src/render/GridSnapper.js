/**
 * GridSnapper.js - Snap-to-grid preview ghost and placement validator
 * Pure JS, zero DOM/Phaser coupling.
 */

export const DEFAULT_GRID_TILE_SIZE = 80;

export class GridSnapper {
  /**
   * @param {Object} [options]
   * @param {number} [options.tileSize=80]
   * @param {Object} [options.bounds]
   */
  constructor(options = {}) {
    this.tileSize = options.tileSize || DEFAULT_GRID_TILE_SIZE;
    this.bounds = options.bounds || { minX: -50, maxX: 50, minY: -50, maxY: 50 };
  }

  /**
   * Snap continuous screen/world coordinates to discrete integer grid coordinates
   * @param {number} worldX
   * @param {number} worldY
   * @returns {{ gridX: number, gridY: number, snappedX: number, snappedY: number }}
   */
  snap(worldX, worldY) {
    const gridX = Math.round(worldX / this.tileSize);
    const gridY = Math.round(worldY / this.tileSize);
    return {
      gridX,
      gridY,
      snappedX: gridX * this.tileSize,
      snappedY: gridY * this.tileSize,
    };
  }

  /**
   * Validate whether a grid cell is valid and available for placing a component
   * @param {number} gridX
   * @param {number} gridY
   * @param {Array<Object>|Map<string, Object>} existingNodes
   * @returns {{ valid: boolean, reason?: string }}
   */
  validatePlacement(gridX, gridY, existingNodes = []) {
    // 1. Boundary check
    if (
      gridX < this.bounds.minX ||
      gridX > this.bounds.maxX ||
      gridY < this.bounds.minY ||
      gridY > this.bounds.maxY
    ) {
      return { valid: false, reason: 'OUT_OF_BOUNDS' };
    }

    // 2. Collision check
    const nodeList = existingNodes instanceof Map ? Array.from(existingNodes.values()) : existingNodes;
    for (const node of nodeList) {
      if (node.gridX === gridX && node.gridY === gridY) {
        return { valid: false, reason: 'CELL_OCCUPIED', occupiedByNodeId: node.id };
      }
    }

    return { valid: true };
  }
}
