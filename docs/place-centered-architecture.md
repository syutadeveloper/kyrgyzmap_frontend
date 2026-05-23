# 建物中心アーキテクチャ

## 1. 新アーキテクチャ

中心エンティティは `Place` です。地図上の `Marker` は `Place` の表示表現であり、永続データではありません。

```text
Place（OSM由来の建物・施設）
  ├ place_entries（ユーザー投稿）
  ├ reviews（口コミ）
  ├ place_categories（カテゴリー）
  ├ aliases（多言語別名）
  └ edit history（public投稿の編集者情報）
```

地図タップは「緯度経度に投稿」ではなく、Overpass API と Turf.js で建物 polygon を判定し、`osm_type + osm_id` から `Place` を取得または import します。

## 2. ER図

```text
users 1 ── * place_entries * ── 1 places
users 1 ── * reviews       * ── 1 places
places 1 ── * aliases
places * ── * categories via place_categories
place_entries 1 ── * place_entry_editors ── * users
```

## 3. DB設計

`places` は OSM building 本体だけを保持します。投稿本文や口コミは持ちません。

```sql
create table places (
  id bigserial primary key,
  osm_type text not null check (osm_type in ('way', 'relation')),
  osm_id bigint not null,
  name text not null,
  lat double precision not null,
  lng double precision not null,
  polygon geometry(MultiPolygon, 4326) not null,
  polygon_geojson jsonb generated always as (st_asgeojson(polygon)::jsonb) stored,
  address text,
  google_map_url text,
  two_gis_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (osm_type, osm_id)
);

create table place_entries (
  id bigserial primary key,
  place_id bigint not null references places(id) on delete cascade,
  user_id bigint references users(id) on delete set null,
  visibility text not null check (visibility in ('public', 'private')),
  title text not null,
  description text not null,
  photos jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index one_public_entry_per_place
  on place_entries(place_id)
  where visibility = 'public';

create unique index one_private_entry_per_user_per_place
  on place_entries(place_id, user_id)
  where visibility = 'private';

create table reviews (
  id bigserial primary key,
  place_id bigint not null references places(id) on delete cascade,
  user_id bigint references users(id) on delete set null,
  visibility text not null check (visibility in ('public', 'private')),
  rating smallint not null check (rating between 1 and 5),
  content text not null,
  created_at timestamptz not null default now()
);

create table categories (
  id text primary key,
  name text not null,
  icon text not null
);

create table place_categories (
  place_id bigint references places(id) on delete cascade,
  category_id text references categories(id),
  primary key (place_id, category_id)
);

create table aliases (
  id bigserial primary key,
  place_id bigint not null references places(id) on delete cascade,
  alias text not null,
  language text not null
);
```

## 4. OSMデータモデル解説

OSM の `way` と `relation` を建物 ID として扱います。`node` は建物 polygon を安定的に持てないため、Place のグローバル ID には使いません。

```text
osm_type = way | relation
osm_id = OSM object id
unique(osm_type, osm_id)
```

## 5. Overpass API統合

対象タグは `building`, `shop`, `amenity`, `tourism`, `office` です。フロントは `OverpassService` で周辺建物を短時間キャッシュし、タップごとの無駄な再取得を避けます。

フロー:

```text
map click
  -> Overpass around query
  -> osmtogeojson
  -> polygon simplification
  -> Turf point-in-polygon / distance
  -> best candidate
  -> POST /places/import-osm
  -> Place details bottom sheet
```

## 6. PostGIS設計

`places.polygon` は PostGIS `geometry(MultiPolygon, 4326)` 推奨です。検索・表示用に `lat/lng` は centroid として保持し、厳密なタップ判定や境界表示は polygon を使用します。

推奨 index:

```sql
create index places_polygon_gix on places using gist (polygon);
create index places_osm_uidx on places (osm_type, osm_id);
```

## 7. API設計

OpenAPI は `backend/kyrgyzmap_api/docs/openapi.yaml` に反映済みです。

必須 API:

```text
GET  /places
GET  /places/{id}
POST /places/import-osm
GET  /places/osm/{type}/{osm_id}
GET  /places/{id}/entries
POST /places/{id}/entries
PUT  /entries/{id}
GET  /places/{id}/reviews
POST /places/{id}/reviews
GET  /categories
```

## 8. React設計

実装ファイル:

```text
src/components/MapView.tsx
src/components/PlaceLayer.tsx
src/components/PlaceDetailsModal.tsx
src/components/PlaceEntryList.tsx
src/components/ReviewList.tsx
src/components/BuildingSelector.tsx
src/services/OverpassService.ts
src/context/AppContext.tsx
src/api/client.ts
```

`PlaceLayer` は marker/cluster 表示専用、`PlaceDetailsModal` は Place の bottom sheet、`BuildingSelector` は Overpass/Turf 判定専用です。

## 9. 状態管理

永続データ:

```text
places
entries
reviews
```

UI状態:

```text
selectedPlace
highlightedPolygon
visibleMarkers
filters
```

## 10. 検索設計

検索対象:

```text
places.name
aliases.alias
place_entries.description
reviews.content
```

PostgreSQL では `tsvector` を materialized column または search table として作り、alias/entry/review 更新時に再生成するのが保守しやすいです。

## 11. モバイルUI

Google Maps / 2GIS 風に、地図を主画面にして `Floating Search`, `Floating Category Button`, `Bottom Sheet` を配置します。建物選択時は polygon highlight を出し、詳細は下部シートで表示します。private 情報はオレンジ枠と鍵アイコンで表現します。

## 12. 実装コード

主要な実装は以下に反映済みです。

```text
src/types.ts                         Place / PlaceEntry / Review 型
src/api/client.ts                    /places 中心 API + mock
src/context/AppContext.tsx           永続データと UI 状態分離
src/components/MapView.tsx           建物選択 -> import -> 詳細表示
src/components/PlaceLayer.tsx        Marker は UI 表示専用
src/components/PlaceDetailsModal.tsx Bottom Sheet
src/components/PlaceEntryList.tsx    public/private投稿表示
src/components/ReviewList.tsx        private口コミ -> public口コミ順
backend/kyrgyzmap_api/docs/openapi.yaml OpenAPI v0.2.0
```
