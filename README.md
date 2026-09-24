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
- 管理者功能：分類管理、公告管理與待新增審核
- 待新增審核流程：所有使用者可提交類別請求，系統會先進入待審核佇列，管理員再決定同意或拒絕
- 待審核佇列可見性：一般使用者可看到處理序列，但只有管理者可看到同意／拒絕按鈕
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

### 功能模組

- `src/features/home/CategoryGrid.jsx`
- `src/features/pool/BulkUploadForm.jsx`
- `src/components/SeoMeta.jsx`

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
- created_at
- reviewed_at
- reviewed_by
- support_count

這張表會接收所有新增類別請求，讓管理者能在未直接寫入正式資料表前進行審核。

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
- note
- claim_count
- report_count
- created_at

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

### 時間處理

- Supabase 使用 `timestamptz` 與 UTC 保存時間
- 前端顯示時使用裝置本地時區
- 不因語系切換改變時間格式，固定為 `YYYY/MM/DD HH:mm:ss`

## 業務規則

### 1. 兌換碼計數

- 主要計數欄位為 `claim_count`
- 貢獻者排行榜依各提交者的被領取總次數統計
- 不使用過時的 like / vote 類型邏輯

### 2. 提交去重

批次提交前會先做去重，避免重複項目造成計數錯誤。

### 3. 匿名提交者

當提交者欄位空白時，顯示為匿名訪客，並依目前語系定義正確翻譯。

### 4. 新增類別審核流程

- 一般使用者可提出新類別請求，不會直接寫入正式 categories 表
- 提交後資料會進入 `pending_category_requests` 表，狀態預設為 `pending`
- 一般使用者可看見待審核序列，但看不到管理操作按鈕
- 管理者可選擇「同意」或「拒絕」
- 同意時，會先寫入正式 `categories` 表，再將該 request 標記為 `approved`
- 拒絕時，會將該 request 標記為 `rejected`

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
- 一般使用者可提交、管理者可審核的類別流程
- 處理序列預設摺疊與多語系切換支援
- README 更新與文件對齊
