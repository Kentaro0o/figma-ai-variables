import './styles.css';

// ─── State ────────────────────────────────────────────────────────────────────

let apiKey = '';

// ─── DOM references ──────────────────────────────────────────────────────────

const apiKeyInput = document.getElementById('api-key') as HTMLInputElement;
const saveKeyBtn = document.getElementById('save-key') as HTMLButtonElement;
const keyStatus = document.getElementById('key-status') as HTMLSpanElement;

const themeInput = document.getElementById('theme') as HTMLInputElement;
const generateBtn = document.getElementById('generate') as HTMLButtonElement;
const generateStatus = document.getElementById('generate-status') as HTMLDivElement;
const previewArea = document.getElementById('preview') as HTMLDivElement;
const applyBtn = document.getElementById('apply') as HTMLButtonElement;

const importTextarea = document.getElementById('import-json') as HTMLTextAreaElement;
const importNameInput = document.getElementById('import-name') as HTMLInputElement;
const importBtn = document.getElementById('import') as HTMLButtonElement;

const exportBtn = document.getElementById('export') as HTMLButtonElement;
const exportOutput = document.getElementById('export-output') as HTMLTextAreaElement;
const copyBtn = document.getElementById('copy') as HTMLButtonElement;
const downloadBtn = document.getElementById('download') as HTMLButtonElement;

const statusBar = document.getElementById('status-bar') as HTMLDivElement;

// ─── Generated palette (kept in memory for "Apply" button) ──────────────────

let lastPalette: { collectionName: string; tokens: Record<string, unknown> } | null = null;

// ─── Initialize ───────────────────────────────────────────────────────────────

parent.postMessage({ pluginMessage: { type: 'load-api-key' } }, '*');

// ─── API Key ─────────────────────────────────────────────────────────────────

saveKeyBtn.addEventListener('click', () => {
  const key = apiKeyInput.value.trim();
  if (!key.startsWith('sk-ant-')) {
    showStatus('Invalid API key format', 'error');
    return;
  }
  parent.postMessage({ pluginMessage: { type: 'save-api-key', key } }, '*');
});

// ─── Generate ─────────────────────────────────────────────────────────────────

generateBtn.addEventListener('click', async () => {
  const theme = themeInput.value.trim();
  if (!theme) { showStatus('テーマを入力してください', 'error'); return; }
  if (!apiKey) { showStatus('API Keyを保存してください', 'error'); return; }

  generateBtn.disabled = true;
  generateStatus.textContent = 'AIが生成中...';
  previewArea.innerHTML = '';
  applyBtn.disabled = true;
  lastPalette = null;

  try {
    const palette = await generatePalette(theme, apiKey);
    lastPalette = palette;
    renderPreview(palette);
    applyBtn.disabled = false;
    generateStatus.textContent = '生成完了！';
  } catch (e) {
    generateStatus.textContent = '';
    showStatus('生成エラー: ' + String(e), 'error');
  } finally {
    generateBtn.disabled = false;
  }
});

// ─── Apply ────────────────────────────────────────────────────────────────────

applyBtn.addEventListener('click', () => {
  if (!lastPalette) return;
  parent.postMessage({ pluginMessage: { type: 'apply-variables', palette: lastPalette } }, '*');
});

// ─── Import ──────────────────────────────────────────────────────────────────

importBtn.addEventListener('click', () => {
  const json = importTextarea.value.trim();
  if (!json) { showStatus('JSONを入力してください', 'error'); return; }
  const name = importNameInput.value.trim() || 'Imported Tokens';
  parent.postMessage({ pluginMessage: { type: 'import-json', json, collectionName: name } }, '*');
});

// ─── Export ──────────────────────────────────────────────────────────────────

exportBtn.addEventListener('click', () => {
  parent.postMessage({ pluginMessage: { type: 'export-variables' } }, '*');
  showStatus('エクスポート中...', 'info');
});

copyBtn.addEventListener('click', () => {
  navigator.clipboard.writeText(exportOutput.value);
  showStatus('コピーしました', 'success');
});

downloadBtn.addEventListener('click', () => {
  const blob = new Blob([exportOutput.value], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'design-tokens.json';
  a.click();
  URL.revokeObjectURL(url);
});

// ─── Messages from plugin code ───────────────────────────────────────────────

window.onmessage = (event) => {
  const msg = event.data.pluginMessage;
  if (!msg) return;

  switch (msg.type) {
    case 'api-key-loaded':
      if (msg.key) {
        apiKey = msg.key;
        apiKeyInput.value = msg.key;
        keyStatus.textContent = '保存済み';
        keyStatus.className = 'status-ok';
      }
      break;
    case 'api-key-saved':
      apiKey = apiKeyInput.value.trim();
      keyStatus.textContent = '保存済み';
      keyStatus.className = 'status-ok';
      showStatus('API Keyを保存しました', 'success');
      break;
    case 'apply-success':
      showStatus(`${msg.count}個の変数を適用しました`, 'success');
      break;
    case 'export-result':
      exportOutput.value = msg.json;
      exportOutput.style.display = 'block';
      copyBtn.style.display = 'inline-block';
      downloadBtn.style.display = 'inline-block';
      showStatus('エクスポート完了', 'success');
      break;
    case 'error':
      showStatus('エラー: ' + msg.message, 'error');
      break;
  }
};

// ─── Claude API call ─────────────────────────────────────────────────────────

async function generatePalette(theme: string, key: string) {
  const prompt = `You are a design token expert. Generate a complete color palette for the theme: "${theme}".

Return ONLY valid JSON in the W3C Design Tokens format. No markdown, no explanation, just JSON.

The structure must be:
{
  "collectionName": "<theme name>",
  "tokens": {
    "color": {
      "primary": {
        "50":  { "$value": "#hex", "$type": "color" },
        "100": { "$value": "#hex", "$type": "color" },
        "200": { "$value": "#hex", "$type": "color" },
        "300": { "$value": "#hex", "$type": "color" },
        "400": { "$value": "#hex", "$type": "color" },
        "500": { "$value": "#hex", "$type": "color" },
        "600": { "$value": "#hex", "$type": "color" },
        "700": { "$value": "#hex", "$type": "color" },
        "800": { "$value": "#hex", "$type": "color" },
        "900": { "$value": "#hex", "$type": "color" }
      },
      "secondary": { ... same scale ... },
      "neutral": { ... same scale ... },
      "semantic": {
        "success": { "$value": "#hex", "$type": "color" },
        "warning": { "$value": "#hex", "$type": "color" },
        "error":   { "$value": "#hex", "$type": "color" },
        "info":    { "$value": "#hex", "$type": "color" }
      },
      "background": {
        "default": { "$value": "#hex", "$type": "color" },
        "surface": { "$value": "#hex", "$type": "color" },
        "overlay": { "$value": "#hex", "$type": "color" }
      },
      "text": {
        "primary":   { "$value": "#hex", "$type": "color" },
        "secondary": { "$value": "#hex", "$type": "color" },
        "disabled":  { "$value": "#hex", "$type": "color" },
        "inverse":   { "$value": "#hex", "$type": "color" }
      }
    }
  }
}`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error((err as { error?: { message?: string } }).error?.message ?? `HTTP ${response.status}`);
  }

  const data = await response.json() as { content: Array<{ text: string }> };
  const text = data.content[0].text.trim();

  // Strip markdown code fences if present
  const jsonText = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
  return JSON.parse(jsonText);
}

// ─── Preview renderer ────────────────────────────────────────────────────────

function renderPreview(palette: { collectionName: string; tokens: Record<string, unknown> }) {
  previewArea.innerHTML = `<h4>${palette.collectionName}</h4>`;
  renderTokenGroup(palette.tokens as Record<string, unknown>, previewArea, '');
}

function renderTokenGroup(group: Record<string, unknown>, container: HTMLElement, prefix: string) {
  for (const [key, val] of Object.entries(group)) {
    const label = prefix ? `${prefix}/${key}` : key;
    if (isDesignToken(val)) {
      const swatch = document.createElement('div');
      swatch.className = 'swatch';
      swatch.innerHTML = `
        <span class="swatch-color" style="background:${val.$value}"></span>
        <span class="swatch-name">${label}</span>
        <span class="swatch-value">${val.$value}</span>
      `;
      container.appendChild(swatch);
    } else if (typeof val === 'object' && val !== null) {
      const section = document.createElement('div');
      section.className = 'group-label';
      section.textContent = label;
      container.appendChild(section);
      renderTokenGroup(val as Record<string, unknown>, container, label);
    }
  }
}

function isDesignToken(val: unknown): val is { $value: string; $type: string } {
  return typeof val === 'object' && val !== null && '$value' in val;
}

// ─── Status bar ───────────────────────────────────────────────────────────────

function showStatus(msg: string, type: 'success' | 'error' | 'info') {
  statusBar.textContent = msg;
  statusBar.className = `status-bar ${type}`;
  setTimeout(() => { statusBar.textContent = ''; statusBar.className = 'status-bar'; }, 4000);
}
