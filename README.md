# RedemptionCode

一個以行動端為核心的兌換碼分享、發行與管理平台，支援分類瀏覽、批次上架、表單驗證、貢獻者排行、公告管理、多語系介面，以及效能優先的 SEO 優化。

## 專案定位

這個專案不是單純的兌換碼列表，而是一個可管理、可分類、可搜尋、可收藏的兌換碼集合工具。它同時兼顧：

- 使用者體驗：快速搜尋、簡潔 UI、低延遲操作
- 管理者功能：建立類別、批次發行、公告管理與待新增審核
- 多語系支援：繁體中文、英文、日文、越南文等
- SEO：為主要頁面提供可維護的 title / description / OG / canonical
- 效能優先：不為 SEO 犧牲整體 React SPA 的速度與 UX

## 主要功能

- 類別化兌換碼管理：建立、編輯、刪除分類
- 批次發行兌換碼：支援文字、符號、中文、大小寫規則
- 兌換碼狀態處理：已領取、回報失效、待提交、已提交
- 貢獻者排行榜：依提交者被領取總次數統計
- 全域公告系統：所有頁面的共用 Header 都能顯示公告
- 管理者功能：分類管理、公告管理、待新增審核與集中式黑名單管理
- 待新增審核流程：Google 登入使用者可提交類別請求，系統會先進入待審核佇列，管理員再決定同意或拒絕
- 待新增審核佇列可見性：所有人可看到請求與提交者名稱；管理者可看到 email、封鎖 email，並同意或拒絕申請；封鎖時會自動拒絕該筆申請
- 留言黑名單：資料庫會檢查登入 email，拒絕已封鎖帳號新增留言
- 待新增需求 +1：使用者可對想要的類別按一次 +1，管理員可看到實際支持人數
- 資料庫導向佇列：不再依賴前端 localStorage 保存待審核項目，改為 Supabase 表單保存與管理
- 多語系支援：繁體中文、英文、日文、越南文等語言切換
- SEO 優化：頁面 meta、OG、canonical、語系文案整合
- SPA 路由支援：支援前端路由與靜態部署 fallback

## 效能優先的 SEO 策略

這個專案採用的是輕量型 SEO，而不是重度 SSR。

### 目前實作

- 入口 HTML 會提供基礎 meta：title、description、og:title、og:description、og:image、canonical
- 頁面會使用 `SeoMeta` 元件動態更新 title / description / OG / canonical
- SEO 文案會從多語系字典讀取，避免寫死單一語言
- 不做全站 SSR，不做重量級的預渲染，不用為 SEO 牽動整體 App 架構

### 目的

- 提升搜尋結果與社群分享的可讀性
- 保持頁面在 Vite + React SPA 的低成本、低延遲特性
- 確保 SEO 改進不會破壞使用者體驗

## 使用者設定與本地記憶

### 隱藏檢舉門檻

這個設定與資料庫內容無關，完全是使用者本地偏好。

- key：`report_threshold_v2`
- 預設值：10
- 最小值：1
- 儲存方式：`localStorage`
- 不與資料庫設定同步

這個設計避免：

- 舊裝置與新裝置 key 不一致造成覆蓋
- 資料庫 stale 值覆蓋使用者本地偏好
- 不必要的 backend 依賴造成設定狀態不穩定

### Legacy cleanup

本次已清理的舊版項目：

- 移除未使用的 `src/store/systemStore.js`
- 移除公開讀取黑名單的舊 policy
- 移除未使用的舊版 `api_increment_code_like` 函數
- 移除舊版 `api_insert_codes_bulk(uuid, text[], text[], text)` 重載

目前專案中的資料契約已經收斂到實際使用者仍在呼叫的那一套，不再保留不被引用的歷史版本。

## 技術棧

- React 19
- Vite
- React Router 7
- Zustand
- Tailwind CSS
- Supabase / PostgreSQL
- Browser localStorage

## 核心架構

### 前端頁面

- App
- HomePage
- CategoryDetailPage
- LobbyChatPage
- BlacklistPage

### 功能模組

- `src/features/home/CategoryGrid.jsx`：分類網格與收藏／管理操作
- `src/features/pool/BulkUploadForm.jsx`：批次兌換碼解析、重複檢查與發行
- `src/features/pool/CodeCard.jsx`、`FilterBar.jsx`：兌換碼呈現與篩選
- `src/components/GlobalHeader.jsx`、`Toast.jsx`、`SeoMeta.jsx`：跨頁共用介面

頁面由 `AppRoutes.jsx` 使用 `React.lazy` 載入；資料操作集中在 Zustand stores，格式驗證、瀏覽器 API、快取與公開路由 key 則放在 `src/lib/`。目前共用模組已涵蓋真正重複的功能，不額外抽出只使用一次的通用元件。

### 狀態管理

目前實際在用的 store 只有以下幾個：

- `src/store/categoryStore.js`
- `src/store/codePoolStore.js`
- `src/store/authStore.js`
- `src/store/chatStore.js`
- `src/store/toastStore.js`

已移除舊版 `systemStore.js`，因為專案中已無任何引用，且它與目前的資料契約不再一致。

### 路由與 bundle 切分

目前採用 lazy-loaded page modules：

- HomePage
- CategoryDetailPage
- LobbyChatPage
- BlacklistPage

這樣可以：

- 減少首屏載入量
- 把頁面資源切成更小的 chunk
- 讓使用者在需要時才載入功能

## 資料模型

### categories

管理正式分類資料與類別設定。

重點欄位：

- id
- name
- show_secret_key
- keep_letters
- keep_numbers
- keep_symbols
- keep_chinese
- force_uppercase
- total_clicks
- web_url
- created_at

### pending_category_requests

管理使用者提交的待審核類別請求。

重點欄位：

- id
- name
- web_url
- show_secret_key
- keep_letters
- keep_numbers
- keep_symbols
- force_uppercase
- keep_chinese
- status
- submitted_by
- submitted_by_user_id
- created_at
- support_count

新增分類提案需使用 Google 帳號登入，資料庫 API 也會拒絕匿名或非 Google 帳號。所有人透過 `api_get_pending_category_queue(false)` 取得請求與提交者名稱；管理員透過同一 RPC 的管理員模式取得 email/UUID。UUID 僅供 server 核准時記錄，介面不顯示。核准由 `api_approve_pending_category_request` 在單一交易建立分類並移除請求；拒絕由 `api_delete_pending_category_request` 執行。封鎖 email 後會自動拒絕該筆申請。

這張表會接收新增類別請求，讓管理者能在未直接寫入正式資料表前進行審核。同意時會先建立正式分類，再刪除請求；拒絕時也會刪除請求。刪除由管理員專用 RPC `api_delete_pending_category_request` 執行。

### 待新增類別支持快取

使用瀏覽器 `localStorage` 保存使用者對待新增類別的 +1 狀態。

- 每台裝置對同一筆 request 只會在本地快取允許按一次
- `support_count` 是資料庫唯一保存的支持人數欄位
- 不建立使用者投票明細表，降低資料庫欄位與寫入成本

### codes

實際兌換碼資料。

重點欄位：

- id
- category_id
- code
- secret_key
- contributor
- publisher_id
- note
- claim_count
- report_count
- created_at

`publisher_id` 由 bulk insert RPC 依 `auth.uid()` 寫入。管理者可在兌換碼下方查看提交者 UUID，並將其加入 `banned_users.user_id`；bulk insert RPC 會拒絕已封鎖的提交者。`banned_users.email` 用於封鎖留言與新類別提案，email 比對會忽略大小寫及前後空白。匿名發佈需在 Supabase Auth 啟用 Anonymous Sign-Ins；既有兌換碼沒有可信的提交者 UUID，無法回溯補齊。

### announcements

公開公告列表。

重點欄位：

- id
- content
- created_at
- updated_at

公告規則：

- 支援多行文字
- 公告會顯示於所有頁面的全域 Header
- 沒有公告時，一般使用者不顯示公告區
- 沒有公告時，管理者仍可使用輸入區建立第一則公告
- 時間以資料庫 UTC 保存，前端轉換為使用者本地時區
- 所有前端顯示時間統一為 `YYYY/MM/DD HH:mm:ss`
- 管理者可以新增與刪除
- 列表式資料保存，避免單一前端狀態問題

### banned_users 與 messages

- `banned_users.email` 用於封鎖大廳留言與新類別提案；`banned_users.user_id` 用於封鎖兌換碼提交者
- `enforce_lobby_message_sender_ban` trigger 會以登入者 JWT email（忽略大小寫及前後空白）檢查黑名單
- trigger 會以登入者 email 覆寫留言的 `user_email`，避免客戶端偽造 email 繞過封鎖
- 黑名單管理介面位於 `/blacklist`，管理者可集中檢視及解除 email/UUID 封鎖

### Schema 欄位稽核

2026-10-02 透過 Supabase `public` schema 盤點到以下 7 張資料表。欄位清單是線上資料庫當時的快照；線上 Supabase 為準。

| 資料表 | 欄位 |
| --- | --- |
| `admin_users` | `id`, `email`, `created_at` |
| `announcements` | `id`, `content`, `created_at`, `updated_at` |
| `banned_users` | `id`, `email`, `banned_by`, `created_at`, `user_id`, `banned_category_id` |
| `categories` | `id`, `name`, `show_secret_key`, `keep_letters`, `keep_numbers`, `keep_symbols`, `force_uppercase`, `created_at`, `total_clicks`, `keep_chinese`, `web_url`, `slug`, `public_route_key`, `is_active`, `updated_at` |
| `codes` | `id`, `category_id`, `code`, `secret_key`, `contributor`, `report_count`, `created_at`, `is_active`, `updated_at`, `claim_count`, `note`, `publisher_id` |
| `messages` | `id`, `user_id`, `user_name`, `content`, `created_at`, `user_email`, `updated_at` |
| `pending_category_requests` | `id`, `name`, `web_url`, `show_secret_key`, `keep_letters`, `keep_numbers`, `keep_symbols`, `force_uppercase`, `keep_chinese`, `status`, `submitted_by`, `created_at`, `support_count`, `submitted_by_user_id` |

目前 7 張 public table 均啟用 RLS。`categories`、`codes`、`messages` 有公開讀取 policy；其餘資料表的存取依線上 policies 與 RPC 權限控管。各政策及函式權限應以 Supabase Dashboard 的 live schema 為準。

欄位型別方面，目前沒有證據支持將 `text` 改成較短的 `varchar`：PostgreSQL 對相同內容的儲存與索引效能沒有可證明的收益。狀態欄位可在未來先建立明確狀態集合與既有資料檢查，再考慮 `CHECK` constraint 或 enum，不在本次直接改型別。

### 時間處理

- Supabase 使用 `timestamptz` 與 UTC 保存時間
- 前端顯示時使用裝置本地時區
- 日期時間格式依目前選擇的語系呈現

## 業務規則

### 1. 兌換碼計數

- 主要計數欄位為 `claim_count`
- 貢獻者排行榜依各提交者的被領取總次數統計
- 不使用過時的 like / vote 類型邏輯

### 2. 提交去重

批次提交由單一 set-based RPC 寫入；`codes(category_id, code)` 唯一索引與 `ON CONFLICT DO NOTHING` 負責競速安全去重，RPC 回傳實際新增數。前端不再先查一次資料庫，避免額外往返與查後寫競速。

### 3. 匿名提交者

當提交者欄位空白時，顯示為匿名訪客，並依目前語系定義正確翻譯。

### 4. 新增類別審核流程

- Google 登入使用者可提出新類別請求，不會直接寫入正式 categories 表
- 提交後資料會進入 `pending_category_requests` 表，狀態預設為 `pending`
- 所有人可看見待審核序列與提交者名稱；管理者額外看到 email 與審核操作
- 管理者可選擇「同意」或「拒絕」
- 同意時，先寫入正式 `categories` 表，再由管理員 RPC 刪除該 pending request
- 拒絕時，由管理員 RPC 刪除該 pending request
- 提交者名稱公開顯示；email 僅由管理員專用 RPC 回傳，UUID 不顯示於管理介面

### 5. 備註顯示

- 備註顯示於提交者資訊上方
- 兌換碼列表中會在代碼內容下方呈現

### 6. 路由與部署

- SPA 使用前端路由
- 靜態部署時需要 fallback redirect
- Netlify 可使用 `public/_redirects`，內容如下：

```text
/* /index.html 200
```

## 環境變數

建立 `.env`：

```env
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

## Supabase RPC 現況

[`supabase/migrations/current_rpc.sql`](supabase/migrations/current_rpc.sql) 是 2026-10-02 從線上 Supabase 唯讀匯出的 16 個現況 RPC 定義，供本地快速查閱；不保留歷史 migration，也不是可部署 migration。不要用 `supabase db push` 套用此檔。線上資料庫才是權限、函式與 schema 的唯一準據；線上變更後需重新匯出此快照。

目前 anon role 有 EXECUTE 權限的 RPC 包含 `api_ban_code_publisher`、`api_delete_category`、`api_get_pending_category_queue`、`api_support_pending_category_request`、`api_track_category_click`、`api_update_category`、`batch_claim_codes`、`batch_report_codes`、`is_admin` 與 `normalize_public_key`。其中 `api_ban_code_publisher` 及管理員模式的待審 queue 在函式本體有管理員檢查；其他 mutation 的權限風險見下方安全稽核。

## 安全性稽核

2026-10-02 使用 Supabase anon key 對 PostgREST 執行唯讀 `HEAD` 欄位探測，只檢查 HTTP 狀態與 `Content-Range`，沒有下載或查看任何欄位值。列數是稽核當下快照，資料量可能變動：

- `codes.secret_key`：匿名請求可查詢，回報 226 筆資料。一般兌換碼查詢也包含此欄位；畫面依 `show_secret_key` 隱藏欄位不是存取控制。若欄位存有不應公開的金鑰，需由資料庫 view/RPC 或欄位權限限制回傳範圍。
- `messages.user_email`：匿名請求可查詢，回報 3 筆留言。公開留言應改用不含 email 的 view/RPC；管理員需要 email 時另走受資料庫權限保護的查詢。
- `banned_users.email`：匿名查詢回報 0 筆；live table grant 檢查顯示 anon/authenticated 沒有整表 `SELECT`，目前由 admin-only RLS policies 保護。

線上檢查確認 7 張資料表均啟用 RLS，但部分 `SECURITY DEFINER` RPC 的 `EXECUTE` 權限過寬，函式本身也沒有做角色檢查。這些函式以 owner 權限執行，不能依賴 table RLS 保護：

- **嚴重：**`api_delete_category(uuid)` 對 anon 開放，函式本體直接刪除分類，沒有 `auth.uid()` 或 `is_admin()` 檢查。
- **嚴重：**`api_update_category(...)` 對 anon 開放，函式本體直接更新分類，沒有 `auth.uid()` 或 `is_admin()` 檢查。
- **資料完整性風險：**`batch_claim_codes(uuid[])`、`batch_report_codes(uuid[])`、`api_support_pending_category_request(uuid)` 與 `api_track_category_click(uuid)` 對 anon 開放，且沒有身分、速率或去重檢查，可被直接呼叫灌高計數。

上述權限來自線上 Supabase 的唯讀 catalog 查詢；本次沒有修改線上資料庫。應立即在 Dashboard 修正函式本體與 `EXECUTE` grants，撤除 anon 對管理性 RPC 的權限，再重新以 anon role 驗證。前端 `isAdmin` 與路由只控制介面，不能取代資料庫授權。

其他安全注意事項：

- `api_insert_codes_bulk` 應在資料庫端限制每批筆數及各欄位長度，並搭配使用者配額或速率限制；不能只依賴前端輸入上限。
- 待審分類 +1 的去重狀態保存在 `localStorage`，可被清除或繞過；支持數不應作為防濫用或具權益性的投票依據。
- `.env` 目前受 Git 追蹤。已確認使用的變數是前端 Supabase URL 與 anon key（兩者會公開）；不要將 `service_role` 或其他私密憑證放入 `VITE_*` 變數或前端 bundle，並建議改以 `.env.example` 記錄範本。
- `npm audit`（含開發相依套件）於稽核當日回報 0 個已知漏洞。Repository 未設定 CSP、HSTS 或 `frame-ancestors` 等回應標頭；仍需確認正式部署平台是否提供這些設定。

本稽核只讀取函式定義、ACL、RLS policy 與 `HEAD` 回應的列數，未讀取任何金鑰或 email 值。線上修正後應重新執行 anon 欄位探測與角色別 RLS 測試，並更新 `current_rpc.sql` 快照。

## 本地開發

```bash
npm install
npm run dev
```

開啟瀏覽器：

```text
http://localhost:5173
```

## 生產建置

```bash
npm run build
```

## 專案結構

```text
src/
  App.css
  App.jsx
  index.css
  main.jsx
  assets/
  components/
  features/
    home/
    pool/
  i18n/
  lib/
  pages/
  router/
  services/
  store/
public/
  _redirects
  og-image.svg
```

## 注意事項

- `localStorage` 只用於使用者本地偏好與前端快取，不作為安全資料庫
- 檢舉門檻目前為本地設定：`report_threshold_v2`，預設 10、最小 1
- 管理者功能與 RLS 政策需同時佈署，不能只在前端限制 UI
- `category_id + code` 作為保護條件，讓不同類別可重複使用相同兌換碼
- 專案保持分層設計：UI / Store / Service / Utilities 分離
- SEO 優化保持輕量，不做會拖慢體驗的重型 SSR

## 目前版本狀態

已完成：

- 兌換碼 claim 計數與統計顯示
- 批次提交去重修正
- 多語系匿名名稱處理
- 公告列表與管理者新增/刪除
- 全域公告顯示與管理者例外輸入
- 公告固定時間格式與本地時區轉換
- 本地報告門檻設定與記憶
- SPA 路由與靜態部署 fallback
- 多語系 SEO meta 方案
- 以 Supabase 管理待審核類別請求
- Google 登入提案、所有人可見提交者名稱、管理員可見 email 並可封鎖後自動拒絕的類別審核流程
- 管理者待審序列預設展開，並可手動摺疊
- 全域黑名單管理頁與資料庫端 email 留言／提案封鎖
- 分類詳情以資料庫篩選兌換碼、最小欄位投影與 publisher 聚合查詢
- 查詢熱點索引與完整資料庫欄位盤點
- README 更新與文件對齊
