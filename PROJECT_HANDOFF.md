# Invoice Creator - プロジェクト引継ぎドキュメント

## 📦 プロジェクトバックアップ

**バックアップURL**: https://www.genspark.ai/api/files/s/yEBxdroW

このtar.gzファイルには以下が含まれます：
- 完全なソースコード
- Git履歴
- 設定ファイル
- node_modules以外のすべてのファイル

---

## 🚀 新しいGenSparkスペースでの復元手順

### 1. バックアップのダウンロードと展開
```bash
# ホームディレクトリに移動
cd /home/user

# バックアップをダウンロード
wget https://www.genspark.ai/api/files/s/yEBxdroW -O invoice-creator-backup.tar.gz

# 展開（webappディレクトリが復元される）
tar -xzf invoice-creator-backup.tar.gz
```

### 2. 依存関係のインストール
```bash
cd /home/user/webapp
npm install
```

### 3. ビルドと起動
```bash
# ビルド
npm run build

# PM2で起動
pm2 start ecosystem.config.cjs

# 動作確認
curl http://localhost:3000
```

### 4. サンドボックスURLの取得
GenSparkのツールで `GetServiceUrl(port=3000)` を実行

---

## 📋 現在のプロジェクト構成

### プロジェクト情報
- **名前**: Invoice Creator (請求書作成ツール)
- **本番URL**: https://invoice-creator.lifepepper-apps-natsu.workers.dev/
- **GitHub**: https://github.com/natsukoyoko/invoice-creator
- **最新コミット**: 4f08b6c (CSV import/export feature)

### 技術スタック
- **フレームワーク**: Hono (Cloudflare Workers/Pages)
- **ビルドツール**: Vite
- **スタイル**: Tailwind CSS (CDN)
- **アイコン**: Font Awesome
- **デプロイ**: Cloudflare Pages
- **プロセス管理**: PM2

### ディレクトリ構造
```
webapp/
├── src/
│   └── index.tsx           # メインアプリケーション（2,500行超）
├── public/                 # 静的ファイル（現在は空）
├── dist/                   # ビルド出力（デプロイ用）
├── ecosystem.config.cjs    # PM2設定
├── wrangler.jsonc          # Cloudflare設定
├── vite.config.ts          # Vite設定
├── package.json            # 依存関係
├── tsconfig.json           # TypeScript設定
└── .git/                   # Git履歴

```

### 主要な機能
1. **請求元情報入力**（法人/個人事業主/フリーランス）
2. **請求先情報入力**（国内/海外）
3. **請求項目管理**（部署、業務カテゴリ、数量、単価）
4. **CSV機能**（Template / Export / Import）
5. **自動計算**（小計、消費税、源泉徴収税、合計）
6. **プレビュー機能**（通常版 / 作業報告書付き版）
7. **PDF保存**（ブラウザ印刷機能）
8. **データ保存**（localStorage）

---

## 🎯 次のプロジェクト: KOL署名承認システム（提案1）

### 概要
- LIFE PEPPER側が請求書雛形を作成
- KOLへ固有URLを送付
- KOLが確認・電子署名
- 署名済みPDFを自動生成

### 新規実装が必要な機能
1. **データベース**: Cloudflare D1で請求書データ保存
2. **URL生成**: 固有の承認URL生成機能
3. **署名画面**: KOL向けの読み取り専用 + 署名エリア
4. **電子署名**: Canvas APIでタッチ署名実装
5. **PDF生成**: 署名付きPDF自動生成
6. **ステータス管理**: 未送付 / 送付済 / 署名済
7. **簡易ダッシュボード**: 請求書一覧とステータス確認

### 技術スタック（推奨）
- フロントエンド: Hono + Tailwind CSS（現在と同じ）
- データベース: Cloudflare D1
- ストレージ: Cloudflare R2（署名画像、PDF保存）
- 認証: 簡易パスワード or メールリンク認証

### 実装難易度
- **時間**: 10〜15時間
- **難易度**: 中

---

## 📊 データベーススキーマ案（D1）

### invoices テーブル
```sql
CREATE TABLE invoices (
  id TEXT PRIMARY KEY,
  approval_token TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL, -- 'pending', 'sent', 'signed'
  
  -- 請求元情報
  issuer_type TEXT,
  issuer_name TEXT,
  issuer_email TEXT,
  issuer_address TEXT,
  
  -- KOL情報
  kol_name TEXT NOT NULL,
  kol_email TEXT NOT NULL,
  kol_address TEXT,
  
  -- 金額情報
  subtotal REAL,
  tax REAL,
  withholding REAL,
  total REAL,
  currency TEXT,
  
  -- 日付
  invoice_date TEXT,
  due_date TEXT,
  
  -- 署名情報
  signature_image_url TEXT,
  signed_at TEXT,
  signed_ip TEXT,
  
  -- メタデータ
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

### invoice_items テーブル
```sql
CREATE TABLE invoice_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_id TEXT NOT NULL,
  department TEXT,
  job_category TEXT,
  task_detail TEXT,
  project_name TEXT,
  quantity REAL,
  unit_price REAL,
  subtotal REAL,
  tax_exempt INTEGER DEFAULT 0,
  FOREIGN KEY (invoice_id) REFERENCES invoices(id)
);
```

---

## 🔧 開発のヒント

### Cloudflare D1のセットアップ
```bash
# D1データベースを作成
npx wrangler d1 create kol-approval-system

# wrangler.jsonc に追加
{
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "kol-approval-system",
      "database_id": "your-database-id"
    }
  ]
}

# マイグレーションファイル作成
mkdir migrations
# migrations/0001_initial_schema.sql にスキーマを記述

# ローカルで適用
npx wrangler d1 migrations apply kol-approval-system --local

# 本番に適用
npx wrangler d1 migrations apply kol-approval-system
```

### Canvas署名の実装例
```typescript
// 署名キャンバス
const canvas = document.getElementById('signatureCanvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d');
let isDrawing = false;

canvas.addEventListener('mousedown', () => isDrawing = true);
canvas.addEventListener('mouseup', () => isDrawing = false);
canvas.addEventListener('mousemove', (e) => {
  if (!isDrawing) return;
  ctx.lineTo(e.offsetX, e.offsetY);
  ctx.stroke();
});

// 署名画像を取得
const signatureDataUrl = canvas.toDataURL('image/png');
```

### PDF生成の実装例
```typescript
// ブラウザ印刷APIを使用（シンプル）
window.print();

// または、html2canvas + jsPDF を使用（より柔軟）
// ※ ライブラリが必要
```

---

## 📝 重要な注意点

### 現在のプロジェクトから再利用できるもの
✅ 請求書フォームのHTML構造  
✅ 入力フィールドの検証ロジック  
✅ 自動計算ロジック  
✅ プレビュー画面のレイアウト  
✅ スタイル（Tailwind CSS）  
✅ CSV機能（必要に応じて）  

### 新規実装が必要なもの
🆕 データベース連携（D1）  
🆕 URL生成・管理機能  
🆕 署名キャンバス実装  
🆕 署名画像の保存（R2）  
🆕 ステータス管理UI  
🆕 簡易ダッシュボード  

---

## 🔗 リンク集

- **現在のアプリ**: https://invoice-creator.lifepepper-apps-natsu.workers.dev/
- **GitHub**: https://github.com/natsukoyoko/invoice-creator
- **プロジェクトバックアップ**: https://www.genspark.ai/api/files/s/yEBxdroW
- **Cloudflare D1ドキュメント**: https://developers.cloudflare.com/d1/
- **Cloudflare R2ドキュメント**: https://developers.cloudflare.com/r2/
- **Hono公式ドキュメント**: https://hono.dev/

---

## 💬 新しいスペースでの最初のプロンプト例

```
KOL署名承認システムを作成したいです。以下のバックアップから既存の請求書作成ツールを復元し、それをベースに新しいシステムを構築してください。

バックアップURL: https://www.genspark.ai/api/files/s/yEBxdroW

要件:
1. LIFE PEPPER側が請求書雛形を作成
2. KOLへ固有URLを送付
3. KOLが確認・電子署名
4. 署名済みPDFを自動生成
5. Cloudflare D1でデータ保存
6. 簡易ダッシュボードで一覧管理

技術スタック: Hono + Cloudflare Pages + D1 + R2

まず、バックアップを復元して動作確認をお願いします。
```

---

## ✅ 準備完了

このドキュメントと共に、プロジェクトバックアップが利用可能です。
新しいGenSparkスペースで、このバックアップURLを使用して復元してください。

何かご質問があれば、このドキュメントを参照してください！
