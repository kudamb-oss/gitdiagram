# gitdiagram

- Bunを使う。関連テストはbun run test <対象>。lint・typecheck・buildは変更の影響に応じて選ぶ。
- サーバー検証、決定論的Mermaid生成、クライアントのサニタイズとGitHubリンク制限を維持する。test-onlyパーサーを本番コードへimportしない。
- 非公開リポジトリの保存領域分離、認証情報の非永続化、same-origin制約、課金上限、保存競合の制御を保護する。転送ヘッダー由来IPを認証に使わない。
- 稼働先はVercel。Docker/Railwayを稼働中の待機系とみなさない。
- API・保存・生成処理を変更するときだけ[技術資料](docs/agent-reference.md)の該当仕様を参照する。

## 共通Subagent方式

成果物の作成・修正・レビューでは `C:/Users/kudam/.codex/skills/requirements-to-delivery/SKILL.md` を読み適用する。親が要求と受入条件を管理し、実装担当Subagentが変更・関連テスト、別のSubagentが独立QAを担当する。同時workerは最大2。単純な質問・操作確認は直接回答でよい。既存対象は現状レビューから始め、レビューのみなら変更しない。

この方式は開発担当の分担を統一するものであり、このフォルダ固有のデータ保護・仕様承認・課金・公開・本番・検証・状態の単一writer等の重大制約を保持する。Subagentsを使えない場合は独立QA未実施と報告し、文書設定だけで実動作検証済みと称さない。
