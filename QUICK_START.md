# 🚀 新しいGenSparkスペースでの開始方法 - クイックガイド

## 📦 必要な情報

### プロジェクトバックアップURL
```
https://www.genspark.ai/api/files/s/yEBxdroW
```

---

## ⚡ 方法1: 自動セットアップ（推奨）

新しいGenSparkスペースで以下を実行：

```bash
cd /home/user
wget https://www.genspark.ai/api/files/s/yEBxdroW -O invoice-creator-backup.tar.gz
tar -xzf invoice-creator-backup.tar.gz
cd webapp
bash SETUP_NEW_SPACE.sh
```

これで自動的に：
- バックアップのダウンロード
- 展開
- npm install
- ビルド
- PM2起動
- 動作確認

が実行されます。

---

## 📝 方法2: 手動セットアップ

```bash
# 1. ダウンロード
cd /home/user
wget https://www.genspark.ai/api/files/s/yEBxdroW -O invoice-creator-backup.tar.gz

# 2. 展開
tar -xzf invoice-creator-backup.tar.gz

# 3. 依存関係インストール
cd webapp
npm install

# 4. ビルド
npm run build

# 5. 起動
pm2 start ecosystem.config.cjs

# 6. 確認
curl http://localhost:3000
```

---

## 🌐 公開URLの取得

GenSparkツールで実行：
```
GetServiceUrl(port=3000)
```

---

## 📖 詳細ドキュメント

`PROJECT_HANDOFF.md` を参照してください。以下が含まれます：
- 現在のプロジェクトの完全な説明
- 次のプロジェクト（KOL署名承認システム）の詳細設計
- データベーススキーマ案
- 実装のヒント
- コード例

---

## 💬 新しいスペースでの最初のプロンプト

```
KOL署名承認システムを作成したいです。
バックアップURL: https://www.genspark.ai/api/files/s/yEBxdroW

既存の請求書作成ツールを復元し、それをベースに以下の機能を持つシステムを構築してください：

1. LIFE PEPPER側が請求書雛形を作成
2. KOLへ固有URLを送付  
3. KOLが確認・電子署名
4. 署名済みPDFを自動生成
5. Cloudflare D1でデータ保存
6. 簡易ダッシュボードで一覧管理

技術スタック: Hono + Cloudflare Pages + D1 + R2

まず、セットアップスクリプトを実行して動作確認をお願いします。
```

---

## ✅ 準備完了チェックリスト

- [x] プロジェクトバックアップ作成
- [x] 詳細ドキュメント作成（PROJECT_HANDOFF.md）
- [x] 自動セットアップスクリプト作成
- [x] クイックガイド作成
- [x] GitHubにプッシュ完了

すべて準備完了です！新しいスペースで開始できます 🎉
