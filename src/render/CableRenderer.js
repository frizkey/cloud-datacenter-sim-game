/**
 * CableRenderer.js - Orthogonal cable routing and connection validation
 * Pure JS, zero DOM/Phaser coupling for headless testing.
 */

import { NodeType } from '../core/sim/Constants.js';

export class CableRenderer {
  /**
   * Validate network connection request between source and target nodes
   * @param {Object} sourceNode
   * @param {Object} targetNode
   * @param {Map<string, Object>|Array<Object>} existingConnections
   * @returns {{ valid: boolean, reason?: string }}
   */
  static validateConnection(sourceNode, targetNode, existingConnections = []) {
    if (!sourceNode || !targetNode) {
      return { valid: false, reason: 'NODE_NOT_FOUND' };
    }

    if (sourceNode.id === targetNode.id) {
      return { valid: false, reason: 'SELF_LOOP_PROHIBITED' };
    }

    // Ingress node cannot receive incoming traffic
    if (targetNode.type === NodeType.CLIENT_INGRESS) {
      return { valid: false, reason: 'CANNOT_TARGET_INGRESS' };
    }

    // Check duplicate connection
    const connList = existingConnections instanceof Map ? Array.from(existingConnections.values()) : existingConnections;
    for (const conn of connList) {
      if (conn.sourceNodeId === sourceNode.id && conn.targetNodeId === targetNode.id) {
        return { valid: false, reason: 'CONNECTION_ALREADY_EXISTS' };
      }
    }

    return { valid: true };
  }

  /**
   * Compute orthogonal (Manhattan) waypoints for sleek cable rendering
   * @param {number} x1 Source X
   * @param {number} y1 Source Y
   * @param {number} x2 Target X
   * @param {number} y2 Target Y
   * @returns {Array<{ x: number, y: number }>}
   */
  static getOrthogonalWaypoints(x1, y1, x2, y2) {
    const midX = Math.round((x1 + x2) / 2);
    return [
      { x: x1, y: y1 },
      { x: midX, y: y1 },
      { x: midX, y: y2 },
      { x: x2, y: y2 },
    ];
  }
}
