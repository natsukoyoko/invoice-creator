# 🚀 新しいスペースでの開始方法 - KOL署名承認システム

## ⚠️ Git混線回避について

**このガイドのセットアップスクリプトは、Git混線を完全に回避します。**

### 仕組み
1. `rm -rf .git` で既存のGit履歴を削除
2. `git init` で新しい独立したGitリポジトリを作成
3. 新しいGitHubリポジトリに接続

**結果**: invoice-creator と kol-approval-system は完全に独立 ✅

---

## 📦 必要な情報

### プロジェクトバックアップURL
```
https://www.genspark.ai/api/files/s/yEBxdroW
```

---

## ⚡ 自動セットアップ（推奨）

### 新しいGenSparkスペースで以下のコマンドを実行：

```bash
cd /home/user
wget https://www.genspark.ai/api/files/s/yEBxdroW -O backup.tar.gz
tar -xzf backup.tar.gz
cd webapp
bash SETUP_NEW_PROJECT.sh
```

### これで自動的に：
- ✅ バックアップのダウンロード
- ✅ 展開
- ✅ プロジェクト名を `kol-approval-system` に変更
- ✅ **既存のGit履歴を削除（混線回避）**
- ✅ **新しいGitリポジトリを初期化**
- ✅ npm install
- ✅ ビルド
- ✅ PM2起動
- ✅ 動作確認

---

## 📝 セットアップ後の手順

### 1. 動作確認
```bash
# GenSparkツールで実行
GetServiceUrl(port=3000)
```

ブラウザで公開URLにアクセスして、既存の請求書作成ツールが動作することを確認。

### 2. 新しいGitHubリポジトリを作成

GitHubで新しいリポジトリを作成：
- **リポジトリ名**: `kol-approval-system`（推奨）
- **説明**: KOL signature approval system
- **公開/非公開**: お好みで

### 3. 新しいリポジトリに接続

```bash
cd /home/user/kol-approval-system
git remote add origin https://github.com/natsukoyoko/kol-approval-system.git
git push -u origin main
```

---

## 💬 新しいスペースでの最初のプロンプト（コピペ用）

```
KOL署名承認システムを作成します。

バックアップURL: https://www.genspark.ai/api/files/s/yEBxdroW

SETUP_NEW_PROJECT.sh を実行して既存プロジェクトを復元してください。
このスクリプトは自動的にGit混線を回避します（既存のGit履歴を削除し、新しいリポジトリを初期化）。

復元後、PROJECT_HANDOFF.md の内容に基づいて以下の機能を実装してください：

【主要機能】
1. LIFE PEPPER側が請求書雛形を作成
2. 固有URL生成（例: /approval/abc123）
3. KOLへURL送付
4. KOL側で内容確認 + 電子署名（Canvas API）
5. 署名済みPDF自動生成
6. ステータス管理（未送付/送付済/署名済）
7. 簡易ダッシュボード（請求書一覧）

【技術スタック】
- フロントエンド: Hono + Tailwind CSS
- データベース: Cloudflare D1
- ストレージ: Cloudflare R2
- デプロイ: Cloudflare Pages

まず、セットアップスクリプトを実行して動作確認をお願いします。
```

---

## 📊 プロジェクト分離の確認

| 項目 | 現在のスペース（請求書作成） | 新しいスペース（KOL承認） |
|------|---------------------------|------------------------|
| **プロジェクト名** | webapp | kol-approval-system |
| **ディレクトリ** | /home/user/webapp | /home/user/kol-approval-system |
| **GitHubリポジトリ** | invoice-creator | kol-approval-system（新規） |
| **リモートURL** | natsukoyoko/invoice-creator | natsukoyoko/kol-approval-system |
| **相互影響** | ❌ なし（完全独立） | ❌ なし（完全独立） |

---

## 📖 詳細ドキュメント

復元後、以下のファイルを参照してください：

- **PROJECT_HANDOFF.md**: 詳細な実装ガイド
- **データベーススキーマ**: D1テーブル設計
- **実装のヒント**: Canvas署名、PDF生成など

---

## ✅ 準備完了

このガイドに従えば、Git混線を完全に回避しながら新しいプロジェクトを開始できます 🎉

新しいスペースで上記のプロンプトをコピペして開始してください！
