# RedemptionCode

一個以行動端為核心的兌換碼分享、發行與管理平台，支援分類瀏覽、批次上架、表單驗證、貢獻者排行、公告管理、多語系介面，以及效能優先的 SEO 優化。

## 專案定位

這個專案不是單純的兌換碼列表，而是一個可管理、可分類、可搜尋、可收藏的兌換碼集合工具。它同時兼顧：

- 使用者體驗：快速搜尋、簡潔 UI、低延遲操作
- 管理者功能：建立類別、批次發行、清理設定、公告管理
- 多語系支援：繁體中文、英文、日文、越南文等
- SEO：為主要頁面提供可維護的 title / description / OG / canonical
- 效能優先：不為 SEO 犧牲整體 React SPA 的速度與 UX

## 主要功能

- 類別化兌換碼管理：建立、編輯、刪除分類
- 批次發行兌換碼：支援文字、符號、中文、大小寫規則
- 兌換碼狀態處理：已領取、回報失效、待提交、已提交
- 貢獻者排行榜：依提交者被領取總次數統計
- 公告系統：首頁公告區支援多筆公告與時間顯示
- 管理者控制中心：分類設定、清理門檻、清理時間、公告管理
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
- 不再讀取 `system_settings` 的舊值

這個設計避免：

- 舊裝置與新裝置 key 不一致造成覆蓋
- 資料庫 stale 值覆蓋使用者本地偏好
- 不必要的 backend 依賴造成設定狀態不穩定

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

- `src/features/home/CategoryAdminPanel.jsx`
- `src/features/home/CategoryGrid.jsx`
- `src/features/pool/BulkUploadForm.jsx`
- `src/components/SeoMeta.jsx`

### 狀態管理

- `src/store/categoryStore.js`
- `src/store/codePoolStore.js`
- `src/store/authStore.js`
- `src/store/systemStore.js`
- `src/store/toastStore.js`

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

管理分類資料與類別設定。

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
- 會自動附帶發佈時間
- 管理者可以新增與刪除
- 列表式資料保存，避免單一前端狀態問題

### system_settings

保留的全域管理設定，例如：

- cleanup_report_threshold
- cleanup_report_time

但目前「隱藏檢舉門檻」不再依賴這些資料庫值，而是直接使用前端本地設定。

## 業務規則

### 1. 兌換碼計數

- 主要計數欄位為 `claim_count`
- 貢獻者排行榜依各提交者的被領取總次數統計
- 不使用過時的 like / vote 類型邏輯

### 2. 提交去重

批次提交前會先做去重，避免重複項目造成計數錯誤。

### 3. 匿名提交者

當提交者欄位空白時，顯示為匿名訪客，並依目前語系定義正確翻譯。

### 4. 備註顯示

- 備註顯示於提交者資訊上方
- 兌換碼列表中會在代碼內容下方呈現

### 5. 清理機制

- 預設門檻為 10
- 最小值為 1
- 由瀏覽器 `localStorage` 記憶
- 不與資料庫設定做雙向同步

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
- 公告時間戳與多行文字支援
- 本地報告門檻設定與記憶
- SPA 路由與靜態部署 fallback
- 多語系 SEO meta 方案
- README 更新與文件對齊
