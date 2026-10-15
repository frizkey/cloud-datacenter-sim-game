import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { RadialTouchMenu } from '../src/ui/RadialTouchMenu.js';

describe('Radial Touch Context Menu & Mobile Safe Area (T041)', () => {
  let radialMenu;
  let mockNode;
  let actionsTriggered;

  beforeEach(() => {
    actionsTriggered = [];
    mockNode = {
      id: 'node_test_01',
      type: 'COMPUTE_POD',
      gridX: 4,
      gridY: 3,
      currentRps: 50,
      capacityRps: 100,
    };
    radialMenu = new RadialTouchMenu({
      viewportWidth: 800,
      viewportHeight: 600,
      safeMargin: 40,
      onAction: (action, node) => {
        actionsTriggered.push({ action, node });
      },
    });
  });

  it('initializes with 5 core operational actions (Restart, Scale, Wiring, Inspect, Delete)', () => {
    const actions = radialMenu.getAvailableActions();
    assert.deepEqual(actions, ['restart', 'scale', 'wiring', 'inspect', 'delete']);
  });

  it('clamps radial menu center coordinates within safe area viewport margins', () => {
    // Coordinate near top-left edge (10, 10)
    const clampedNearOrigin = radialMenu.calculateClampedPosition(10, 10);
    assert.ok(clampedNearOrigin.x >= 40, 'x must respect left safe margin');
    assert.ok(clampedNearOrigin.y >= 40, 'y must respect top safe margin');

    // Coordinate near bottom-right edge (795, 595)
    const clampedNearBottomRight = radialMenu.calculateClampedPosition(795, 595);
    assert.ok(clampedNearBottomRight.x <= 760, 'x must respect right safe margin');
    assert.ok(clampedNearBottomRight.y <= 560, 'y must respect bottom safe margin');

    // Center coordinate should remain unaltered
    const normal = radialMenu.calculateClampedPosition(400, 300);
    assert.equal(normal.x, 400);
    assert.equal(normal.y, 300);
  });

  it('positions action buttons around center point at fixed radial distance', () => {
    const positions = radialMenu.calculateActionItemPositions(400, 300, 65);
    assert.equal(positions.length, 5);

    // Each button must be approximately 65px distance from center
    for (const pos of positions) {
      const dx = pos.x - 400;
      const dy = pos.y - 300;
      const dist = Math.sqrt(dx * dx + dy * dy);
      assert.ok(Math.abs(dist - 65) < 0.1, `Distance ${dist} should be ~65px`);
    }
  });

  it('triggers action callback and hides menu when action button is tapped', () => {
    radialMenu.show(mockNode, 400, 300);
    assert.equal(radialMenu.isOpen, true);
    assert.equal(radialMenu.activeNode.id, 'node_test_01');

    radialMenu.triggerAction('restart');
    assert.equal(actionsTriggered.length, 1);
    assert.equal(actionsTriggered[0].action, 'restart');
    assert.equal(actionsTriggered[0].node.id, 'node_test_01');
    assert.equal(radialMenu.isOpen, false);
  });
});
