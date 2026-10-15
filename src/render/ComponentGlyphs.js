/**
 * ComponentGlyphs.js
 * Sci-Fi Vector Blueprint Glyph Registry & Procedural Vector Renderer.
 * Replaces system emojis with crisp, color-calibrated sci-fi blueprints and SVG vector icons.
 */

export const GLYPH_CATEGORIES = {
  INGRESS: 'INGRESS',
  SECURITY: 'SECURITY',
  ROUTING: 'ROUTING',
  COMPUTE: 'COMPUTE',
  STORAGE: 'STORAGE',
  POWER: 'POWER',
  COOLING: 'COOLING',
};

export const GLYPH_THEMES = {
  CLIENT_INGRESS: { category: GLYPH_CATEGORIES.INGRESS, stroke: '#06b6d4', fill: 'rgba(6, 182, 212, 0.15)', hex: 0x06b6d4 },
  DNS_ROUTING: { category: GLYPH_CATEGORIES.ROUTING, stroke: '#38bdf8', fill: 'rgba(56, 189, 248, 0.15)', hex: 0x38bdf8 },
  WAF_SHIELD: { category: GLYPH_CATEGORIES.SECURITY, stroke: '#10b981', fill: 'rgba(16, 185, 129, 0.15)', hex: 0x10b981 },
  CDN_EDGE: { category: GLYPH_CATEGORIES.INGRESS, stroke: '#f59e0b', fill: 'rgba(245, 158, 11, 0.15)', hex: 0xf59e0b },
  LOAD_BALANCER: { category: GLYPH_CATEGORIES.ROUTING, stroke: '#3b82f6', fill: 'rgba(59, 130, 246, 0.15)', hex: 0x3b82f6 },
  API_GATEWAY: { category: GLYPH_CATEGORIES.ROUTING, stroke: '#8b5cf6', fill: 'rgba(139, 92, 246, 0.15)', hex: 0x8b5cf6 },
  COMPUTE_POD: { category: GLYPH_CATEGORIES.COMPUTE, stroke: '#6366f1', fill: 'rgba(99, 102, 241, 0.15)', hex: 0x6366f1 },
  SERVERLESS_FAAS: { category: GLYPH_CATEGORIES.COMPUTE, stroke: '#ec4899', fill: 'rgba(236, 72, 153, 0.15)', hex: 0xec4899 },
  MESSAGE_BROKER: { category: GLYPH_CATEGORIES.ROUTING, stroke: '#14b8a6', fill: 'rgba(20, 184, 166, 0.15)', hex: 0x14b8a6 },
  DATABASE_SQL: { category: GLYPH_CATEGORIES.STORAGE, stroke: '#a855f7', fill: 'rgba(168, 85, 247, 0.15)', hex: 0xa855f7 },
  DATABASE_NOSQL: { category: GLYPH_CATEGORIES.STORAGE, stroke: '#d946ef', fill: 'rgba(217, 70, 239, 0.15)', hex: 0xd946ef },
  OBJECT_STORAGE: { category: GLYPH_CATEGORIES.STORAGE, stroke: '#8b5cf6', fill: 'rgba(139, 92, 246, 0.15)', hex: 0x8b5cf6 },
  // Facility Hardware
  PDU_3PHASE: { category: GLYPH_CATEGORIES.POWER, stroke: '#eab308', fill: 'rgba(234, 179, 8, 0.15)', hex: 0xeab308 },
  CRAC_CHILLER: { category: GLYPH_CATEGORIES.COOLING, stroke: '#0284c7', fill: 'rgba(2, 132, 199, 0.15)', hex: 0x0284c7 },
  UPS_BATTERY: { category: GLYPH_CATEGORIES.POWER, stroke: '#22c55e', fill: 'rgba(34, 197, 94, 0.15)', hex: 0x22c55e },
  DIESEL_GENERATOR: { category: GLYPH_CATEGORIES.POWER, stroke: '#f97316', fill: 'rgba(249, 115, 22, 0.15)', hex: 0xf97316 },
  CIRCUIT_BREAKER: { category: GLYPH_CATEGORIES.POWER, stroke: '#ef4444', fill: 'rgba(239, 68, 68, 0.15)', hex: 0xef4444 },
};

export const SVG_ICONS = {
  CLIENT_INGRESS: `
    <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.8" fill="none"/>
    <ellipse cx="12" cy="12" rx="4" ry="9" stroke="currentColor" stroke-width="1.5" fill="none"/>
    <line x1="3" y1="12" x2="21" y2="12" stroke="currentColor" stroke-width="1.5"/>
    <circle cx="12" cy="12" r="2" fill="currentColor"/>
  `,
  DNS_ROUTING: `
    <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.8" fill="none"/>
    <polygon points="12,5 15,11 12,9 9,11" fill="currentColor"/>
    <polygon points="12,19 15,13 12,15 9,13" fill="currentColor" opacity="0.6"/>
    <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
  `,
  WAF_SHIELD: `
    <path d="M12 3L4 7v6c0 5 3.5 9.5 8 11 4.5-1.5 8-6 8-11V7l-8-4z" stroke="currentColor" stroke-width="1.8" fill="none"/>
    <path d="M12 7l4 2v4c0 3-1.8 5.7-4 6.8-2.2-1.1-4-3.8-4-6.8V9l4-2z" fill="currentColor" opacity="0.4"/>
  `,
  CDN_EDGE: `
    <circle cx="12" cy="12" r="4" stroke="currentColor" stroke-width="1.8" fill="none"/>
    <path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2.5 2.5M16.5 16.5l2.5 2.5M5 19l2.5-2.5M16.5 7.5l2.5-2.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    <polygon points="11,9 13.5,9 11.5,12 14,12 10.5,16 11.5,13 9.5,13" fill="currentColor"/>
  `,
  LOAD_BALANCER: `
    <rect x="3" y="10" width="4" height="4" rx="1" fill="currentColor"/>
    <rect x="17" y="5" width="4" height="4" rx="1" fill="currentColor"/>
    <rect x="17" y="15" width="4" height="4" rx="1" fill="currentColor"/>
    <path d="M7 12h4m0 0l4-5h2m-6 5l4 5h2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    <circle cx="11" cy="12" r="2" fill="currentColor"/>
  `,
  API_GATEWAY: `
    <path d="M5 21V7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v14" stroke="currentColor" stroke-width="1.8" fill="none"/>
    <path d="M9 21v-8a3 3 0 0 1 6 0v8" stroke="currentColor" stroke-width="1.5" fill="none"/>
    <line x1="3" y1="21" x2="21" y2="21" stroke="currentColor" stroke-width="2"/>
    <circle cx="12" cy="8" r="1.5" fill="currentColor"/>
  `,
  COMPUTE_POD: `
    <rect x="5" y="5" width="14" height="14" rx="2" stroke="currentColor" stroke-width="1.8" fill="none"/>
    <rect x="8" y="8" width="8" height="8" rx="1" fill="currentColor" opacity="0.3"/>
    <path d="M8 2v3M12 2v3M16 2v3M8 19v3M12 19v3M16 19v3M2 8h3M2 12h3M2 16h3M19 8h3M19 12h3M19 16h3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
  `,
  SERVERLESS_FAAS: `
    <path d="M12 2l4 7-4 2-4-2 4-7z" stroke="currentColor" stroke-width="1.8" fill="none"/>
    <path d="M8 11l-4 4 3 1-1 4 4-2 2 4 2-4 4 2-1-4 3-1-4-4" stroke="currentColor" stroke-width="1.5" fill="none"/>
    <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
  `,
  MESSAGE_BROKER: `
    <rect x="3" y="6" width="18" height="12" rx="3" stroke="currentColor" stroke-width="1.8" fill="none"/>
    <circle cx="8" cy="12" r="2" fill="currentColor"/>
    <circle cx="12" cy="12" r="2" fill="currentColor"/>
    <circle cx="16" cy="12" r="2" fill="currentColor"/>
    <path d="M3 10h18M3 14h18" stroke="currentColor" stroke-width="1" opacity="0.3"/>
  `,
  DATABASE_SQL: `
    <ellipse cx="12" cy="6" rx="8" ry="3" stroke="currentColor" stroke-width="1.8" fill="none"/>
    <path d="M4 6v6c0 1.66 3.58 3 8 3s8-1.34 8-3V6" stroke="currentColor" stroke-width="1.8" fill="none"/>
    <path d="M4 12v6c0 1.66 3.58 3 8 3s8-1.34 8-3v-6" stroke="currentColor" stroke-width="1.8" fill="none"/>
  `,
  DATABASE_NOSQL: `
    <polygon points="12,3 20,8 20,16 12,21 4,16 4,8" stroke="currentColor" stroke-width="1.8" fill="none"/>
    <circle cx="12" cy="8" r="2" fill="currentColor"/>
    <circle cx="8" cy="14" r="2" fill="currentColor"/>
    <circle cx="16" cy="14" r="2" fill="currentColor"/>
    <line x1="12" y1="8" x2="8" y2="14" stroke="currentColor" stroke-width="1.2"/>
    <line x1="12" y1="8" x2="16" y2="14" stroke="currentColor" stroke-width="1.2"/>
    <line x1="8" y1="14" x2="16" y2="14" stroke="currentColor" stroke-width="1.2"/>
  `,
  OBJECT_STORAGE: `
    <path d="M4 8l8-4 8 4v8l-8 4-8-4V8z" stroke="currentColor" stroke-width="1.8" fill="none"/>
    <path d="M4 8l8 4 8-4M12 12v8" stroke="currentColor" stroke-width="1.5"/>
    <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
  `,
  PDU_3PHASE: `
    <rect x="4" y="3" width="16" height="18" rx="2" stroke="currentColor" stroke-width="1.8" fill="none"/>
    <path d="M13 6l-4 6h4l-2 6 6-7h-4l2-5z" fill="currentColor"/>
    <circle cx="8" cy="18" r="1" fill="currentColor"/>
    <circle cx="12" cy="18" r="1" fill="currentColor"/>
    <circle cx="16" cy="18" r="1" fill="currentColor"/>
  `,
  CRAC_CHILLER: `
    <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.8" fill="none"/>
    <path d="M12 3v18M3 12h18M6 6l12 12M6 18L18 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    <circle cx="12" cy="12" r="3" fill="currentColor"/>
  `,
  UPS_BATTERY: `
    <rect x="5" y="6" width="14" height="15" rx="2" stroke="currentColor" stroke-width="1.8" fill="none"/>
    <path d="M9 3h6v3H9V3z" fill="currentColor"/>
    <line x1="8" y1="11" x2="16" y2="11" stroke="currentColor" stroke-width="1.5"/>
    <line x1="8" y1="14" x2="16" y2="14" stroke="currentColor" stroke-width="1.5"/>
    <line x1="8" y1="17" x2="16" y2="17" stroke="currentColor" stroke-width="1.5"/>
  `,
  DIESEL_GENERATOR: `
    <rect x="3" y="6" width="18" height="14" rx="2" stroke="currentColor" stroke-width="1.8" fill="none"/>
    <circle cx="9" cy="13" r="4" stroke="currentColor" stroke-width="1.5" fill="none"/>
    <circle cx="9" cy="13" r="1.5" fill="currentColor"/>
    <path d="M15 10h3M15 13h3M15 16h3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    <path d="M6 3h4v3H6V3z" fill="currentColor"/>
  `,
  CIRCUIT_BREAKER: `
    <rect x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" stroke-width="1.8" fill="none"/>
    <path d="M8 8l8 8M16 8l-8 8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
  `,
};

/**
 * Returns an inline SVG string for HTML UI components.
 * @param {string} type Component type or key
 * @param {object} [options]
 * @param {string} [options.className]
 * @param {number} [options.size=24]
 * @param {string} [options.color]
 * @returns {string} SVG HTML string
 */
export function getGlyphSvg(type, options = {}) {
  const size = options.size || 24;
  const theme = GLYPH_THEMES[type] || { stroke: '#94a3b8', fill: 'none' };
  const color = options.color || theme.stroke;
  const innerSvg = SVG_ICONS[type] || SVG_ICONS.COMPUTE_POD;
  const className = options.className ? ` class="${options.className}"` : '';

  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24"${className} style="color: ${color}; display: inline-block; vertical-align: middle;">${innerSvg}</svg>`;
}

/**
 * Procedural vector draw routine for Phaser Graphics object.
 * Draws blueprint glyph centered at (x, y).
 * @param {Phaser.GameObjects.Graphics} graphics
 * @param {string} type
 * @param {number} x
 * @param {number} y
 * @param {number} radius
 * @param {number} colorHex
 */
export function drawPhaserGlyph(graphics, type, x, y, radius = 24, colorHex = null) {
  if (!graphics) return;
  const theme = GLYPH_THEMES[type] || { hex: 0x94a3b8 };
  const strokeColor = colorHex !== null ? colorHex : theme.hex;

  graphics.lineStyle(2, strokeColor, 1.0);

  switch (type) {
    case 'CLIENT_INGRESS': {
      // Concentric globe rings
      graphics.strokeCircle(x, y, radius * 0.75);
      graphics.lineStyle(1.5, strokeColor, 0.7);
      graphics.strokeEllipse(x, y, radius * 0.35 * 2, radius * 0.75 * 2);
      graphics.lineBetween(x - radius * 0.75, y, x + radius * 0.75, y);
      graphics.fillStyle(strokeColor, 1.0);
      graphics.fillCircle(x, y, 3);
      break;
    }
    case 'DNS_ROUTING': {
      // Outer ring with directional compass needle
      graphics.strokeCircle(x, y, radius * 0.75);
      graphics.fillStyle(strokeColor, 1.0);
      graphics.fillTriangle(x, y - radius * 0.65, x - 5, y, x + 5, y);
      graphics.fillStyle(strokeColor, 0.4);
      graphics.fillTriangle(x, y + radius * 0.65, x - 5, y, x + 5, y);
      break;
    }
    case 'WAF_SHIELD': {
      // Hexagonal shield outline
      const sides = 6;
      const pts = [];
      for (let i = 0; i < sides; i++) {
        const angle = (i * Math.PI) / 3 - Math.PI / 6;
        pts.push({ x: x + radius * 0.75 * Math.cos(angle), y: y + radius * 0.75 * Math.sin(angle) });
      }
      graphics.beginPath();
      graphics.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < sides; i++) graphics.lineTo(pts[i].x, pts[i].y);
      graphics.closePath();
      graphics.strokePath();

      // Inner barrier core
      graphics.fillStyle(strokeColor, 0.3);
      graphics.fillCircle(x, y, radius * 0.35);
      break;
    }
    case 'CDN_EDGE': {
      // Starburst lightning node
      graphics.strokeCircle(x, y, radius * 0.45);
      for (let i = 0; i < 4; i++) {
        const a = (i * Math.PI) / 2;
        graphics.lineBetween(
          x + Math.cos(a) * radius * 0.5,
          y + Math.sin(a) * radius * 0.5,
          x + Math.cos(a) * radius * 0.85,
          y + Math.sin(a) * radius * 0.85
        );
      }
      graphics.fillStyle(strokeColor, 1.0);
      graphics.fillCircle(x, y, 3);
      break;
    }
    case 'LOAD_BALANCER': {
      // Split manifold
      const r = radius * 0.65;
      graphics.lineBetween(x - r, y, x - r * 0.2, y);
      graphics.lineBetween(x - r * 0.2, y, x + r * 0.6, y - r * 0.6);
      graphics.lineBetween(x - r * 0.2, y, x + r * 0.6, y + r * 0.6);
      graphics.fillStyle(strokeColor, 1.0);
      graphics.fillCircle(x - r, y, 3);
      graphics.fillCircle(x + r * 0.6, y - r * 0.6, 3);
      graphics.fillCircle(x + r * 0.6, y + r * 0.6, 3);
      break;
    }
    case 'API_GATEWAY': {
      // Archway portal
      const r = radius * 0.65;
      graphics.strokeRect(x - r, y - r * 0.5, r * 2, r * 1.5);
      graphics.lineStyle(1.5, strokeColor, 0.7);
      graphics.strokeCircle(x, y - r * 0.2, r * 0.4);
      break;
    }
    case 'COMPUTE_POD': {
      // Microchip core with pins
      const r = radius * 0.6;
      graphics.strokeRect(x - r, y - r, r * 2, r * 2);
      graphics.fillStyle(strokeColor, 0.4);
      graphics.fillRect(x - r * 0.5, y - r * 0.5, r, r);
      // Pins
      for (const offset of [-r * 0.5, 0, r * 0.5]) {
        graphics.lineBetween(x + offset, y - r, x + offset, y - r - 4);
        graphics.lineBetween(x + offset, y + r, x + offset, y + r + 4);
        graphics.lineBetween(x - r, y + offset, x - r - 4, y + offset);
        graphics.lineBetween(x + r, y + offset, x + r + 4, y + offset);
      }
      break;
    }
    case 'SERVERLESS_FAAS': {
      // Dynamic warp chevron
      const r = radius * 0.7;
      graphics.beginPath();
      graphics.moveTo(x, y - r);
      graphics.lineTo(x + r * 0.6, y + r * 0.6);
      graphics.lineTo(x, y + r * 0.2);
      graphics.lineTo(x - r * 0.6, y + r * 0.6);
      graphics.closePath();
      graphics.strokePath();
      graphics.fillStyle(strokeColor, 1.0);
      graphics.fillCircle(x, y, 2.5);
      break;
    }
    case 'MESSAGE_BROKER': {
      // Buffer container with items
      const r = radius * 0.65;
      graphics.strokeRoundedRect(x - r, y - r * 0.5, r * 2, r, 4);
      graphics.fillStyle(strokeColor, 1.0);
      graphics.fillCircle(x - r * 0.5, y, 3);
      graphics.fillCircle(x, y, 3);
      graphics.fillCircle(x + r * 0.5, y, 3);
      break;
    }
    case 'DATABASE_SQL': {
      // Tiered storage disks
      const rx = radius * 0.65;
      const ry = radius * 0.25;
      graphics.strokeEllipse(x, y - radius * 0.35, rx * 2, ry * 2);
      graphics.strokeEllipse(x, y, rx * 2, ry * 2);
      graphics.strokeEllipse(x, y + radius * 0.35, rx * 2, ry * 2);
      graphics.lineBetween(x - rx, y - radius * 0.35, x - rx, y + radius * 0.35);
      graphics.lineBetween(x + rx, y - radius * 0.35, x + rx, y + radius * 0.35);
      break;
    }
    case 'DATABASE_NOSQL': {
      // Hexagonal cluster mesh
      const r = radius * 0.65;
      graphics.strokeCircle(x, y - r * 0.5, 4);
      graphics.strokeCircle(x - r * 0.5, y + r * 0.4, 4);
      graphics.strokeCircle(x + r * 0.5, y + r * 0.4, 4);
      graphics.lineBetween(x, y - r * 0.5, x - r * 0.5, y + r * 0.4);
      graphics.lineBetween(x, y - r * 0.5, x + r * 0.5, y + r * 0.4);
      graphics.lineBetween(x - r * 0.5, y + r * 0.4, x + r * 0.5, y + r * 0.4);
      break;
    }
    case 'OBJECT_STORAGE': {
      // Isometric cube container
      const r = radius * 0.65;
      graphics.strokeRect(x - r, y - r, r * 2, r * 2);
      graphics.lineBetween(x - r, y - r, x + r, y + r);
      graphics.lineBetween(x - r, y + r, x + r, y - r);
      break;
    }
    case 'PDU_3PHASE':
    case 'CIRCUIT_BREAKER': {
      // High voltage lightning spark
      const r = radius * 0.65;
      graphics.strokeRect(x - r, y - r, r * 2, r * 2);
      graphics.beginPath();
      graphics.moveTo(x + 2, y - r * 0.6);
      graphics.lineTo(x - 4, y);
      graphics.lineTo(x + 2, y);
      graphics.lineTo(x - 2, y + r * 0.6);
      graphics.lineTo(x + 4, y);
      graphics.lineTo(x - 2, y);
      graphics.closePath();
      graphics.fillStyle(strokeColor, 1.0);
      graphics.fillPath();
      break;
    }
    case 'CRAC_CHILLER': {
      // Fan blades / snowflake
      graphics.strokeCircle(x, y, radius * 0.7);
      graphics.lineBetween(x - radius * 0.6, y, x + radius * 0.6, y);
      graphics.lineBetween(x, y - radius * 0.6, x, y + radius * 0.6);
      graphics.lineBetween(x - radius * 0.4, y - radius * 0.4, x + radius * 0.4, y + radius * 0.4);
      graphics.lineBetween(x - radius * 0.4, y + radius * 0.4, x + radius * 0.4, y - radius * 0.4);
      graphics.fillStyle(strokeColor, 1.0);
      graphics.fillCircle(x, y, 3);
      break;
    }
    case 'UPS_BATTERY': {
      // Battery cylinder with charge cells
      const w = radius * 0.8;
      const h = radius * 1.1;
      graphics.strokeRect(x - w / 2, y - h / 2, w, h);
      graphics.fillRect(x - w / 4, y - h / 2 - 4, w / 2, 4);
      graphics.fillStyle(strokeColor, 0.7);
      graphics.fillRect(x - w / 2 + 3, y + h / 2 - 8, w - 6, 6);
      graphics.fillRect(x - w / 2 + 3, y + h / 2 - 16, w - 6, 6);
      break;
    }
    case 'DIESEL_GENERATOR': {
      // Turbine generator box
      const r = radius * 0.7;
      graphics.strokeRect(x - r, y - r * 0.6, r * 2, r * 1.2);
      graphics.strokeCircle(x - r * 0.3, y, r * 0.4);
      graphics.lineBetween(x + r * 0.2, y - 4, x + r * 0.7, y - 4);
      graphics.lineBetween(x + r * 0.2, y + 4, x + r * 0.7, y + 4);
      break;
    }
    default: {
      graphics.strokeCircle(x, y, radius * 0.65);
      graphics.fillStyle(strokeColor, 0.5);
      graphics.fillCircle(x, y, 4);
      break;
    }
  }
}
