# AI Variable Generator — Figma Plugin

Figma の Variables を AI（Claude）で自動生成・JSON エクスポート・インポートできるプラグインです。

## 機能

- **AIカラーパレット生成** — テーマを日本語/英語で説明するだけで、Claude が W3C Design Tokens 形式のカラーパレットを生成
- **Figma Variables に適用** — 生成したパレットをワンクリックでコレクションとして登録
- **JSONエクスポート** — 現在の Variables を W3C Design Tokens JSON としてエクスポート
- **JSONインポート** — 既存の Design Tokens JSON を読み込んで Variables を一括作成

## セットアップ

### 必要なもの

- Node.js 18+
- [Anthropic API Key](https://console.anthropic.com/)
- Figma (デスクトップ or ブラウザ)

### インストール & ビルド

```bash
npm install
npm run build
```

### Figma へのインストール

1. Figma を開く
2. `Plugins > Development > Import plugin from manifest...`
3. このリポジトリの `manifest.json` を選択

### API Key の設定

1. プラグインを起動
2. [Anthropic Console](https://console.anthropic.com/) で API Key を取得
3. プラグインの「Anthropic API Key」欄に入力して「保存」

## 使い方

### AI でカラーパレットを生成

1. テーマを入力（例：「温かみのあるコーヒーブランド」）
2. 「AIで生成」をクリック
3. プレビューを確認
4. 「Figmaに変数として適用」で Variables に登録

### JSON をインポート

W3C Design Tokens 形式の JSON を貼り付けてインポート：

```json
{
  "color": {
    "primary": {
      "500": { "$value": "#3B82F6", "$type": "color" }
    }
  }
}
```

### JSON をエクスポート

「現在の変数をエクスポート」で、開いているファイルの全 Variables を JSON 出力。

## 開発

```bash
npm run dev   # watch モードでビルド
npm run build # 本番ビルド
```

## 技術スタック

- TypeScript
- Webpack
- Figma Plugin API (Variables API)
- Anthropic Claude API (`claude-sonnet-4-6`)
- W3C Design Tokens format

## ライセンス

MIT
