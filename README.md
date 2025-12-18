# Oogiri Jam - 起動方法

このアプリを継続的に利用するには、ご自身のターミナル（Terminal.appなど）を使って、以下の手順でサーバーとクライアントを起動してください。

## 準備
必要なもの: Node.js, npm, Google Gemini API Key

`.env` ファイルが `server` フォルダ内にあることを確認してください。

## 起動手順

起動には**2つのターミナルウィンドウ（またはタブ）**が必要です。

### 1. サーバーの起動 (Terminal 1)
バックエンドサーバーを起動します。

```bash
cd "/Users/pastamac/Desktop/Humor Idea Machin/server"
node index.js
```

成功すると `Server listening on port 3000` と表示されます。

### 2. クライアントの起動 (Terminal 2)
フロントエンド（画面）を起動します。

```bash
cd "/Users/pastamac/Desktop/Humor Idea Machin/client"
npm run dev -- --host
```

成功すると `Local: http://localhost:5173` と表示されます。
同じWi-Fi内のスマホからは `Network: http://xxx.xxx.x.xxx:5173` のアドレスでアクセスできます。

## 終了方法
各ターミナルで `Ctrl + C` を押すと停止します。
