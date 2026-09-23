# Redemption Code Hub

一個以行動端為核心的兌換碼分享、發行與管理平台。支援分類瀏覽、批次提交、貢獻者排行、管理者控制台、公開公告區，以及多語系匿名顯示。

## 功能總覽

- 類別化兌換碼管理：建立、編輯、刪除分類
- 批次發行兌換碼：支援文字、符號、中文、大小寫規則
- 兌換碼狀態處理：已領取 / 回報失效 / 快取待提交
- 貢獻者排行榜：依各貢獻者被領取總次數統計
- 公開公告區：所有使用者都能看到公告，管理者可新增與刪除
- 公告為多行文字，會自動顯示發佈時間
- 管理者設定：清除門檻、清除時間點、分類安全設定
- 多語系支援：繁體中文、英文、日文、越南文
- 路由分層與懶載入：首頁、分類頁、聊天室頁各自獨立切分 chunk

## 技術棧

- React 19
- Vite
- React Router 7
- Zustand
- Tailwind CSS
- Supabase / PostgreSQL
- Browser localStorage

## 核心架構

### 前端

- 入口：App 與 Router
- 頁面：
  - HomePage
  - CategoryDetailPage
  - LobbyChatPage
- 功能模組：
  - features/home/CategoryAdminPanel.jsx
  - features/home/CategoryGrid.jsx
  - features/pool/BulkUploadForm.jsx
- 狀態管理：
  - store/categoryStore.js
  - store/codePoolStore.js
  - store/authStore.js
  - store/systemStore.js
  - store/toastStore.js

### 路由與 bundle 切分

目前已採用 lazy-loaded page module，避免整個 app 一次性載入過大邏輯：

- HomePage 以 lazy 載入
- CategoryDetailPage 以 lazy 載入
- LobbyChatPage 以 lazy 載入

這樣可以讓首屏更輕，且每個頁面資源在需要時才載入。

## 主要資料模型

### categories

用來管理兌換碼分類與分類設定。

欄位重點：
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

欄位重點：
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

用來保存公開公告資料，公告內容會顯示在首頁公告區，所有使用者都能看到。

欄位重點：
- id
- content
- created_at
- updated_at

公告規則：
- 內容可為多行文字
- 會自動顯示發佈時間
- 管理者可直接新增、刪除
- 不再使用單一 `announcement_text` 設定值，而是改為多筆公告列表

### system_settings

用來保存管理者的全域設定，例如：
- cleanup_report_threshold
- cleanup_report_time

管理端會將值同步回資料庫，並以資料庫為唯一來源。

## 目前業務規則

### 1. 兌換碼計數

- 主要計數欄位為 claim_count
- 貢獻者榜按照每位提交者的被領取總次數統計
- 不再使用如 like_count 的過時邏輯

### 2. 提交去重

批次提交前會先做 ID 去重，避免同一批次中重複 item 造成計數累加錯誤。

### 3. 匿名提交者

當提交者欄位為空白時，系統會顯示為匿名訪客；會依目前語系解析對應文案，而非寫死中文。

### 4. 備註顯示

- 備註放在提交者上方
- 兌換碼列表中會在代碼內容下方顯示

### 5. 公告機制

- 公告是公開列表，所有使用者都能閱覽
- 管理者在首頁公告區直接輸入內容
- 公告支援多行文字，並自動附帶時間戳記
- 管理者可直接刪除不需要的公告
- 每則公告以資料庫記錄保存，非前端單一文字狀態

### 6. 清理機制

- 預設清理門檻為 10 次
- 系統會保持與資料庫設定同步
- 清理時間點可由管理者在控制中心設定

## 環境變數

建立專案根目錄 `.env`：

```env
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

## 本地開發

```bash
npm install
npm run dev
```

開啟瀏覽器到：

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
```

## 注意事項

- `localStorage` 只作前端偏好與暫存，不應視為安全資料庫
- 管理者功能與 RLS 政策需一起佈署，不能只在前端強制隱藏
- `category_id + code` 仍然是唯一性保護，讓不同類別可重複使用相同兌換碼
- 努力遵循分層設計：UI / Store / Service / Utilities 分離，減少耦合

## 版本狀態

目前專案已完成：
- 兌換碼 claim 計數顯示與統計
- 批次提交去重修正
- 多語系匿名名稱處理
- 公開公告列表與管理者新增/刪除
- 公告時間戳與多行文字支援
- 管理者清除設定同步
- 路由層 lazy-loaded chunk 切分
- README 與功能狀態對齊更新
