# OSM Place + User Place Architecture

## 1. 新アーキテクチャ
Place は永続データ、Marker は表示専用データとして分離する。Place は OSM 由来の Polygon Place と、ユーザー投稿の Point Place を同じ places API で扱う。地図タップ時は Overpass で OSM Place 候補を探し、見つからない場合だけ User Place 追加へ進める。

## 2. Placeモデル解説
places は地理エンティティ本体。source_type で osm / user を分け、place_type で用途を表す。polygon があるものは Polygon Place、ないものは Point Place。

## 3. OSM Place vs User Place
OSM Place は osm_type, osm_id, polygon を持つ。User Place は OSM 情報を持たず、屋台、集合場所、市場内店舗、一時店舗、危険地点、SIM 販売所などを point 中心で表現する。

## 4. ER図
places -> aliases
places -> place_entries
places -> reviews
places -> merge_place_history(source_place_id)
places -> merge_place_history(target_place_id)

## 5. DB設計
places(id, source_type, place_type, osm_type, osm_id, name, lat, lng, polygon, address, google_map_url, 2gis_url, created_by, created_at, updated_at)

aliases(id, place_id, alias, language)

place_entries(id, place_id, user_id, visibility, title, description, created_at, updated_at)

reviews(id, place_id, user_id, visibility, rating, content, created_at)

merge_place_history(id, source_place_id, target_place_id, merged_by, created_at)

## 6. PostGIS設計
places.geom geometry(Geometry, 4326) を追加し、Polygon は ST_GeomFromGeoJSON(polygon)、Point は ST_SetSRID(ST_Point(lng, lat), 4326) を保存する。GIST(geom) と GIN(to_tsvector(...)) を張る。半径検索は ST_DWithin(geom::geography, point::geography, 20)。

## 7. Overpass API統合
対象タグは building, shop, amenity, tourism, office。タップ地点を丸めた cache key で 5 分キャッシュし、20m around query に限定する。viewport 全体をむやみに Overpass へ投げず、ユーザー操作時だけ問い合わせる。

## 8. Turf.js判定
booleanPointInPolygon でタップ位置が Polygon 内か判定し、外側なら pointToPolygonDistance で 20m 以内の候補を出す。候補は inside 優先、距離昇順、building タグ優先。

## 9. API設計
GET /places
GET /places/:id
POST /places
POST /places/import-osm
GET /places/osm/:type/:osm_id
GET /places/search
GET /places/nearby
POST /places/:id/reviews
POST /places/:id/merge

## 10. React設計
PlaceLayer は OSM/User 混在 marker を描画する。BuildingSelector は Overpass + Turf 判定。PlaceCreateModal は User Place 追加。DuplicatePlaceModal は候補確認。将来分割名は PlaceMap, UserPlaceLayer, PlaceBottomSheet, OverpassService に整理する。

## 11. 状態管理
永続データは places, entries, reviews。UI 状態は selectedPlace, highlightedPolygon, createPlaceMode, duplicateCandidates。Context は createUserPlace と findDuplicatePlaces を提供する。

## 12. モバイルUI
Google Maps / 2GIS 風に、地図を主画面、詳細は bottom sheet、検索と追加はフローティング操作にする。User Place はオレンジ系 marker と badge で OSM Place と区別する。

## 13. 重複防止設計
作成前に 20m 半径検索と類似名検索を行う。候補があれば「この場所ですか？」を表示し、既存 Place を開くか、別 Place として追加するかを選ばせる。

## 14. Place Merge設計
User Place が後から OSM 登録された場合、merge_place_history に source/target を残し、entries/reviews/aliases を target に移す。source は soft merged 状態にして直リンク互換を保つ。

## 15. 実装コード
今回のフロント実装は以下に反映。

- src/types.ts: Place source/type と nullable polygon
- src/api/client.ts: POST /places 相当の User Place 作成、nearby duplicate search
- src/context/AppContext.tsx: createUserPlace, findDuplicatePlaces
- src/components/BuildingSelector.tsx: 建物なし tap の追加候補通知
- src/components/MapView.tsx: 「この場所を追加しますか？」導線
- src/components/PlaceCreateModal.tsx: User Place 作成フォーム
- src/components/DuplicatePlaceModal.tsx: 重複候補確認
- src/components/PlaceLayer.tsx: Place と Marker の分離、User Place 表示差別化
