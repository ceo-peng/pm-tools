# pm-tools — Claude 工作守則

<!-- 標準頭 v3（canonical：ceo-peng/claude-workspace docs/templates/CLAUDE-header-v3.md） -->
## 使用者與文風（標準頭 v3；完整脈絡在 ceo-peng/claude-workspace 的 global/）
- 使用者 James Peng，非工程背景的 business builder。回覆用繁體中文、精煉、決策導向，技術事講白話
- 反 AI 文字感鐵則：禁破折號與全形引號；禁用詞 賦能/打造/深入/聚焦/旨在/致力於/助力/實現/提升/強大/卓越/優質/全面/完善；禁套語 在當今/隨著…的發展/首先…其次…最後/綜上所述；段首不重述問題、段尾不自我總結、條列不加裝飾 emoji
- 個人脈絡層 canonical＝claude-workspace 的 global/（GitHub 為真相）；跨專案進度（HANDOFF / BACKLOG / 記憶）也在該 repo，不在這個 repo；學到的教訓寫一小檔進該 repo `global/inbox/`
- 模型與檔位照 claude-workspace `.claude/rules/model-effort-first.md`；出貨照 `.claude/rules/ship-and-report.md`（自行 squash merge＋定型報告）
- 日期時間一律台北時區（Asia/Taipei），顯示格式 `2026-06-08 18:00`；產出物更新戳記 `最後更新 YYYY/MM/DD HH:MM`
- 收工前必 commit + push，寫清楚進度與下一步

## 這個 repo 的規矩（public repo，紅線最多）
- **這是 public repo**（GitHub Pages 自訂網域 tools.prophecymorocco.com.tw 要求免費方案 public）：禁 commit API key、Supabase 連線字串、密碼、成本價格、客戶個資
- **推 main 即上公開站**，同事每天用它出貨；改動前想「畫面壞了同事出不了貨」，重要改動走 PR
- `data/*.csv` 只放可公開商品資訊；customers.csv 是通路代碼不是客戶名單，新增欄位前先想會不會變成個資
- 出貨動作打 Make.com webhook（計畫搬 n8n）；`app_config.json` 的 accessCode 是擋誤觸的軟閘不是安全機制
