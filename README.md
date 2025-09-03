# 🤖 AI Tab Sorter - Firefox Extension

OpenAI互換APIを使用してタブを自動的にグループ化するFirefox拡張機能です。ローカルLLM（Ollama、llama.cpp等）を使用してプライバシーを保護しながら、インテリジェントなタブ管理を実現します。

## ✨ 機能

- **AI駆動の自動分類**: ページコンテンツを理解し、適切なカテゴリに自動分類
- **プライバシー重視**: ローカルLLM対応でデータが外部に送信されない
- **リアルタイム処理**: 新規タブを開いた際に自動的にグループ化
- **カスタマイズ可能**: カテゴリ、色、分類ルールを自由に設定
- **バッチ処理**: 複数のタブを効率的に一括分類

## 📦 インストール

### 開発環境のセットアップ

```bash
# 依存関係のインストール
npm install

# 開発ビルド（ファイル監視モード）
npm run dev

# プロダクションビルド
npm run build
```

### Firefoxへのインストール

1. `npm run build`でビルドを実行
2. Firefoxで `about:debugging` を開く
3. 「このFirefox」を選択
4. 「一時的な拡張機能を読み込む」をクリック
5. `dist/manifest.json`を選択

## 🔧 設定

### ローカルLLMのセットアップ（Ollama例）

```bash
# Ollamaのインストール
curl -fsSL https://ollama.ai/install.sh | sh

# モデルのダウンロード
ollama pull llama3

# CORSを許可してサーバー起動
OLLAMA_ORIGINS=chrome-extension://* ollama serve
```

### 拡張機能の設定

1. 拡張機能のポップアップまたは設定ページを開く
2. API設定:
   - エンドポイント: `http://localhost:11434/v1`
   - モデル: `llama3`
   - APIキー: ローカルLLMの場合は不要
3. カテゴリと除外URLをカスタマイズ

## 🏗️ プロジェクト構造

```
tab-sorting/
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