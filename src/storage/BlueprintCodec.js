/**
 * BlueprintCodec.js
 * Serializes and deserializes datacenter architectural blueprints into compact shareable strings.
 * Adheres strictly to contracts/blueprint-schema.json.
 */

const BLUEPRINT_MAGIC_PREFIX = 'CSBP1:';
const BLUEPRINT_VERSION = '1.0.0';
const BLUEPRINT_GENERATOR = 'cloudsim-blueprint';

function utf8ToBase64(str) {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(str, 'utf8').toString('base64');
  }
  if (typeof btoa === 'function') {
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) => String.fromCharCode('0x' + p1)));
  }
  throw new Error('No base64 encoding implementation available');
}

function base64ToUtf8(base64Str) {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(base64Str, 'base64').toString('utf8');
  }
  if (typeof atob === 'function') {
    return decodeURIComponent(
      Array.prototype.map.call(atob(base64Str), (c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
    );
  }
  throw new Error('No base64 decoding implementation available');
}

export class BlueprintCodec {
  /**
   * Encode architecture layout into a blueprint string.
   * @param {Object} options
   * @param {string} options.title
   * @param {string} [options.description]
   * @param {Array<Object>} options.nodes
   * @param {Array<Object>} options.connections
   * @param {Array<Object>} [options.facilityComponents]
   * @returns {string} Encoded blueprint string with CSBP1: prefix
   */
  static encode({ title, description = '', nodes = [], connections = [], facilityComponents = [] }) {
    if (!title || typeof title !== 'string') {
      throw new Error('Blueprint title is required');
    }
    if (!Array.isArray(nodes)) {
      throw new Error('Blueprint nodes must be an array');
    }
    if (!Array.isArray(connections)) {
      throw new Error('Blueprint connections must be an array');
    }

    // Sanitize node objects to schema
    const sanitizedNodes = nodes.map((node) => ({
      id: String(node.id),
      type: String(node.type),
      gridX: Number(node.gridX) || 0,
      gridY: Number(node.gridY) || 0,
      name: node.name || node.type,
      ...(node.autoscaling ? { autoscaling: { ...node.autoscaling } } : {}),
    }));

    // Sanitize connection objects
    const sanitizedConnections = connections.map((conn) => ({
      id: String(conn.id),
      sourceNodeId: String(conn.sourceNodeId),
      targetNodeId: String(conn.targetNodeId),
      isOrthogonal: conn.isOrthogonal !== false,
    }));

    // Sanitize facility components if any
    const sanitizedFacility = (facilityComponents || []).map((comp) => ({
      id: String(comp.id),
      type: String(comp.type),
      isoX: Number(comp.isoX) || 0,
      isoY: Number(comp.isoY) || 0,
    }));

    const blueprintObj = {
      version: BLUEPRINT_VERSION,
      generator: BLUEPRINT_GENERATOR,
      title: title.trim(),
      description: description.trim(),
      createdAtTimestamp: Date.now(),
      nodes: sanitizedNodes,
      connections: sanitizedConnections,
      facilityComponents: sanitizedFacility,
    };

    const jsonString = JSON.stringify(blueprintObj);
    const base64Payload = utf8ToBase64(jsonString);
    return `${BLUEPRINT_MAGIC_PREFIX}${base64Payload}`;
  }

  /**
   * Decode blueprint string into architecture layout.
   * @param {string} rawString
   * @returns {Object} Validated blueprint data
   */
  static decode(rawString) {
    if (!rawString || typeof rawString !== 'string') {
      throw new Error('Invalid blueprint: Input must be a non-empty string');
    }

    const trimmed = rawString.trim();
    if (!trimmed.startsWith(BLUEPRINT_MAGIC_PREFIX)) {
      throw new Error(`Invalid blueprint prefix. Expected ${BLUEPRINT_MAGIC_PREFIX}`);
    }

    const base64Payload = trimmed.slice(BLUEPRINT_MAGIC_PREFIX.length);
    let jsonStr;
    try {
      jsonStr = base64ToUtf8(base64Payload);
    } catch (err) {
      throw new Error(`Corrupted blueprint string: failed base64 decode (${err.message})`);
    }

    let parsed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch (err) {
      throw new Error(`Corrupted blueprint string: invalid JSON (${err.message})`);
    }

    // Schema validation
    if (parsed.version !== BLUEPRINT_VERSION) {
      throw new Error(`Unsupported blueprint version: ${parsed.version}. Expected ${BLUEPRINT_VERSION}`);
    }
    if (parsed.generator !== BLUEPRINT_GENERATOR) {
      throw new Error(`Invalid blueprint generator: ${parsed.generator}`);
    }
    if (!parsed.title || typeof parsed.title !== 'string') {
      throw new Error('Blueprint schema violation: title is required');
    }
    if (!Array.isArray(parsed.nodes) || !Array.isArray(parsed.connections)) {
      throw new Error('Blueprint schema violation: nodes and connections must be arrays');
    }

    return parsed;
  }
}
