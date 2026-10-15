import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CAMPAIGN_LEVELS } from '../src/core/sim/CampaignLevels.js';

describe('CampaignLevels Integer Coordinates Alignment (T009)', () => {
  it('all campaign levels 1 to 5 define starter nodes with integer grid coordinates in playable viewport', () => {
    assert.equal(CAMPAIGN_LEVELS.length, 5, 'Must have 5 campaign levels');

    for (const level of CAMPAIGN_LEVELS) {
      assert.ok(level.starterNodes && level.starterNodes.length > 0, `Level ${level.levelNumber} must have starter nodes`);

      for (const node of level.starterNodes) {
        // Must be integers
        assert.equal(Number.isInteger(node.gridX), true, `Level ${level.levelNumber} node ${node.id} gridX must be integer, got ${node.gridX}`);
        assert.equal(Number.isInteger(node.gridY), true, `Level ${level.levelNumber} node ${node.id} gridY must be integer, got ${node.gridY}`);

        // Must be in playable bounds (not raw pixels like 100, 200, 400, 600)
        assert.ok(
          node.gridX >= 1 && node.gridX <= 16,
          `Level ${level.levelNumber} node ${node.id} gridX (${node.gridX}) must be within grid bounds [1, 16]`
        );
        assert.ok(
          node.gridY >= 1 && node.gridY <= 10,
          `Level ${level.levelNumber} node ${node.id} gridY (${node.gridY}) must be within grid bounds [1, 10]`
        );

        // When multiplied by TILE_PX (80), screen coordinates must be on-screen
        const screenX = node.gridX * 80;
        const screenY = node.gridY * 80;
        assert.ok(screenX >= 80 && screenX <= 1280, `Screen X (${screenX}) out of viewport bounds`);
        assert.ok(screenY >= 80 && screenY <= 800, `Screen Y (${screenY}) out of viewport bounds`);
      }
    }
  });
});
