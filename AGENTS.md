# gitdiagram

- Bunを使う。関連テストはbun run test <対象>。lint・typecheck・buildは変更の影響に応じて選ぶ。
- サーバー検証、決定論的Mermaid生成、クライアントのサニタイズとGitHubリンク制限を維持する。test-onlyパーサーを本番コードへimportしない。
- 非公開リポジトリの保存領域分離、認証情報の非永続化、same-origin制約、課金上限、保存競合の制御を保護する。転送ヘッダー由来IPを認証に使わない。
- 稼働先はVercel。Docker/Railwayを稼働中の待機系とみなさない。
- API・保存・生成処理を変更するときだけ[技術資料](docs/agent-reference.md)の該当仕様を参照する。
