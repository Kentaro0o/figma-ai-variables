/// <reference types="@figma/plugin-typings" />

figma.showUI(__html__, { width: 420, height: 600, title: 'AI Variable Generator' });

// ─── Type definitions ───────────────────────────────────────────────────────

interface DesignToken {
  $value: string;
  $type: string;
  $description?: string;
}

interface TokenGroup {
  [key: string]: DesignToken | TokenGroup;
}

interface GeneratedPalette {
  collectionName: string;
  tokens: TokenGroup;
}

// ─── Message handlers ────────────────────────────────────────────────────────

figma.ui.onmessage = async (msg) => {
  if (msg.type === 'apply-variables') {
    await applyVariables(msg.palette);
  } else if (msg.type === 'export-variables') {
    await exportVariables();
  } else if (msg.type === 'import-json') {
    await importJson(msg.json, msg.collectionName);
  } else if (msg.type === 'load-api-key') {
    const key = await figma.clientStorage.getAsync('anthropic-api-key');
    figma.ui.postMessage({ type: 'api-key-loaded', key: key ?? '' });
  } else if (msg.type === 'save-api-key') {
    await figma.clientStorage.setAsync('anthropic-api-key', msg.key);
    figma.ui.postMessage({ type: 'api-key-saved' });
  }
};

// ─── Apply variables to Figma ────────────────────────────────────────────────

async function applyVariables(palette: GeneratedPalette) {
  try {
    const collection = figma.variables.createVariableCollection(palette.collectionName);
    const modeId = collection.modes[0].modeId;

    flattenTokens(palette.tokens).forEach(({ path, token }) => {
      const variable = figma.variables.createVariable(path, collection, 'COLOR');
      const rgb = hexToRgb(token.$value);
      if (rgb) variable.setValueForMode(modeId, rgb);
    });

    figma.ui.postMessage({ type: 'apply-success', count: flattenTokens(palette.tokens).length });
  } catch (e) {
    figma.ui.postMessage({ type: 'error', message: String(e) });
  }
}

// ─── Export variables ────────────────────────────────────────────────────────

async function exportVariables() {
  try {
    const collections = figma.variables.getLocalVariableCollections();
    const result: TokenGroup = {};

    for (const col of collections) {
      const colGroup: TokenGroup = {};
      const modeId = col.modes[0].modeId;

      for (const varId of col.variableIds) {
        const variable = figma.variables.getVariableById(varId);
        if (!variable || variable.resolvedType !== 'COLOR') continue;

        const value = variable.valuesByMode[modeId];
        if (!isRgba(value)) continue;

        const hex = rgbToHex(value);
        setNestedToken(colGroup, variable.name, {
          $value: hex,
          $type: 'color',
          $description: variable.description || undefined,
        });
      }

      result[col.name] = colGroup;
    }

    figma.ui.postMessage({ type: 'export-result', json: JSON.stringify(result, null, 2) });
  } catch (e) {
    figma.ui.postMessage({ type: 'error', message: String(e) });
  }
}

// ─── Import JSON ─────────────────────────────────────────────────────────────

async function importJson(json: string, collectionName: string) {
  try {
    const tokens: TokenGroup = JSON.parse(json);
    await applyVariables({ collectionName: collectionName || 'Imported Tokens', tokens });
  } catch (e) {
    figma.ui.postMessage({ type: 'error', message: 'Invalid JSON: ' + String(e) });
  }
}

// ─── Utilities ───────────────────────────────────────────────────────────────

function isDesignToken(val: unknown): val is DesignToken {
  return typeof val === 'object' && val !== null && '$value' in val;
}

function isRgba(val: unknown): val is RGBA {
  return typeof val === 'object' && val !== null && 'r' in val && 'g' in val && 'b' in val;
}

function flattenTokens(group: TokenGroup, prefix = ''): { path: string; token: DesignToken }[] {
  const results: { path: string; token: DesignToken }[] = [];
  for (const [key, val] of Object.entries(group)) {
    const path = prefix ? `${prefix}/${key}` : key;
    if (isDesignToken(val)) {
      results.push({ path, token: val });
    } else {
      results.push(...flattenTokens(val as TokenGroup, path));
    }
  }
  return results;
}

function setNestedToken(group: TokenGroup, path: string, token: DesignToken) {
  const parts = path.split('/');
  let cur: TokenGroup = group;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!cur[parts[i]]) cur[parts[i]] = {};
    cur = cur[parts[i]] as TokenGroup;
  }
  cur[parts[parts.length - 1]] = token;
}

function hexToRgb(hex: string): RGB | null {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return null;
  return {
    r: parseInt(clean.slice(0, 2), 16) / 255,
    g: parseInt(clean.slice(2, 4), 16) / 255,
    b: parseInt(clean.slice(4, 6), 16) / 255,
  };
}

function rgbToHex(color: RGBA): string {
  const toHex = (n: number) => Math.round(n * 255).toString(16).padStart(2, '0');
  return `#${toHex(color.r)}${toHex(color.g)}${toHex(color.b)}`;
}
