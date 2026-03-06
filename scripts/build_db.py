#!/usr/bin/env python3
"""
gyeonghak.com DB 구축 스크립트
================================
data/texts/*.txt → SQLite DB (gyeonghak.db)

사용법:
    python scripts/build_db.py

전제조건:
    pip install beautifulsoup4
"""

import os
import re
import json
import sqlite3
import glob

DATA_DIR = "../data"  # crawl_v2.py가 만든 data 폴더
DB_PATH = "gyeonghak.db"

# ── DB 스키마 생성 ──
conn = sqlite3.connect(DB_PATH)
cur = conn.cursor()

cur.executescript("""
CREATE TABLE IF NOT EXISTS classics (
    code TEXT PRIMARY KEY,
    name_cn TEXT NOT NULL,
    name_kr TEXT NOT NULL,
    color TEXT DEFAULT '#4A3728',
    sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS books (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sj_id TEXT NOT NULL,
    classic_code TEXT NOT NULL,
    name TEXT NOT NULL,
    author TEXT DEFAULT '',
    volume TEXT DEFAULT '',
    years TEXT DEFAULT '',
    total_chars INTEGER DEFAULT 0,
    FOREIGN KEY (classic_code) REFERENCES classics(code)
);

CREATE TABLE IF NOT EXISTS sections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    book_id INTEGER NOT NULL,
    sj_id TEXT NOT NULL,
    pn_id TEXT DEFAULT '',
    pn_name TEXT DEFAULT '',
    gyeongmun TEXT DEFAULT '',
    jusuk TEXT DEFAULT '',
    full_text TEXT DEFAULT '',
    chars INTEGER DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    FOREIGN KEY (book_id) REFERENCES books(id)
);

CREATE VIRTUAL TABLE IF NOT EXISTS sections_fts USING fts5(
    pn_name,
    gyeongmun,
    jusuk,
    full_text,
    content=sections,
    content_rowid=id
);
""")

# ── 경전 기본 데이터 ──
classics_data = [
    ("A", "大學", "대학", "#2E4057", 1),
    ("B", "論語", "논어", "#5C4033", 2),
    ("C", "孟子", "맹자", "#4A3728", 3),
    ("D", "中庸", "중용", "#5B3256", 4),
    ("E", "詩經", "시경", "#6B3A5D", 5),
    ("F", "書經", "서경", "#2D5F4A", 6),
    ("G", "易經", "역경", "#8B5E3C", 7),
    ("H", "禮記", "예기", "#4A4A6B", 8),
    ("I", "春秋", "춘추", "#7A4430", 9),
    ("J", "孝經", "효경", "#3D6B6B", 10),
    ("K", "小學", "소학", "#3E5641", 11),
    ("L", "近思錄", "근사록", "#6B5B3E", 12),
]

cur.executemany(
    "INSERT OR IGNORE INTO classics VALUES (?,?,?,?,?)",
    classics_data
)

# ── 메타데이터 로드 ──
meta_path = os.path.join(DATA_DIR, "metadata_v2.json")
books_meta = {}
if os.path.exists(meta_path):
    with open(meta_path, encoding="utf-8") as f:
        meta = json.load(f)
    for b in meta.get("books", []):
        books_meta[b["sj_id"]] = b

# ── txt 파일 파싱 → DB 입력 ──
txt_files = sorted(glob.glob(os.path.join(DATA_DIR, "texts", "*.txt")))
print(f"텍스트 파일 {len(txt_files)}개 발견")

# sj_id별로 책 그룹핑
book_sections = {}
for fpath in txt_files:
    fname = os.path.basename(fpath)
    # 파일명 패턴: {sj_id}_{idx}_{pn_name}.txt 또는 {sj_id}_direct.txt
    parts = fname.replace(".txt", "").split("_", 2)
    if len(parts) < 2:
        continue
    
    sj_id = parts[0] + "_" + parts[1] if len(parts) > 1 else parts[0]
    # sj_id는 087_01 형태
    m = re.match(r"(\d+_\d+)", fname)
    if not m:
        continue
    sj_id = m.group(1)
    
    if sj_id not in book_sections:
        book_sections[sj_id] = []
    book_sections[sj_id].append(fpath)

print(f"서명(sj_id) {len(book_sections)}종")

# 책 & 섹션 입력
total_sections = 0
for sj_id, fpaths in sorted(book_sections.items()):
    bmeta = books_meta.get(sj_id, {})
    book_name = bmeta.get("name", sj_id)
    
    cur.execute("""
        INSERT OR IGNORE INTO books (sj_id, classic_code, name, author, volume, total_chars)
        VALUES (?, 'G', ?, ?, ?, ?)
    """, (
        sj_id,
        book_name,
        bmeta.get("author", ""),
        bmeta.get("volume", ""),
        bmeta.get("total_chars", 0),
    ))
    book_id = cur.lastrowid or cur.execute("SELECT id FROM books WHERE sj_id=?", (sj_id,)).fetchone()[0]
    
    for i, fpath in enumerate(sorted(fpaths)):
        with open(fpath, encoding="utf-8") as f:
            content = f.read()
        
        # 경문/주석 분리
        gyeongmun = ""
        jusuk = ""
        full_text = content
        
        if "【경문】" in content:
            gm = re.search(r"【경문】\n(.*?)(?=\n\n【|$)", content, re.DOTALL)
            if gm:
                gyeongmun = gm.group(1).strip()
        if "【주석】" in content:
            js = re.search(r"【주석】\n(.*?)(?=\n\n─|$)", content, re.DOTALL)
            if js:
                jusuk = js.group(1).strip()
        
        # 편명 추출 (첫 줄 # 제목에서)
        pn_name = ""
        first_line = content.split("\n")[0]
        if "—" in first_line:
            pn_name = first_line.split("—")[-1].strip()
        elif first_line.startswith("# "):
            pn_name = first_line[2:].strip()
        
        fname = os.path.basename(fpath)
        pn_id_m = re.search(r"_(\d+)_", fname)
        pn_id = pn_id_m.group(1) if pn_id_m else ""
        
        cur.execute("""
            INSERT INTO sections (book_id, sj_id, pn_id, pn_name, gyeongmun, jusuk, full_text, chars, sort_order)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (book_id, sj_id, pn_id, pn_name, gyeongmun, jusuk, full_text, len(content), i))
        total_sections += 1

# FTS 인덱스 빌드
print("FTS 인덱스 구축 중...")
cur.execute("INSERT INTO sections_fts(sections_fts) VALUES('rebuild')")

conn.commit()
conn.close()

print(f"완료: 서명 {len(book_sections)}종, 섹션 {total_sections}개 → {DB_PATH}")
