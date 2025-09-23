# Google Apps Scriptセットアップ手順

このフォルダの `webapp.gs` は、Google スプレッドシート（ID: `1T_U4kr51FBsZNq5wnhyAM7g8suxoQRLWNl1zSQYsAbA`）をバックエンドとして利用するための Google Apps Script サンプルです。以下の手順でウェブアプリをデプロイし、サイト側から利用できるようにしてください。

1. **スプレッドシートを準備**  
   指定のスプレッドシートを開き、必要に応じて `Counters` と `Messages` というシートを作成します（スクリプトが自動でヘッダーを設定します）。

2. **Apps Script プロジェクトを作成**  
   スプレッドシートのメニューから「拡張機能 → Apps Script」を開き、新しいプロジェクトを作成します。

3. **コードを貼り付け**  
   既存の `Code.gs` を削除し、このリポジトリの `gas/webapp.gs` の内容を貼り付けて保存します。

4. **ウェブアプリとしてデプロイ**  
   Apps Script の「デプロイ → 新しいデプロイ」で「ウェブアプリ」を選択し、以下のように設定します。
   - 実行するアプリケーション: `webapp.gs` の `doPost`
   - 実行するユーザー: 自分
   - アクセスできるユーザー: 全員（匿名ユーザーを含む）

   デプロイ後に表示される URL（`https://script.google.com/macros/s/.../exec`）を控えてください。

5. **フロントエンドにURLを設定**  
   プロジェクト直下の `gas-config.js` を開き、以下のようにウェブアプリの URL を設定します。

   ```js
   window.__GAS_ENDPOINT__ = 'https://script.google.com/macros/s/xxxxxxxxxxxx/exec';
   ```

6. **動作確認**  
   サイトを開いてアクセスカウンター・拍手ボタン・掲示板の動作を確認します。GASへのリクエストが失敗した場合は、従来通り localStorage での簡易保存に切り替わります。

> 🔐 公開APIになるため、必要であれば Apps Script 側で簡易トークンのチェックや reCAPTCHA などの対策を追加してください。
