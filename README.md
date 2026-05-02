# Browser Shooter

ブラウザで直接遊べる、2Dアクションシューティングです。  
`index.html` を開くだけで起動でき、現在は `Standard / Duel / Siege` の3モードを持っています。

## 現在の特徴

- マウス照準射撃
- ローリング、ブースト、エアダッシュ、二段ジャンプ、急降下
- 飛び蹴り、急降下キック、衝撃波
- 武器進化型の `W CORE` システム
- 能力解放型の空中アクション成長
- 敵弾、ヘッドショット、スポーン予告
- `Duel` 用のライバルAI

## 起動方法

`index.html` をブラウザで開いてください。

## 主なファイル

- `index.html`
  - エントリーポイント
- `styles/main.css`
  - 画面全体とメニューUI
- `src/config.js`
  - バランス調整の中心
- `src/platforms.js`
  - ステージ足場
- `src/game.js`
  - ゲーム進行、敵、得点、スポーン管理
- `src/render.js`
  - 描画とHUD
- `src/entities/player.js`
  - プレイヤー移動、戦闘、空中アクション
- `src/entities/enemy.js`
  - 敵AIと敵挙動
- `src/data/weapons.js`
  - 武器進化データ
- `src/data/items.js`
  - アイテム定義

## 最初に触る場所

- ゲームバランス調整
  - `src/config.js`
- プレイヤー挙動
  - `src/entities/player.js`
- 敵挙動
  - `src/entities/enemy.js`
- ステージ構成
  - `src/platforms.js`

## ドキュメント

- 現状の詳細仕様
  - `docs/CURRENT_SPEC.md`
- 今後の拡張設計
  - `docs/EXPANSION_PLAN.md`

## 追加アセットを入れるなら

おすすめ構成:

- `assets/images/`
- `assets/audio/`

今の構成は相対パス前提なので、フォルダごと移動しても壊れにくい作りです。
