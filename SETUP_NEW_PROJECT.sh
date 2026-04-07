#!/bin/bash
# KOL署名承認システム - 新しいプロジェクト用セットアップ（Git混線を回避）

echo "========================================"
echo "KOL署名承認システム - セットアップ"
echo "========================================"
echo ""

# Step 1: バックアップのダウンロード
echo "📦 Step 1: バックアップをダウンロード中..."
cd /home/user
wget https://www.genspark.ai/api/files/s/yEBxdroW -O backup.tar.gz

if [ $? -eq 0 ]; then
    echo "✅ ダウンロード完了"
else
    echo "❌ ダウンロード失敗"
    exit 1
fi
echo ""

# Step 2: 展開
echo "📂 Step 2: バックアップを展開中..."
tar -xzf backup.tar.gz

if [ $? -eq 0 ]; then
    echo "✅ 展開完了"
else
    echo "❌ 展開失敗"
    exit 1
fi
echo ""

# Step 3: プロジェクト名を変更
echo "📝 Step 3: プロジェクト名を変更中..."
mv webapp kol-approval-system
cd kol-approval-system
echo "✅ プロジェクト名を 'kol-approval-system' に変更"
echo ""

# Step 4: 既存のGit履歴を削除（混線回避）
echo "🗑️  Step 4: 既存のGit履歴を削除中..."
rm -rf .git
echo "✅ 既存のGit履歴を削除（invoice-creatorリポジトリから切り離し完了）"
echo ""

# Step 5: 新しいGitリポジトリを初期化
echo "🆕 Step 5: 新しいGitリポジトリを初期化中..."
git init
git add .
git commit -m "Initial commit - KOL approval system based on invoice creator"

if [ $? -eq 0 ]; then
    echo "✅ 新しいGitリポジトリを初期化"
else
    echo "❌ Git初期化失敗"
    exit 1
fi
echo ""

# Step 6: 依存関係のインストール
echo "📦 Step 6: 依存関係をインストール中..."
npm install

if [ $? -eq 0 ]; then
    echo "✅ インストール完了"
else
    echo "❌ インストール失敗"
    exit 1
fi
echo ""

# Step 7: ビルド
echo "🔨 Step 7: プロジェクトをビルド中..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ ビルド完了"
else
    echo "❌ ビルド失敗"
    exit 1
fi
echo ""

# Step 8: PM2で起動
echo "🚀 Step 8: サービスを起動中..."
pm2 start ecosystem.config.cjs

if [ $? -eq 0 ]; then
    echo "✅ 起動完了"
else
    echo "❌ 起動失敗"
    exit 1
fi
echo ""

# Step 9: 動作確認
echo "🧪 Step 9: 動作確認中..."
sleep 3
curl -s http://localhost:3000 > /dev/null

if [ $? -eq 0 ]; then
    echo "✅ サービスが正常に起動しています"
else
    echo "❌ サービスの起動に失敗しました"
    exit 1
fi
echo ""

# 完了メッセージ
echo "========================================"
echo "✅ セットアップ完了！"
echo "========================================"
echo ""
echo "📋 次のステップ:"
echo ""
echo "1️⃣  GetServiceUrl ツールでポート 3000 の公開URLを取得"
echo "2️⃣  ブラウザでアクセスして動作確認"
echo ""
echo "3️⃣  GitHubで新しいリポジトリを作成:"
echo "   - リポジトリ名: kol-approval-system（推奨）"
echo "   - 説明: KOL signature approval system"
echo ""
echo "4️⃣  新しいリポジトリに接続:"
echo "   cd /home/user/kol-approval-system"
echo "   git remote add origin https://github.com/natsukoyoko/kol-approval-system.git"
echo "   git push -u origin main"
echo ""
echo "5️⃣  PROJECT_HANDOFF.md を読んで実装の詳細を確認"
echo ""
echo "🔗 便利なコマンド:"
echo "  - ログ確認: pm2 logs --nostream"
echo "  - サービス再起動: pm2 restart all"
echo "  - サービス停止: pm2 stop all"
echo ""
echo "⚠️  重要: このプロジェクトは invoice-creator とは完全に独立しています"
echo "   両方のプロジェクトを並行開発しても混線しません。"
echo ""
