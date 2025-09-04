# 🤖 AI Tab Sorter - Firefox Extension

OpenAI互換APIを使用してタブを自動的にグループ化するFirefox拡張機能です。ローカルLLM（Ollama、llama.cpp等）を使用してプライバシーを保護しながら、インテリジェントなタブ管理を実現します。

## ✨ 機能

- **AI駆動の自動分類**: ページコンテンツを理解し、適切なカテゴリに自動分類
- **プライバシー重視**: ローカルLLM対応でデータが外部に送信されない
- **リアルタイム処理**: 新規タブを開いた際に自動的にグループ化
- **カスタマイズ可能**: カテゴリ、色、分類ルールを自由に設定
- **バッチ処理**: 複数のタブを効率的に一括分類

## 📋 前提条件

- **Node.js**: v18以上
- **npm**: v8以上
- **Firefox**: Developer Edition推奨（Tab Groups API使用のため）

## 📦 インストール

### 1. リポジトリのクローン

```bash
# GitHubからクローン
git clone https://github.com/moezakura/ai-tab-sorter.git
cd ai-tab-sorter
```

### 2. 依存関係のインストール

```bash
# npm packagesのインストール
npm install
```

### 3. ビルド

```bash
# Firefox向けビルド（XPI同時生成・推奨）
npm run build:firefox

# 開発モード（ファイル変更を監視してdistを更新）
npm run dev
```

### 4. Firefoxへのインストール

#### 方法A: 開発版として一時的にインストール（推奨）

1. Firefoxで `about:debugging` を開く
2. 左メニューから「このFirefox」を選択
3. 「一時的な拡張機能を読み込む」ボタンをクリック
4. プロジェクトの `dist/manifest.json` ファイルを選択
5. 拡張機能がロードされ、ツールバーにアイコンが表示される

#### 方法B: XPIファイルとして永続的にインストール

```bash
# Firefox用の完全ビルド（dist生成 + XPIファイル作成）
npm run build:firefox
```

生成された `ai-tab-sorter-1.0.0.zip` ファイルをFirefoxにドラッグ＆ドロップでインストール

## 🛠️ 開発コマンド

```bash
npm run dev             # Vite開発ビルド（ファイル監視モード）
npm run build           # Viteプロダクションビルド
npm run type-check      # TypeScript型チェック
npm run build:firefox   # Firefox用完全ビルド（dist + XPIファイル）
npm run build:xpi       # XPIファイルのみ生成（distが必要）
```

## 🔧 設定

### ローカルLLMのセットアップ（Ollama例）

```bash
# Ollamaのインストール
curl -fsSL https://ollama.ai/install.sh | sh

# モデルのダウンロード
ollama pull llama3

# CORSを許可してサーバー起動（Firefox拡張機能用）
OLLAMA_ORIGINS=moz-extension://* ollama serve
```

### 接続方式（HTTPS推奨）

- 推奨: 可能な限りLLMのAPIエンドポイントは `https://` を使用してください。
  - 例: 逆プロキシやローカル証明書を設定して `https://localhost:11434/v1` などを利用
- 例外: 検証・開発用途で `http://` を使う場合は、拡張機能のマニフェスト（CSPの `connect-src`）を修正してから使用してください（手順は下記）。

### 拡張機能の設定

1. 拡張機能のポップアップまたは設定ページを開く
2. API設定:
   - エンドポイント（推奨）: `https://<your-llm-host>/v1`
   - エンドポイント（開発/ローカル）: `http://localhost:11434/v1`（HTTPを使う場合は下記のCSP修正が必要）
   - モデル: `llama3`
   - APIキー: ローカルLLMの場合は不要
3. カテゴリと除外URLをカスタマイズ

#### HTTPを利用する場合のマニフェスト修正手順（Firefox, Manifest V3）

拡張機能がHTTPのエンドポイントへ接続できるよう、`public/manifest.json` を編集してください。ビルドは `public/manifest.json` を元に `dist/manifest.json` を生成します。

補足: 本プロジェクトの `host_permissions` は `<all_urls>` のため、HTTP利用のために `host_permissions` を変更する必要はありません。CSP（下記）の調整のみ行ってください。

1)（必要に応じて）CSPでHTTP接続を許可

環境によっては拡張ページのCSPで `connect-src` が制限され、HTTP先への接続がブロックされる場合があります。その場合は `content_security_policy.extension_pages` を追加して `connect-src` にHTTPの接続先を含めてください。

重要: `connect-src` では「オリジン（例: `http://192.168.0.0:8080`）」のみを指定します。末尾の `/` や `/*`、パス（`/v1/...`）は書かないでください。

```json
{
  "manifest_version": 3,
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'; connect-src 'self' https://* http://localhost:11434"
  }
}
```

必要なHTTPオリジンをスペース区切りで列挙します。`http://<host>:<port>/*` のようにパス付きで書くと無効になりブロックされます（オリジンのみを指定）。

2) ビルドを再実行し、拡張を再読み込み

```bash
npm run build:firefox
```

##### トラブルシュート: CSPエラーが出る場合

現象例:

```
Content-Security-Policy: The page’s settings blocked the loading of a resource (connect-src) at http://<IP>:<PORT>/v1/... because it violates the following directive: "connect-src 'self' https://* http://<IP>:<PORT>/*"
```

対処:
- `content_security_policy.extension_pages` の `connect-src` に、オリジンをパスなしで列挙してください。
  - 悪い例: `http://192.168.0.0:8080/*`（無効）
  - 良い例: `http://192.168.0.0:8080`
- 変更後は `npm run build:firefox` を再実行し、拡張を再読み込みします。

注:
- `dist/manifest.json` を直接編集しても次回ビルド時に上書きされるため、必ず `public/manifest.json` を修正してください。

## 🏗️ プロジェクト構造

```
ai-tab-sorter/
├── src/
│   ├── background/     # バックグラウンドサービス
│   ├── content/        # コンテンツ抽出
│   ├── popup/          # ポップアップUI
│   ├── options/        # 設定ページ
│   ├── types/          # TypeScript型定義
│   └── utils/          # ユーティリティ
├── public/             # 静的ファイル
└── dist/               # ビルド出力
```

## 🎯 デフォルトカテゴリ

- 仕事・プロジェクト（青）
- 学習・ドキュメント（緑）
- エンターテイメント（赤）
- ショッピング（黄）
- ニュース・メディア（シアン）
- SNS・コミュニケーション（紫）
- 開発・技術（グレー）
- その他（オレンジ）

## 🔒 プライバシーとセキュリティ

- ローカルLLMを使用する場合、データは一切外部に送信されません
- 除外URLパターンで特定のサイトを分類対象から除外可能
- すべての設定はローカルに保存されます

## 📝 ライセンス

ISC

## 🤝 貢献

Issues、Pull Requestsを歓迎します！

## 🐛 既知の問題

- Firefox Tab Groups APIは現在開発中のため、一部機能が制限される場合があります
- 大量のタブを一度に処理する場合、API レート制限により時間がかかることがあります
