# React + Vite

## 起動方法

このプロジェクトは Client (React) と Server (Node.js) の2つの構成要素で動作します。

### 1. サーバーの準備 (Backend)

まず、バックエンドサーバーを起動します。

1. `server` ディレクトリに移動
   ```bash
   cd ../server
   ```
2. 依存関係のインストール
   ```bash
   npm install
   ```
3. サーバーの起動 (ポート 8080 で起動します)
   ```bash
   node index.js
   ```

### 2. 環境変数の設定 (Client)

クライアントがサーバーと通信するために、環境変数を設定する必要があります。
`client` ディレクトリ直下に `.env` ファイルを作成し、以下の内容を記述してください。

**client/.env**
```env
VITE_API_BASE_URL=http://localhost:8080
```

### 3. クライアントの起動 (Frontend)

1. `client` ディレクトリに移動
   ```bash
   cd client
   ```
   (ルートディレクトリから移動する場合)

2. 依存関係のインストール
   ```bash
   npm install
   ```

3. 開発サーバーの起動
   ```bash
   npm run dev
   ```

ブラウザで `http://localhost:5173` (またはコンソールに表示されるURL) にアクセスしてください。


This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
