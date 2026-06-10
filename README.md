# pm-tools — 鉑翡斯營運小工具集

每天在用的營運窗口，GitHub Pages 靜態站，自訂網域 `tools.prophecymorocco.com.tw`。
每個子目錄是一個獨立小工具，純前端（localStorage + CSV），出貨動作透過 webhook 觸發後端自動化（現為 Make.com，計畫搬 n8n，見下方已知風險）。

## 工具清單

| 路徑 | 用途 |
|---|---|
| `/`（index.html） | 主出貨工具：品類篩選、購物車、PO 出貨單、客戶管理、CSV 匯入，送單打 Make webhook |
| `/taipei_inventory/` | 台北倉庫存操作（與主工具共用同一條 webhook） |
| `/sanchong_inventory/` | 三重倉庫存操作（獨立 webhook） |
| `/inventory_dashboard/` | 庫存看板，gviz 直讀三張 Google Sheet |
| `/outflow_rate/` | 出貨流速看板，gviz 直讀庫存追蹤 Sheet |
| `/iqe/` | 品檢工具，目前 DEMO 模式（GAS API 未接） |
| `/game/`、`/prompt/` | 內部雜項 |
| `/data/` | 商品、贈品、組合、包材、通路代碼 CSV（無成本價格、無客戶個資） |

## 這是 public repo，紅線

GitHub 免費方案要用 Pages 自訂網域，repo 必須 public（2026-06-11 確認維持）。所以：

- 禁 commit：API key、Supabase 連線字串、密碼、成本價格、客戶個資
- `data/` 只放可公開的商品資訊；customers.csv 是通路代碼不是客戶名單，新增欄位前先想會不會變成個資
- `app_config.json` 的 accessCode 是擋誤觸的軟閘，不是安全機制，別放重要東西在它後面

## 已知風險與計畫（2026-06-11 掃描）

完整報告在 claude-workspace：`Runtime/prophecy-morocco/pm-tools/2026-06-11-pmtools-public-exposure-scan.md`

1. 兩條 Make webhook 網址公開可見且無驗證 → 計畫整批搬 n8n，搬時加驗證（待辦 M1，見 claude-workspace BACKLOG）
2. 三個 Google Sheet ID 公開（gviz 抓法 = Sheet 設了連結可讀）→ 確認 Sheet 內容無敏感資料即可，長期併入 M1
