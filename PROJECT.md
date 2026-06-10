# pm-tools 運營文件

最後 review：2026-06-11（雲端 session，配合公開內容掃描撰寫）
讀者：決策者與新進同事。工具技術細節看各子目錄原始碼，這份講全貌與真相歸屬。

## 這是什麼、解決什麼問題

鉑翡斯每天在用的營運小工具集，掛在 `tools.prophecymorocco.com.tw`（GitHub Pages 靜態站）。它是出貨與庫存操作的窗口：同事在網頁上選商品、組出貨單、按送出，後端自動化（目前 Make.com）接手後續流程。價值在「不用開 Excel、不用記格式，照畫面操作就不會錯」，是營運日常的第一線介面。

## 現在怎麼運作（主要 workflow）

- **出貨**：主頁選品類、加購物車、填客戶、生成 PO 出貨單 → 送出打 webhook → Make.com 接手。台北倉、三重倉各有自己的操作頁（台北與主工具共用一條 webhook，三重獨立一條）。
- **看庫存**：庫存看板與出貨流速兩頁，直接讀三張 Google Sheet 顯示，不經後端。
- **資料維護**：商品、贈品、組合、包材清單放 repo 的 `data/*.csv`，改檔案 commit 即更新。

## 系統連接

```
同事瀏覽器（GitHub Pages 靜態頁，資料暫存 localStorage）
  ├─ 送單 → Make.com webhook ×2 → 後續流程（scenario 內容未盤點）
  └─ 看板 → Google Sheet ×3（gviz 直讀，Sheet 設連結可檢視）
商品 CSV → 這個 repo 的 data/，commit 即生效
```

## 資料從哪來、真相在哪

- **商品與活動組合的真相**：repo 內 `data/*.csv`（無成本價格、無客戶個資，customers.csv 是通路代碼）。
- **庫存數字的真相**：三張 Google Sheet（看板只是顯示層）。
- **出貨後的流向**：進 Make.com scenario 之後做什麼，目前沒有文件、也不在 AUTOMATION-REGISTRY 登錄，是已知的治理缺口，搬 n8n 時補盤。
- **localStorage 只是暫存**：購物車與畫面狀態存使用者瀏覽器，換機即失，不是任何東西的真相。

## 狀態盤點

| 工具 | 狀態 |
|---|---|
| 主出貨工具（/） | 使用中 |
| 台北倉、三重倉操作頁 | 使用中 |
| 庫存看板、出貨流速看板 | 使用中 |
| iqe 品檢工具 | 實驗（DEMO 模式，GAS API 未接） |
| game、prompt | 雜項，非營運必要 |

## 風險

1. **webhook 公開且無驗證**（public repo，網址看原始碼就有）：任何人可送假出貨單。處置已排定：Make 整批搬 n8n 時加驗證（claude-workspace BACKLOG 的 M1）。
2. **庫存 Sheet ID 公開**：gviz 抓法代表 Sheet 連結可讀，庫存與流速數字等於公開。待人工確認 Sheet 內無成本與個資（M2）。
3. **Make scenario 是黑箱**：出貨後的自動化沒文件沒備份，Make 帳號出事即斷線，搬 n8n 後納入 n8n repo 的鏡像體系即解。
4. **repo 是 public**（免費方案 Pages 自訂網域的代價）：禁 commit 金鑰、成本、個資，紅線在 README。

完整掃描報告：claude-workspace `Runtime/prophecy-morocco/pm-tools/2026-06-11-pmtools-public-exposure-scan.md`

## 等人決策的事

- M1（Make 搬 n8n）的動工時程。超過一個月才動的話，先在 Make scenario 加密語驗證頂著。

## 下一步

M1 搬遷（含 webhook 補閘、scenario 盤點入文件、AUTOMATION-REGISTRY 補登）→ M2 Sheet 內容確認。跨專案待辦的真相在 `ceo-peng/claude-workspace` 的 BACKLOG.md。
