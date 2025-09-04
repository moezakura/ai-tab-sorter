# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

AI Tab Sorter - OpenAI互換APIを使用してFirefoxのタブを自動的にカテゴリごとにグループ化するブラウザ拡張機能。ローカルLLM（Ollama、llama.cpp等）対応。

## 技術スタック

### CSSフレームワーク: UnoCSS
- **設定ファイル**: `uno.config.ts`
- **重要**: Tailwindの標準クラス（`bg-green-500`等）は使用できません
- カスタムカラー定義とショートカットを使用
- アイコン表示には必ず`block`クラスを追加（`<i class="i-mdi-icon block">`）

## 開発コマンド

```bash
npm run dev          # 開発ビルド（ファイル監視モード）
npm run build        # プロダクションビルド
npm run type-check   # TypeScript型チェック（厳密モード）
npm run build:firefox # Firefox用完全ビルド（distビルド + xpiファイル生成）
```

## アーキテクチャ

### サービス指向アーキテクチャ
メインロジックは`src/background/`内のサービスクラスで構成：

1. **BackgroundService** (`index.ts`) - 全体の制御
2. **TabManager** - タブのライフサイクル管理と分類処理のキュー管理
3. **AIClassifier** - OpenAI互換APIによるコンテンツ分類
4. **GroupController** - Firefox Tab Groups APIの操作とグループ管理
5. **APIClient** - レート制限付きHTTP通信（10req/分）

### メッセージパッシング通信フロー
```
Content Script (contentExtractor.ts)
    ↓ [EXTRACT_CONTENT]
Background Service
    ↓ [API呼び出し]
AIClassifier → OpenAI互換API
    ↓ [分類結果]
GroupController → Tab Groups API
```

### 型定義構造
- すべての型は`src/types/index.ts`に集約
- `Message<T>`型による型安全なメッセージ通信
- `ExtensionSettings`による設定管理

## 重要な開発パターン

### Firefox拡張機能API使用
```typescript
// webextension-polyfillで統一されたAPI使用
import browser from 'webextension-polyfill';

// Tab Groups APIの可用性チェック必須
if (browser.tabGroups) {
  await browser.tabGroups.update(groupId, { title, color });
}
```

### レート制限とエラー処理
- `RateLimiter`クラスで10リクエスト/分に制限
- API呼び出し失敗時は必ずfallback処理を実装
- Tab Groups作成時はダミータブを使用して作成後に削除

### 状態管理
- 設定: `browser.storage.local`に永続化
- キャッシュ: メモリ内の`tabCache`と`groupCache`
- 処理キュー: `processingQueue`で重複防止

## ローカルLLM使用時の設定

Ollama使用例：
```bash
# CORSを許可してサーバー起動
OLLAMA_ORIGINS=moz-extension://* ollama serve
```

拡張機能設定：
- API URL: `http://localhost:11434/v1`
- Model: `llama3`（またはインストール済みモデル）
- APIキー: 不要（ローカルLLMの場合）

## 制約事項

1. **テスト未設定** - Jest等のテストフレームワークなし。手動テスト必須
2. **リンター未設定** - ESLint/Prettierなし。TypeScript strictモードのみ
3. **Tab Groups API制約** - Firefox固有の制限あり（グループ作成時にタブ必須等）
4. **CORS制限** - ローカルLLM使用時はCORS設定が必要

## ファイル修正時の注意

1. **型安全性維持** - すべてTypeScriptで記述し、any型の使用を避ける
2. **非同期処理** - Promise/async-awaitパターンを一貫して使用
3. **エラーハンドリング** - try-catchで例外を捕捉し、console.errorでログ出力
4. **日本語対応** - UIテキストとAIプロンプトは日本語を使用
5. **メッセージ通信** - 必ず`Message<T>`型を使用して型安全性を保証

### UnoCSS スタイリング注意事項

1. **利用可能なカラークラス** - `uno.config.ts`で定義されたカスタムカラーのみ使用可能
   - 例: `bg-primary`, `text-secondary`, `border-danger` など
   - Tailwind標準の`bg-green-500`等は使用不可

2. **ショートカット定義** - `uno.config.ts`の`shortcuts`セクションで定義済みのクラスを優先使用
   - 例: `btn-primary`, `toggle-slider`, `status-active` など

3. **スタイル優先順位の問題** - ショートカットのスタイルが優先される場合
   - 解決策: インラインスタイル（`element.style.property`）を使用

4. **アイコン表示** - `<i>`タグには必ず`block`クラスを追加
   - 正: `<i class="i-mdi-refresh block"></i>`
   - 誤: `<i class="i-mdi-refresh"></i>`

## デバッグ方法

1. `npm run dev`で開発ビルド起動
2. Firefox: `about:debugging` → 「このFirefox」→「一時的な拡張機能を読み込む」
3. `dist/manifest.json`を選択してロード
4. ブラウザコンソールとバックグラウンドコンソールでログ確認