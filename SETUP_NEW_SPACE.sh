#!/bin/bash
# Invoice Creator - 新しいGenSparkスペースでのセットアップスクリプト

echo "================================"
echo "Invoice Creator セットアップ"
echo "================================"
echo ""

# Step 1: バックアップのダウンロード
echo "📦 Step 1: バックアップをダウンロード中..."
cd /home/user
wget https://www.genspark.ai/api/files/s/yEBxdroW -O invoice-creator-backup.tar.gz

if [ $? -eq 0 ]; then
    echo "✅ ダウンロード完了"
else
    echo "❌ ダウンロード失敗"
    exit 1
fi
echo ""

# Step 2: 展開
echo "📂 Step 2: バックアップを展開中..."
tar -xzf invoice-creator-backup.tar.gz

if [ $? -eq 0 ]; then
    echo "✅ 展開完了"
else
    echo "❌ 展開失敗"
    exit 1
fi
echo ""

# Step 3: 依存関係のインストール
echo "📦 Step 3: 依存関係をインストール中..."
cd /home/user/webapp
npm install

if [ $? -eq 0 ]; then
    echo "✅ インストール完了"
else
    echo "❌ インストール失敗"
    exit 1
fi
echo ""

# Step 4: ビルド
echo "🔨 Step 4: プロジェクトをビルド中..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ ビルド完了"
else
    echo "❌ ビルド失敗"
    exit 1
fi
echo ""

# Step 5: PM2で起動
echo "🚀 Step 5: サービスを起動中..."
pm2 start ecosystem.config.cjs

if [ $? -eq 0 ]; then
    echo "✅ 起動完了"
else
    echo "❌ 起動失敗"
    exit 1
fi
echo ""

# Step 6: 動作確認
echo "🧪 Step 6: 動作確認中..."
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
echo "================================"
echo "✅ セットアップ完了！"
echo "================================"
echo ""
echo "📋 次のステップ:"
echo "1. GetServiceUrl ツールでポート 3000 の公開URLを取得"
echo "2. ブラウザでアクセスして動作確認"
echo "3. PROJECT_HANDOFF.md を読んで次のプロジェクトの詳細を確認"
echo ""
echo "🔗 便利なコマンド:"
echo "  - ログ確認: pm2 logs webapp --nostream"
echo "  - サービス再起動: pm2 restart webapp"
echo "  - サービス停止: pm2 stop webapp"
echo ""
