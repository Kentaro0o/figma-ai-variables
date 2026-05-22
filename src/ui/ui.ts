import './styles.css';

// ─── Types ───────────────────────────────────────────────────────────────────

type GroupType = 'scale' | 'custom';

interface ColorGroup {
  id: string;
  name: string;
  type: GroupType;
  colors: Record<string, string>; // key: shade name ("500" or "success"), value: "#hex"
}

interface AppState {
  collectionName: string;
  groups: ColorGroup[];
}

// ─── State ────────────────────────────────────────────────────────────────────

const state: AppState = {
  collectionName: 'My Tokens',
  groups: [],
};

// ─── Color utilities ──────────────────────────────────────────────────────────

function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return [h, s, l];
}

function hslToHex(h: number, s: number, l: number): string {
  s = Math.max(0, Math.min(1, s));
  l = Math.max(0, Math.min(1, l));
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h * 12) % 12;
    return l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
  };
  const toHex = (v: number) => Math.round(v * 255).toString(16).padStart(2, '0');
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}

function generateScale(hex: string): Record<string, string> {
  const [h, s, l] = hexToHsl(hex);
  return {
    '50':  hslToHex(h, s * 0.12, 0.97),
    '100': hslToHex(h, s * 0.22, 0.94),
    '200': hslToHex(h, s * 0.38, 0.87),
    '300': hslToHex(h, s * 0.58, 0.77),
    '400': hslToHex(h, s * 0.80, 0.65),
    '500': hex,
    '600': hslToHex(h, Math.min(s * 1.05, 1), l * 0.86),
    '700': hslToHex(h, Math.min(s * 1.10, 1), l * 0.72),
    '800': hslToHex(h, Math.min(s * 1.12, 1), l * 0.56),
    '900': hslToHex(h, Math.min(s * 1.15, 1), l * 0.42),
  };
}

function isValidHex(v: string) { return /^#[0-9a-fA-F]{6}$/.test(v); }

// ─── ID generator ────────────────────────────────────────────────────────────

let _idCounter = 0;
const uid = () => `g${++_idCounter}`;

// ─── State → Figma palette ────────────────────────────────────────────────────

function buildPalette() {
  const tokens: Record<string, unknown> = {};
  for (const group of state.groups) {
    const g: Record<string, unknown> = {};
    for (const [key, hex] of Object.entries(group.colors)) {
      g[key] = { $value: hex, $type: 'color' };
    }
    tokens[group.name] = g;
  }
  return { collectionName: state.collectionName, tokens };
}

// ─── Render ───────────────────────────────────────────────────────────────────

function render() {
  const app = document.getElementById('app')!;
  app.innerHTML = '';

  // ── Collection name ──
  const colSection = section('コレクション名');
  const colInput = el('input', { type: 'text', value: state.collectionName, placeholder: 'My Tokens', class: 'input' });
  colInput.addEventListener('input', () => { state.collectionName = (colInput as HTMLInputElement).value; });
  colSection.appendChild(colInput);
  app.appendChild(colSection);

  // ── Color groups ──
  const groupsSection = section('カラーグループ');

  for (const group of state.groups) {
    groupsSection.appendChild(renderGroup(group));
  }

  // Add group buttons
  const addRow = div('add-row');
  const addScaleBtn = btn('+ スケール追加 (50〜900)', 'btn-secondary', () => {
    state.groups.push({ id: uid(), name: 'primary', type: 'scale', colors: generateScale('#3B82F6') });
    render();
  });
  const addCustomBtn = btn('+ カスタム追加', 'btn-secondary', () => {
    state.groups.push({ id: uid(), name: 'semantic', type: 'custom', colors: { success: '#22C55E', warning: '#F59E0B', error: '#EF4444', info: '#3B82F6' } });
    render();
  });
  addRow.append(addScaleBtn, addCustomBtn);
  groupsSection.appendChild(addRow);
  app.appendChild(groupsSection);

  // ── Actions ──
  const actSection = section('アクション');
  const applyBtn = btn('Figmaに変数として適用', 'btn-primary', () => {
    if (!state.groups.length) { showStatus('グループを追加してください', 'error'); return; }
    parent.postMessage({ pluginMessage: { type: 'apply-variables', palette: buildPalette() } }, '*');
  });

  const exportBtn = btn('変数をJSONエクスポート', 'btn-secondary', () => {
    parent.postMessage({ pluginMessage: { type: 'export-variables' } }, '*');
  });

  actSection.append(applyBtn, exportBtn);

  // ── Import ──
  const importLabel = el('label', { class: 'label' });
  importLabel.textContent = 'JSONインポート (W3C Design Tokens)';
  const importNameInput = el('input', { type: 'text', placeholder: 'コレクション名', class: 'input', value: 'Imported Tokens' }) as HTMLInputElement;
  const importArea = el('textarea', { placeholder: '{ "color": { "primary": { "$value": "#hex", "$type": "color" } } }', class: 'textarea' }) as HTMLTextAreaElement;
  const importBtn2 = btn('インポートして適用', 'btn-secondary', () => {
    const json = importArea.value.trim();
    if (!json) { showStatus('JSONを入力してください', 'error'); return; }
    parent.postMessage({ pluginMessage: { type: 'import-json', json, collectionName: importNameInput.value || 'Imported Tokens' } }, '*');
  });
  actSection.append(importLabel, importNameInput, importArea, importBtn2);

  // ── Export output ──
  const exportOut = el('textarea', { id: 'export-output', class: 'textarea', readonly: 'true', rows: '6', placeholder: 'エクスポート結果がここに表示されます', style: 'display:none' }) as HTMLTextAreaElement;
  const copyBtn2 = btn('コピー', 'btn-ghost', () => { navigator.clipboard.writeText(exportOut.value); showStatus('コピーしました', 'success'); });
  const dlBtn = btn('ダウンロード (.json)', 'btn-ghost', () => {
    const blob = new Blob([exportOut.value], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'design-tokens.json'; a.click();
  });
  copyBtn2.id = 'copy-btn'; dlBtn.id = 'dl-btn';
  copyBtn2.style.display = 'none'; dlBtn.style.display = 'none';
  actSection.append(exportOut, copyBtn2, dlBtn);

  app.appendChild(actSection);
}

// ─── Render group ────────────────────────────────────────────────────────────

function renderGroup(group: ColorGroup): HTMLElement {
  const card = div('group-card');

  // Header
  const header = div('group-header');

  const nameInput = el('input', { type: 'text', value: group.name, class: 'input input-name', placeholder: 'グループ名' }) as HTMLInputElement;
  nameInput.addEventListener('change', () => { group.name = nameInput.value; });

  const removeBtn = btn('✕', 'btn-icon', () => {
    state.groups = state.groups.filter(g => g.id !== group.id);
    render();
  });

  header.append(nameInput, removeBtn);
  card.appendChild(header);

  // Scale helper (only for scale type)
  if (group.type === 'scale') {
    const helperRow = div('helper-row');
    const baseColor = Object.values(group.colors)[5] ?? '#3B82F6'; // 500

    const picker = el('input', { type: 'color', value: baseColor, class: 'color-picker-input' }) as HTMLInputElement;
    const autoBtn = btn('スケール自動生成', 'btn-secondary btn-sm', () => {
      group.colors = generateScale(picker.value);
      render();
    });
    const helperLabel = el('span', { class: 'helper-label' });
    helperLabel.textContent = 'ベースカラー (500):';

    picker.addEventListener('input', () => {
      group.colors['500'] = picker.value;
    });

    helperRow.append(helperLabel, picker, autoBtn);
    card.appendChild(helperRow);
  }

  // Color rows
  const swatchGrid = div('swatch-grid');

  for (const [key, hex] of Object.entries(group.colors)) {
    swatchGrid.appendChild(renderSwatch(group, key, hex));
  }

  // Add token button (for custom groups)
  if (group.type === 'custom') {
    const addTokenBtn = btn('+ トークン追加', 'btn-ghost btn-sm', () => {
      const name = prompt('トークン名を入力 (例: hover, focus)');
      if (name && !group.colors[name]) {
        group.colors[name] = '#000000';
        render();
      }
    });
    swatchGrid.appendChild(addTokenBtn);
  }

  card.appendChild(swatchGrid);
  return card;
}

// ─── Render swatch ────────────────────────────────────────────────────────────

function renderSwatch(group: ColorGroup, key: string, hex: string): HTMLElement {
  const row = div('swatch-row');

  const preview = div('swatch-preview');
  preview.style.background = isValidHex(hex) ? hex : '#ccc';

  const keyLabel = el('span', { class: 'swatch-key' });
  keyLabel.textContent = key;

  const picker = el('input', { type: 'color', value: isValidHex(hex) ? hex : '#000000', class: 'color-picker-input' }) as HTMLInputElement;
  picker.addEventListener('input', () => {
    group.colors[key] = picker.value;
    preview.style.background = picker.value;
    hexInput.value = picker.value;
  });

  const hexInput = el('input', { type: 'text', value: hex, class: 'input input-hex', placeholder: '#000000', maxlength: '7' }) as HTMLInputElement;
  hexInput.addEventListener('change', () => {
    const v = hexInput.value.startsWith('#') ? hexInput.value : '#' + hexInput.value;
    if (isValidHex(v)) {
      group.colors[key] = v;
      picker.value = v;
      preview.style.background = v;
    }
  });

  const removeBtn = btn('✕', 'btn-icon btn-icon-sm', () => {
    delete group.colors[key];
    row.remove();
  });

  row.append(preview, keyLabel, picker, hexInput, removeBtn);
  return row;
}

// ─── Messages from plugin ─────────────────────────────────────────────────────

window.onmessage = (event) => {
  const msg = event.data.pluginMessage;
  if (!msg) return;

  switch (msg.type) {
    case 'apply-success':
      showStatus(`${msg.count}個の変数を適用しました`, 'success');
      break;
    case 'export-result': {
      const out = document.getElementById('export-output') as HTMLTextAreaElement | null;
      const copyBtn2 = document.getElementById('copy-btn') as HTMLElement | null;
      const dlBtn = document.getElementById('dl-btn') as HTMLElement | null;
      if (out) { out.value = msg.json; out.style.display = 'block'; }
      if (copyBtn2) copyBtn2.style.display = 'inline-block';
      if (dlBtn) dlBtn.style.display = 'inline-block';
      showStatus('エクスポート完了', 'success');
      break;
    }
    case 'error':
      showStatus('エラー: ' + msg.message, 'error');
      break;
  }
};

// ─── DOM helpers ──────────────────────────────────────────────────────────────

function el(tag: string, attrs: Record<string, string> = {}): HTMLElement {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') e.className = v;
    else e.setAttribute(k, v);
  }
  return e;
}

function div(cls: string): HTMLDivElement {
  const d = document.createElement('div');
  d.className = cls;
  return d;
}

function btn(label: string, cls: string, onClick: () => void): HTMLButtonElement {
  const b = document.createElement('button');
  b.className = `btn ${cls}`;
  b.textContent = label;
  b.addEventListener('click', onClick);
  return b;
}

function section(title: string): HTMLDivElement {
  const s = div('section');
  const h = div('section-header');
  h.textContent = title;
  s.appendChild(h);
  const body = div('section-body');
  s.appendChild(body);
  // append children to body from now on by overriding appendChild
  const origAppend = s.appendChild.bind(s);
  s.appendChild = <T extends Node>(child: T): T => body.appendChild(child) as T;
  origAppend(body); // already added
  return s;
}

// ─── Status bar ───────────────────────────────────────────────────────────────

function showStatus(msg: string, type: 'success' | 'error' | 'info') {
  const bar = document.getElementById('status-bar')!;
  bar.textContent = msg;
  bar.className = `status-bar ${type}`;
  setTimeout(() => { bar.textContent = ''; bar.className = 'status-bar'; }, 4000);
}

// ─── Boot ─────────────────────────────────────────────────────────────────────

render();
