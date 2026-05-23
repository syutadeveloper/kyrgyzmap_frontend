# キルギスマップ 設計

## 1. システム構成図

```text
[iOS/Android Browser/PWA]
        |
        v
[Vite + React + React Router]
        | REST / Cookie or Bearer Token
        v
[Node.js + Express API or Laravel API]
        |
        +-- [PostgreSQL/MySQL]
        +-- [Object Storage: photos]
        +-- [OAuth: Google]
        +-- [Geocoding: Nominatim/Google/2GIS]
```

## 2. ディレクトリ構成

```text
src/
  api/client.ts
  components/FloatingCategoryMenu.tsx
  components/MapView.tsx
  components/SearchPanel.tsx
  components/SpotModal.tsx
  context/AppContext.tsx
  data/mockData.ts
  pages/AuthPages.tsx
  pages/MyPage.tsx
  pages/SearchPage.tsx
  pages/SpotFormPage.tsx
  types.ts
public/
  manifest.json
  sw.js
docs/
  kyrgyzmap-design.md
```

## 3. DB設計

- users: id, name, email, password_hash, google_id, avatar_url, created_at, updated_at
- categories: id, name, icon, color, sort_order, created_at, updated_at
- spots: id, latitude, longitude, name, summary, visibility, creator_id, google_maps_url, two_gis_url, address, created_at, updated_at
- spot_photos: id, spot_id, url, sort_order
- spot_categories: spot_id, category_id
- spot_editors: spot_id, user_id, edited_at
- reviews: id, spot_id, body, rating, visibility, author_id, guest_name, created_at, updated_at

制約: 同一座標キーまたはplace_hashごとに公開スポットは1件、privateはuser/place_hashごとに1件。

## 4. API設計

- POST /register
- POST /login
- POST /logout
- POST /forgot-password
- POST /reset-password
- GET /me
- GET /spots?q=&keyword=&categories=&north=&south=&east=&west=
- GET /spots/:id
- POST /spots
- PUT /spots/:id
- DELETE /spots/:id
- GET /spots/:id/reviews
- POST /spots/:id/reviews
- PUT /reviews/:id
- DELETE /reviews/:id
- GET /categories

## 5. Reactコンポーネント設計

- App: ルーティング定義
- AppProvider: 認証、カテゴリー、スポット、検索条件、PWA install promptを保持
- MapView: Leaflet地図、クラスタリング、現在地、地図タップ追加
- SearchPanel: 名前・カテゴリー・キーワード検索
- FloatingCategoryMenu: 右下の主要カテゴリー導線
- SpotModal: 詳細、編集者、リンク、口コミ表示と投稿
- SpotFormPage: 作成・編集フォーム、逆ジオコーディング、地図リンク自動生成

## 6. 状態管理設計

Context APIで管理。サーバー確定値はREST APIから取得し、現在はモックフォールバックを提供。将来は`VITE_USE_MOCK_API=false`と`VITE_API_BASE_URL`で実APIへ切替。

## 7. ルーティング設計

- / 地図トップ
- /login ログイン
- /register 会員登録
- /forgot-password パスワードリセット
- /spots/new スポット作成
- /spots/:id/edit スポット編集
- /search 検索
- /mypage マイページ

## 8. UIデザイン方針

黒基調、モバイルファースト、片手操作を優先。地図を主画面に置き、検索は上部、カテゴリーFABは右下。privateスポットとprivate口コミはオレンジ枠で強調する。

## 9. PWA設定

`public/manifest.json`でホーム画面追加に対応。`public/sw.js`でApp Shellと取得済みGETレスポンスをキャッシュ。`beforeinstallprompt`をContextで保持し、マイページからインストールを起動する。

## 10. 実装コード

実装コードは上記ディレクトリ構成の各ファイルに配置済み。REST APIクライアントは`src/api/client.ts`、主要画面は`src/pages`、地図と詳細UIは`src/components`に分離している。
