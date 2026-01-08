# Invoice Creator / 請求書作成アプリ

## Project Overview / プロジェクト概要

外部パートナー向けの請求書作成Webアプリケーションです。Google Sheetsのテンプレートから移行し、入力の強制力を持たせることで、再提出や手動修正の管理業務を削減します。

**Name**: Invoice Creator  
**Goal**: 外部パートナーが簡単に正確な請求書を作成できるシステム  
**Features**:
- 日英バイリンガル対応（全てのラベルがEnglish / 日本語形式）
- Arialフォント統一
- 発行者タイプ選択（法人/個人事業主/フリーランス）
- 日本居住・非居住者の自動判定
- 業務カテゴリに応じた源泉徴収の自動判定
- 国内源泉徴収率10.21%、国外源泉徴収率20.42%
- 税込税抜の自動計算
- 部署別担当者の自動絞り込み（最大金額の部署から選択）
- 支払い方法に応じた条件付きフィールド表示
- LocalStorageによる発行者情報と支払い情報の自動保存・入力
- A4印刷最適化
- 請求書プレビュー・印刷機能
- 入力バリデーション

## URLs

- **Development**: https://3000-i8u9xqeeezskodrybjork-8f57ffe2.sandbox.novita.ai
- **GitHub**: (To be added after pushing to repository)

## Currently Completed Features / 完成済み機能

### ✅ 発行者情報（FROM）
- 発行者タイプ（法人/個人事業主/フリーランス）（必須）
- 氏名（必須）
- T番号（任意）
- 住所（必須）
- メールアドレス（必須）
- 電話番号（任意）
- **居住地（必須・ラジオボタン形式）**:
  - 日本在住 (Residing in Japan)
  - 日本以外在住 (Residing outside Japan)
- 日本非居住者の場合：「Declaration: All contracted work was performed outside Japan」チェックボックス（必須）

### ✅ クライアント情報（BILL TO）
- 株式会社 LIFE PEPPERの情報を自動表示
- 担当者名（最大金額部署から自動選択）

### ✅ マスタデータ管理

**部署リスト（DEPARTMENTS）**:
- A-01 ソリューション
- A-02 店舗
- B-01 商談獲得
- C-01 PEPPER Likes
- C-02 dot B
- X-01 経理
- その他

**担当社員リスト（STAFF_LIST）**: 37名
- 部署別に管理され、請求項目の最大金額部署に属する社員のみを50音順で表示
- 例：都所 遼 (C-01, B-01)、中村 黎志 (A-01)、長橋 悠 (X-01) など

**業務カテゴリ**:

*国内居住者用（JOB_LIST_DOMESTIC）*:
1. SNS運用代行（源泉なし）
2. 広告運用（源泉なし）
3. コーディング（源泉なし）
4. 商談獲得（源泉なし）
5. 被リンク獲得（源泉なし）
6. CS業務（源泉なし）
7. その他（**デフォルト：源泉あり、税率10.21%、自動適用**）

*国外居住者用（JOB_LIST_FOREIGN）*:
1. クリエイティブ制作（Group A: 源泉あり、税率20.42%）
2. コンテンツ企画・制作支援（Group A: 源泉あり）
3. コピー・ライティング業務（Group A: 源泉あり）
4. 動画・画像編集（Group A: 源泉あり）
5. SNS関連業務（Group B: 源泉なし）
6. インフルエンサー管理・調整業務（Group B: 源泉なし）
7. 翻訳業務（Group B: 源泉なし）
8. 広告運用（Group B: 源泉なし）
9. 商談獲得（Group B: 源泉なし）
10. その他（Manual: **手動チェックボックスで選択可能**）
9. 商談獲得（Group B: 源泉なし）
10. その他（Manual: 手動チェック）

### ✅ 請求書詳細
- 請求日（必須・デフォルト：今日の日付）
- 支払期限（必須）
- 税区分（税込/税抜）
- 源泉徴収の自動判定（業務カテゴリに基づく）
- 源泉徴収に関する注意事項の表示

### ✅ 請求項目
- 部署選択
- 業務カテゴリ選択（居住状態により自動切替）
- 「その他」選択時の源泉徴収チェックボックス（非居住者のみ表示）
- タスク詳細（必須）
- プロジェクト名（必須）
- 数量（必須・デフォルト：1）
- 単価（必須）
- 小計（自動計算）
- 項目の追加・削除機能
- 自動合計計算（小計、消費税10%、源泉徴収税、合計）

### ✅ 税率・計算ロジック

**消費税**: 10%（税別・税込の切り替え）

**源泉徴収率**:
- 国内居住者: 10.21%
- 国外居住者: 20.42%

**計算方法**:
- 税込設定: 内税（小計÷1.1）から源泉徴収税を計算
- 税抜設定: 小計から源泉徴収税を計算
- **表示: 小計欄に「Withholding Tax / 源泉徴収税 (10.21%)」または「Withholding Tax / 源泉徴収税 (20.42%)」として税率付きでマイナス表示**
- **国内居住者の「その他」業務カテゴリ**: デフォルトで源泉徴収対象（チェックボックス非表示）
- **国外居住者の「その他」業務カテゴリ**: 手動チェックボックスで源泉徴収対象を選択可能

### ✅ 支払い情報（条件付きフィールド）

**国内送金 (Domestic Transfer)**:
1. Bank Name / 銀行名 *
2. Branch Name / 支店名 *
3. Branch Number / 支店番号 * (ゼロ埋め対応)
4. Account Type / 口座種別 * (普通/当座)
5. Account Number / 口座番号 * (ゼロ埋め対応)
6. Account Holder's Name in Katakana / 受取人名［カナ］ *

**海外送金 (International Transfer)**:

*受取人情報 / Recipient Information*:
1. Recipient's Country of Residence / 受取人居住国 *
2. Recipient's E-mail Address / 受取人メールアドレス *
3. Recipient's Address / 受取人住所 *
4. Recipient's Phone Number / 受取人電話番号 *
5. Date of Birth / 生年月日 *

*銀行情報 / Bank Information*:
6. Overseas Bank Name / 海外銀行名 *
7. Financial Institution Code / 金融機関コード (Optional / 任意)
8. Branch Name / 支店名 *
9. Branch Number / 支店番号 *
10. Bank Address / 銀行住所 *
11. Account Number / 口座番号 *
12. SWIFT Code / SWIFTコード *
13. Account Name / 口座名義 *

**PayPal**:
- PayPal Identity / PayPal登録アドレス *

### ✅ データ保存機能
- LocalStorageを使用して発行者情報と支払い情報を自動保存
- 次回アクセス時に自動入力

### ✅ プレビュー・印刷機能
- 請求書のプレビュー表示
- A4サイズ1枚に最適化されたレイアウト
- 印刷時は背景色を消し、文字を黒に変更
- 印刷時は入力フォームを非表示

### ✅ UI/UXデザイン
- 全体のフォント：Arial統一
- レスポンシブデザイン（モバイル・デスクトップ対応）
- 編集モードとプレビューモードの切り替え
- すべてのラベルがEnglish / 日本語形式

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

### Master Data / マスタデータ

**DEPARTMENTS (部署)**:
```javascript
{
  'A-01': 'A-01 ソリューション',
  'A-02': 'A-02 店舗',
  'B-01': 'B-01 商談獲得',
  'C-01': 'C-01 PEPPER Likes',
  'C-02': 'C-02 dot B',
  'X-01': 'X-01 経理'
}
```

**STAFF_LIST (担当社員)**: 37名
- 各社員は所属部署のリストを持つ
- 請求項目の最大金額部署に基づいて絞り込み
- 50音順でソート

**JOB_LIST_DOMESTIC (国内業務カテゴリ)**:
- 各カテゴリは源泉徴収の有無を持つ
- 「その他」のみ手動チェック可能

**JOB_LIST_FOREIGN (国外業務カテゴリ)**:
- Group A: 源泉徴収あり（20.42%）
- Group B: 源泉徴収なし
- Manual: 手動チェック

### Data Models / データモデル

**IssuerInfo (発行者情報)**:
```typescript
{
  issuerType: 'corporation' | 'sole' | 'freelance',
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
  taxType: 'inclusive' | 'exclusive'
}
```

**InvoiceItem (請求項目)**:
```typescript
{
  department: string,
  departmentOther?: string,
  jobCategory: string,
  jobCategoryWithholding?: boolean,
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
  intlEmail?: string,
  intlAddress?: string,
  intlPhone?: string,
  intlDOB?: string,
  intlBankName?: string,
  intlInstitutionCode?: string,
  intlBranchName?: string,
  intlBranchNumber?: string,
  intlBankAddress?: string,
  intlAccountNumber?: string,
  intlSwiftCode?: string,
  intlAccountName?: string,
  // PayPal fields
  paypalEmail?: string
}
```

### Calculations / 計算ロジック

**税込の場合**:
```
基準額 = 小計 / 1.1
消費税 = 小計 - 基準額
源泉徴収税 = 基準額 × 源泉徴収率（源泉徴収ありの場合）
合計 = 小計 - 源泉徴収税
```

**税抜の場合**:
```
消費税 = 小計 × 0.1
源泉徴収税 = 小計 × 源泉徴収率（源泉徴収ありの場合）
合計 = 小計 + 消費税 - 源泉徴収税
```

**源泉徴収率**:
- 国内居住者: 10.21%
- 国外居住者: 20.42%

## User Guide / 使用方法

### 1. 発行者情報の入力
- 発行者タイプを選択（法人/個人事業主/フリーランス）
- 初回アクセス時：すべての情報を入力
- 2回目以降：保存された情報が自動入力されます
- 日本居住者の場合はチェックボックスをオン

### 2. クライアント情報
- 担当者は請求項目入力後に自動で選択肢が表示されます
- 最大金額の部署に属する社員のみが表示されます

### 3. 請求書詳細
- 請求日と支払期限を入力
- 税区分を選択（税込/税抜）
- 源泉徴収は業務カテゴリに応じて自動判定されます

### 4. 請求項目の入力
- 部署を選択
- 業務カテゴリを選択（居住状態により自動的に切り替わります）
- 「その他」を選択した場合、非居住者のみ源泉徴収チェックボックスが表示されます
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
- プレビュー画面から「Print Invoice / 印刷」で印刷可能（A4サイズ最適化）

## Features Not Yet Implemented / 未実装機能

- [ ] PDF出力機能
- [ ] 請求書のサーバー側保存
- [ ] 請求書の履歴管理
- [ ] 請求書番号の自動採番
- [ ] メール送信機能
- [ ] 部署リストの管理画面
- [ ] 社員リストの管理画面
- [ ] 業務カテゴリの管理画面
- [ ] 複数言語対応（現在は日英のみ）
- [ ] テンプレート機能（よく使う項目の保存）

## Recommended Next Steps / 推奨される次のステップ

1. **データベース統合**: Cloudflare D1を使用してマスタデータと請求書データをサーバー側で管理
2. **PDF生成**: jsPDFなどのライブラリを使用してPDF出力機能を追加
3. **認証機能**: ユーザーアカウント管理と請求書履歴の個人管理
4. **請求書番号**: 自動採番システムの実装
5. **メール機能**: SendGridなどを使用した請求書送信機能
6. **管理画面**: 部署、社員、業務カテゴリの編集機能
7. **テンプレート**: よく使う項目をテンプレートとして保存する機能
8. **承認ワークフロー**: 請求書の承認プロセスの実装

## Tech Stack / 技術スタック

- **Backend**: Hono (Lightweight web framework)
- **Frontend**: Vanilla JavaScript + TailwindCSS
- **Runtime**: Cloudflare Workers
- **Storage**: LocalStorage (Client-side)
- **Build Tool**: Vite
- **Process Manager**: PM2 (Development)
- **Font**: Arial (統一)
- **Print**: A4 optimized

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
│   ├── index.tsx          # Main Hono application with embedded HTML/JS
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
