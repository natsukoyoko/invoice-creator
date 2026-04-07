# Invoice Creator - バックアップ履歴

## 📦 最新バックアップ（推奨）

### **2024-04-07 - 最終完全バックアップ**
**URL**: https://www.genspark.ai/api/files/s/ixnss4wu

**説明**: 
- すべての機能を含む最終完全バックアップ
- Git コミット: `929315a`
- すべての変更がGitHubにプッシュ済み

**含まれる機能**:
- ✅ 請求書作成機能（法人/個人事業主/フリーランス）
- ✅ 請求先情報（国内/海外）
- ✅ 法人番号入力（法人 & 日本居住者のみ）
- ✅ 屋号入力（個人事業主のみ）
- ✅ CSV機能（Template / Export / Import）
- ✅ 自動計算（小計、消費税、源泉徴収税）
- ✅ プレビュー機能（通常版 / 作業報告書付き版）
- ✅ PDF保存（支払期限_請求者氏名.pdf）
- ✅ データ保存（localStorage）
- ✅ 通貨選択（12通貨対応）
- ✅ 税区分制御（国内/国外）
- ✅ 課税なしチェックボックス
- ✅ 備考欄
- ✅ リセット機能

**ファイルサイズ**: 1.67 MB

**復元方法**:
```bash
cd /home/user
wget https://www.genspark.ai/api/files/s/ixnss4wu -O backup.tar.gz
tar -xzf backup.tar.gz
cd webapp
npm install
npm run build
pm2 start ecosystem.config.cjs
```

---

## 📦 以前のバックアップ

### **2024-04-07 - 初回バックアップ**
**URL**: https://www.genspark.ai/api/files/s/yEBxdroW

**説明**: 
- 新しいスペース用の初回バックアップ
- CSV機能追加直後

**ファイルサイズ**: 1.65 MB

**用途**: 
- 新しいGenSparkスペースでの復元用
- KOL署名承認システムのベース

---

## 🔗 関連リンク

- **GitHub**: https://github.com/natsukoyoko/invoice-creator
- **本番URL**: https://invoice-creator.lifepepper-apps-natsu.workers.dev/
- **最新コミット**: 929315a

---

## 📝 バックアップのベストプラクティス

1. **重要な機能追加後**: 新しいバックアップを作成
2. **大規模な変更前**: 現在の状態をバックアップ
3. **定期的**: 週次または月次でバックアップ
4. **複数保存**: 最新と1つ前のバックアップを保持

---

## 🛡️ 復元時の注意点

- `npm install` を必ず実行
- `npm run build` でビルドを実行
- PM2で起動する場合は `pm2 start ecosystem.config.cjs`
- Git履歴も含まれているため、そのまま開発継続可能

---

**最終更新**: 2024-04-07
**最新バックアップURL**: https://www.genspark.ai/api/files/s/ixnss4wu ✅
