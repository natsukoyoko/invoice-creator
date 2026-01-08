# Invoice Creator / 請求書作成アプリ

## Project Overview / プロジェクト概要

外部パートナー向けの請求書作成Webアプリケーションです。Google Sheetsのテンプレートから移行し、入力の強制力を持たせることで、再提出や手動修正の管理業務を削減します。

**Name**: Invoice Creator  
**Goal**: 外部パートナーが簡単に正確な請求書を作成できるシステム  
**Features**:
- 日英バイリンガル対応
- 源泉徴収・税込税抜の自動計算
- 支払い方法に応じた条件付きフィールド表示
- LocalStorageによる発行者情報と支払い情報の自動保存・入力
- 請求書プレビュー・印刷機能
- 入力バリデーション

## URLs

- **Development**: https://3000-i8u9xqeeezskodrybjork-8f57ffe2.sandbox.novita.ai
- **GitHub**: (To be added after pushing to repository)

## Currently Completed Features / 完成済み機能

### ✅ 発行者情報（FROM）
- 氏名（必須）
- T番号（任意）
- 住所（必須）
- メールアドレス（必須）
- 電話番号（任意）
- 日本居住チェックボックス
- 日本非居住者の場合：「全ての契約業務は日本国外で実施されました」チェックボックス

### ✅ クライアント情報（BILL TO）
- 株式会社 LIFE PEPPERの情報を自動表示
- 担当者名（必須入力）

### ✅ 請求書詳細
- 請求日（必須・デフォルト：今日の日付）
- 支払期限（必須）
- 源泉徴収（YES/NO選択・デフォルト：YES）
- 税区分（税込/税抜）
- 源泉徴収に関する注意事項の表示

### ✅ 請求項目
- 部署選択（A-01 ソリューション、A-02 店舗、B-01 商談獲得、C-01 PEPPER Likes、C-02 dot B、X-01 経理、その他）
- その他の場合：自由入力フィールド表示
- タスク詳細（必須）
- プロジェクト名（必須）
- 数量（必須・デフォルト：1）
- 単価（必須）
- 小計（自動計算）
- 項目の追加・削除機能
- 自動合計計算（小計、消費税、源泉徴収税、合計）

### ✅ 支払い情報（条件付きフィールド）

**国内送金 (Domestic Transfer)**:
- 銀行名
- 支店名
- 支店番号（ゼロ埋め対応）
- 口座種別（普通/当座）
- 口座番号（ゼロ埋め対応）
- 受取人名［カナ］（全角カタカナ）

**海外送金 (International Transfer)**:
- 受取人居住国
- 受取人住所
- 受取人電話番号（ゼロ埋め対応）
- 受取人メールアドレス
- 生年月日
- 海外銀行名
- 金融機関コード
- 支店名
- 支店番号（ゼロ埋め対応）
- 銀行住所
- 口座番号（ゼロ埋め対応）
- SWIFTコード（ゼロ埋め対応）
- 口座名義

**PayPal**:
- PayPalメールアドレス

### ✅ データ保存機能
- LocalStorageを使用して発行者情報と支払い情報を自動保存
- 次回アクセス時に自動入力

### ✅ プレビュー・印刷機能
- 請求書のプレビュー表示
- ブラウザの印刷機能に対応
- 印刷時は入力フォームを非表示

## Functional Entry URIs / 機能エントリーポイント

| Path | Method | Description |
|------|--------|-------------|
| `/` | GET | メインページ（請求書作成フォーム） |
| `/api/invoice` | POST | 請求書データの送信（将来的なAPI拡張用） |

## Data Architecture / データ構造

### Storage / ストレージ
- **LocalStorage**: ブラウザのLocalStorageを使用してクライアント側でデータ保存
  - Key: `invoiceFormData`
  - 保存内容: 発行者情報、支払い情報

### Data Models / データモデル

**IssuerInfo (発行者情報)**:
```typescript
{
  issuerName: string,
  issuerTNumber?: string,
  issuerAddress: string,
  issuerEmail: string,
  issuerPhone?: string,
  residesInJapan: boolean,
  workPerformedOutsideJapan?: boolean
}
```

**InvoiceDetails (請求書詳細)**:
```typescript
{
  invoiceDate: string,
  dueDate: string,
  withholdingTax: 'yes' | 'no',
  taxType: 'inclusive' | 'exclusive'
}
```

**InvoiceItem (請求項目)**:
```typescript
{
  department: string,
  departmentOther?: string,
  taskDetails: string,
  projectName: string,
  quantity: number,
  unitPrice: number,
  subtotal: number (calculated)
}
```

**PaymentInfo (支払い情報)**:
```typescript
{
  paymentMethod: 'domestic' | 'international' | 'paypal',
  // Domestic fields
  domesticBankName?: string,
  domesticBranchName?: string,
  domesticBranchNumber?: string,
  domesticAccountType?: string,
  domesticAccountNumber?: string,
  domesticAccountHolder?: string,
  // International fields
  intlCountry?: string,
  intlAddress?: string,
  intlPhone?: string,
  intlEmail?: string,
  intlDOB?: string,
  intlBankName?: string,
  // ... other international fields
  // PayPal fields
  paypalEmail?: string
}
```

### Calculations / 計算ロジック

**税込の場合**:
```
基準額 = 小計 / 1.1
消費税 = 小計 - 基準額
源泉徴収税 = 基準額 × 0.1021（源泉徴収ありの場合）
合計 = 小計 - 源泉徴収税
```

**税抜の場合**:
```
消費税 = 小計 × 0.1
源泉徴収税 = 小計 × 0.1021（源泉徴収ありの場合）
合計 = 小計 + 消費税 - 源泉徴収税
```

## User Guide / 使用方法

### 1. 発行者情報の入力
- 初回アクセス時：すべての情報を入力
- 2回目以降：保存された情報が自動入力されます

### 2. クライアント情報
- 担当者名のみ入力してください（会社情報は自動表示）

### 3. 請求書詳細
- 請求日と支払期限を入力
- 源泉徴収の有無を選択（デフォルト：YES）
- 税区分を選択（税込/税抜）

### 4. 請求項目の入力
- 部署を選択
- タスク詳細、プロジェクト名、数量、単価を入力
- 小計は自動計算されます
- 「項目を追加」ボタンで複数項目を追加可能

### 5. 支払い情報
- 支払い方法を選択（国内送金/海外送金/PayPal）
- 選択した方法に応じたフィールドが表示されます
- 初回入力後は次回自動入力されます

### 6. プレビュー・保存
- 「Preview Invoice / プレビュー」ボタンで請求書を確認
- 「Save / 保存」ボタンで発行者情報と支払い情報を保存
- プレビュー画面から「Print Invoice / 印刷」で印刷可能

## Features Not Yet Implemented / 未実装機能

- [ ] PDF出力機能
- [ ] 請求書のサーバー側保存
- [ ] 請求書の履歴管理
- [ ] 請求書番号の自動採番
- [ ] メール送信機能
- [ ] 部署リストの管理画面
- [ ] 複数言語対応（現在は日英のみ）
- [ ] テンプレート機能（よく使う項目の保存）

## Recommended Next Steps / 推奨される次のステップ

1. **データベース統合**: Cloudflare D1を使用して請求書データをサーバー側で保存
2. **PDF生成**: jsPDFなどのライブラリを使用してPDF出力機能を追加
3. **認証機能**: ユーザーアカウント管理と請求書履歴の個人管理
4. **請求書番号**: 自動採番システムの実装
5. **メール機能**: SendGridなどを使用した請求書送信機能
6. **管理画面**: 部署リストの編集機能
7. **テンプレート**: よく使う項目をテンプレートとして保存する機能

## Tech Stack / 技術スタック

- **Backend**: Hono (Lightweight web framework)
- **Frontend**: Vanilla JavaScript + TailwindCSS
- **Runtime**: Cloudflare Workers
- **Storage**: LocalStorage (Client-side)
- **Build Tool**: Vite
- **Process Manager**: PM2 (Development)

## Development / 開発

### Prerequisites / 必要条件
- Node.js 20+
- npm

### Setup / セットアップ
```bash
cd /home/user/webapp
npm install
```

### Run Development Server / 開発サーバー起動
```bash
# Build first
npm run build

# Start with PM2
pm2 start ecosystem.config.cjs

# Check status
pm2 list

# View logs
pm2 logs webapp --nostream
```

### Build / ビルド
```bash
npm run build
```

### Deploy to Cloudflare Pages / Cloudflare Pagesへのデプロイ
```bash
# First time: Create project
npx wrangler pages project create webapp --production-branch main

# Deploy
npm run deploy:prod
```

## Project Structure / プロジェクト構造

```
webapp/
├── src/
│   ├── index.tsx          # Main Hono application
│   └── renderer.tsx       # JSX renderer
├── dist/                  # Build output
│   └── _worker.js         # Compiled worker
├── .git/                  # Git repository
├── .gitignore            # Git ignore file
├── ecosystem.config.cjs  # PM2 configuration
├── wrangler.jsonc        # Cloudflare configuration
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
├── vite.config.ts        # Vite build configuration
└── README.md             # This file
```

## Company Information / 会社情報

**Client (請求書送付先)**:
- 会社名: 株式会社 LIFE PEPPER
- 住所: 〒104-0045 東京都中央区築地3–1–10 Shinto GINZA EAST 6F
- 電話: +81 03-6869-7976

## Deployment Status / デプロイ状況

- **Platform**: Cloudflare Pages (準備完了)
- **Status**: ✅ Development Active / 開発環境稼働中
- **Last Updated**: 2026-01-08

## License / ライセンス

Private - LIFE PEPPER Corporation

---

**Note**: このアプリケーションは外部パートナー向けの請求書作成を効率化するために開発されました。
