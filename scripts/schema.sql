-- 한국경학자료 통합 DB 스키마
-- GitHub + Render Persistent Disk + SQLite

CREATE TABLE IF NOT EXISTS classics (
    code TEXT PRIMARY KEY,
    name_cn TEXT NOT NULL,
    name_kr TEXT NOT NULL,
    origin TEXT NOT NULL DEFAULT 'korean',
    sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS books (
    sj_id TEXT PRIMARY KEY,
    classic_code TEXT NOT NULL,
    name TEXT NOT NULL,
    volume INTEGER,
    author TEXT DEFAULT '',
    dynasty TEXT DEFAULT '',
    haeje_kr TEXT DEFAULT '',   -- 한글 해제
    haeje_cn TEXT DEFAULT '',   -- 한문 해제
    FOREIGN KEY (classic_code) REFERENCES classics(code)
);

CREATE TABLE IF NOT EXISTS sections (
    pn_id TEXT PRIMARY KEY,
    sj_id TEXT NOT NULL,
    classic_code TEXT NOT NULL,
    chapter_name TEXT NOT NULL,
    chapter_std TEXT,           -- 장별 집성 키
    content TEXT DEFAULT '',
    chars INTEGER DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    FOREIGN KEY (sj_id) REFERENCES books(sj_id)
);

CREATE TABLE IF NOT EXISTS chinese_texts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source TEXT NOT NULL,       -- 'sishu_jizhu', 'zhuzi_yulei' 등
    classic_code TEXT,
    title TEXT NOT NULL,
    chapter_name TEXT,
    chapter_std TEXT,
    content TEXT DEFAULT '',
    chars INTEGER DEFAULT 0
);

-- FTS 검색
CREATE VIRTUAL TABLE IF NOT EXISTS sections_fts USING fts5(
    pn_id UNINDEXED,
    sj_id UNINDEXED,
    classic_code UNINDEXED,
    chapter_name UNINDEXED,
    book_name UNINDEXED,
    content,
    tokenize='unicode61'
);

CREATE VIRTUAL TABLE IF NOT EXISTS chinese_fts USING fts5(
    id UNINDEXED,
    source UNINDEXED,
    classic_code UNINDEXED,
    chapter_name UNINDEXED,
    title UNINDEXED,
    content,
    tokenize='unicode61'
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_sections_classic  ON sections(classic_code);
CREATE INDEX IF NOT EXISTS idx_sections_chapter  ON sections(chapter_std);
CREATE INDEX IF NOT EXISTS idx_sections_sj       ON sections(sj_id);
CREATE INDEX IF NOT EXISTS idx_books_classic     ON books(classic_code);
CREATE INDEX IF NOT EXISTS idx_chinese_classic   ON chinese_texts(classic_code);
CREATE INDEX IF NOT EXISTS idx_chinese_chapter   ON chinese_texts(chapter_std);
