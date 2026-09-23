# 代碼集散廳 | Universal Code Exchange Panel

一個專為行動端高頻觸控優化的極簡純白風格、Bento Grid 雙排卡片流兌換碼發行池管理系統。本專案前端 100% 基於 **React 生態系** 驅動，後端完全對接 **Supabase (PostgreSQL)** 進行原子數據增量、智慧型去重過濾與全自動發言黑名單防禦。

---

## 🛠️ 技術晶片堆疊 (Tech Stack)

*   **前端框架**: React 18 (純 JSX 元件化結構)
*   **建置工具**: Vite (極速熱更新編譯)
*   **狀態管理**: Zustand (輕量化全域通訊與快取狀態)
*   **視覺樣式**: Tailwind CSS v4 (純白冷色調、行動端單手防誤觸佈局)
*   **後端雲端**: Supabase / PostgreSQL (OAuth 2.0、RLS 安全安全策略、RPC 預存程序)

---

## 💾 資料庫架構與底層設計 (Database Schema)

本系統的後端依賴 4 張核心實體資料表。請在 Supabase 的 **SQL Editor** 中依次執行以下建置腳本：

### 1. 管理員名單表 (admin_users)
用於判定使用者是否具備全域管理最高特權（如建立大類、永久刪除代碼、執行發言封鎖）。
```sql
CREATE TABLE public.admin_users (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
GRANT ALL PRIVILEGES ON public.admin_users TO service_role;

-- 🛡️ 原子級安全判定函數 (is_admin)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admin_users WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql;
```

### 2. 代碼池分類大類表 (categories)
儲存代碼種類的智慧過濾規則、全域點擊活躍度大數據與外部兌換跳轉前綴網址。
```sql
CREATE TABLE public.categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    show_secret_key BOOLEAN DEFAULT false NOT NULL,
    keep_letters BOOLEAN DEFAULT true NOT NULL,
    keep_numbers BOOLEAN DEFAULT true NOT NULL,
    keep_symbols BOOLEAN DEFAULT false NOT NULL,
    force_uppercase BOOLEAN DEFAULT true NOT NULL,
    keep_chinese BOOLEAN DEFAULT false NOT NULL,   -- 支援中文文字兌換碼
    total_clicks INT DEFAULT 0 NOT NULL,            -- 開發者活躍度流量統計
    web_url TEXT DEFAULT NULL,                      -- 🌐 官方直接兌換外部連結前綴
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.categories TO anon, authenticated;
GRANT ALL PRIVILEGES ON public.categories TO service_role;
CREATE POLICY "允許所有人讀取大類" ON public.categories FOR SELECT USING (true);
CREATE POLICY "僅限管理者變更大類" ON public.categories FOR ALL USING (public.is_admin());
```

### 3. 兌換碼細項資料表 (codes)
儲存實際發行的代碼序列。限制同一個大類下，`code` 欄位必須具備唯一性。
```sql
CREATE TABLE public.codes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    category_id UUID REFERENCES public.categories(id) ON DELETE CASCADE NOT NULL,
    code TEXT NOT NULL,
    secret_key TEXT DEFAULT NULL,
    contributor TEXT DEFAULT '匿名訪客'::text NOT NULL,
    report_count INT DEFAULT 0 NOT NULL,           -- 過期失效累計被檢舉次數
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_category_code UNIQUE (category_id, code) -- 🛡️ 唯一性查重約束
);

ALTER TABLE public.codes ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON public.codes TO anon, authenticated;
GRANT ALL PRIVILEGES ON public.codes TO service_role;
CREATE POLICY "允許所有人讀取代碼" ON public.codes FOR SELECT USING (true);
CREATE POLICY "允許所有人上架新代碼" ON public.codes FOR INSERT WITH CHECK (true);
CREATE POLICY "僅限管理者硬刪除代碼" ON public.codes FOR DELETE USING (public.is_admin());
```

### 4. 大廳獨立留言與發言黑名單系統 (messages & banned_users)
公共交流討論區與對應的黑名單阻斷系統。
```sql
CREATE TABLE public.banned_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,                    -- 被封鎖的 Google 帳號 Email
    banned_by TEXT DEFAULT '系統管理員'::text,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    user_name TEXT NOT NULL,                        -- 僅前台公開 full_name 隱藏 email
    user_email TEXT,                                -- 僅限管理員特權高亮查閱
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.banned_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.banned_users TO anon, authenticated;
GRANT ALL PRIVILEGES ON public.banned_users TO service_role;
GRANT SELECT, INSERT, DELETE ON public.messages TO anon, authenticated;
GRANT ALL PRIVILEGES ON public.messages TO service_role;

CREATE POLICY "開放所有人讀取留言" ON public.messages FOR SELECT USING (true);
CREATE POLICY "僅限管理者處置黑名單" ON public.banned_users FOR ALL USING (public.is_admin());
CREATE POLICY "僅限管理者刪除留言" ON public.messages FOR DELETE USING (public.is_admin());

-- 🛡️ 黑名單寫入阻斷防線策略
CREATE POLICY "僅限已登入且未被封鎖者發布留言" ON public.messages FOR INSERT 
WITH CHECK (
  auth.role() = 'authenticated' 
  AND NOT EXISTS (
    SELECT 1 FROM public.banned_users WHERE email = (auth.jwt() ->> 'email')
  )
);
```

---

## ⚡ 資料庫儲存程序與預存 RPC (Stored Procedures)

系統前端高併發與業務解耦依賴以下四大 RPC 函數，請在 Supabase SQL Editor 中部署：

### A. 大類建立與更新維護 (對齊中文及網址)
```sql
CREATE OR REPLACE FUNCTION public.api_create_category(
  p_name TEXT, p_show_secret BOOLEAN, p_keep_letters BOOLEAN, p_keep_numbers BOOLEAN, p_keep_symbols BOOLEAN, p_force_upper BOOLEAN, p_keep_chinese BOOLEAN, p_web_url TEXT DEFAULT NULL
) RETURNS VOID SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.categories (name, show_secret_key, keep_letters, keep_numbers, keep_symbols, force_uppercase, keep_chinese, web_url)
  VALUES (p_name, p_show_secret, p_keep_letters, p_keep_numbers, p_keep_symbols, p_force_upper, p_keep_chinese, NULLIF(TRIM(p_web_url), ''));
END;
$$ LANGUAGE plpgsql;
```

### B. 智慧財產權與原子批次去重上架 (核心返回寫入筆數)
```sql
CREATE OR REPLACE FUNCTION public.api_insert_codes_bulk(
  p_category_id UUID, p_codes TEXT[], p_secrets TEXT[], p_contributor TEXT
) RETURNS INT SECURITY DEFINER AS $$
DECLARE
  i INT; inserted_count INT := 0; curr_rows INT;
BEGIN
  FOR i IN 1..array_length(p_codes, 1) LOOP
    INSERT INTO public.codes (category_id, code, secret_key, contributor)
    VALUES (p_category_id, p_codes[i], p_secrets[i], COALESCE(NULLIF(p_contributor, ''), '匿名訪客'))
    ON CONFLICT (category_id, code) DO NOTHING;
    GET DIAGNOSTICS curr_rows = ROW_COUNT;
    inserted_count := inserted_count + curr_rows;
  END LOOP;
  RETURN inserted_count;
END;
$$ LANGUAGE plpgsql;
```

### C. 全域流量活躍度分析埋點 (高併發防漏算)
```sql
CREATE OR REPLACE FUNCTION public.api_track_category_click(p_category_id UUID)
RETURNS VOID SECURITY DEFINER AS $$
BEGIN
  UPDATE public.categories SET total_clicks = total_clicks + 1 WHERE id = p_category_id;
END;
$$ LANGUAGE plpgsql;
```

---

## 🔌 外部自動化程式 (如 Python 爬蟲) 接入規範

本資料庫支援外部爬蟲腳本繞過前端 RLS 直接進行無感原子去重發行。

1. **獲取天神權限密鑰**: 進入 Supabase 控制台 ➜ `Project Settings` ➜ `API` ➜ 複製 **`service_role`** 密鑰（絕不可寫入 React 前端）。
2. **Python 快速同步代碼**：
```python
from supabase import create_client

supabase = create_client("https://supabase.co", "你的_service_role_密鑰")

def sync_external_codes():
    res = supabase.rpc("api_insert_codes_bulk", {
        "p_category_id": "類別-UUID-字串",
        "p_codes": ["NEWCODE1", "NEWCODE2", "遊戲中文兌換碼"],
        "p_secrets": [None, None, None],
        "p_contributor": "Python自動化爬蟲"
    }).execute()
    print(f"🤖 雲端去重同步完成，實際新增了 {res.data} 組全新代碼！")

sync_external_codes()
```

---

## 💻 本地 VS Code 開發指南

### 1. 複製並組態變數
請在專案根目錄下手動建立環境變數檔案 **`.env`**，並填入你的 Supabase 公開連線資訊：
```env
VITE_SUPABASE_URL=https://supabase.co
VITE_SUPABASE_ANON_KEY=你的_anon_public_前端公開密鑰
```

### 2. 安裝與啟動
```bash
# 1. 安裝 React 生態系與 Tailwind 所需依賴項
npm install

# 2. 開啟 Vite 本地極速開發伺服器
npm run dev
```
打開瀏覽器至 `http://localhost:5173` 即可開始開發調試。

### 3. 線上部署（Netlify 適配）
本專案已完美適配 Netlify 自動化部署。
* 部署成功後，必須前往 **Supabase 控制台 ➜ `Authentication` ➜ `URL Configuration`**，將你的 Netlify 網址加至 `Redirect URLs` 清單中（格式：`https://netlify.app**`），Google 登入重新導向以及手機帳號選擇器（`prompt: select_account`）才能完美驅動。
