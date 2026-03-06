#!/usr/bin/env python3
"""
한국경학자료시스템 — 전체 경전 크롤러
======================================
crawl_v2.py(역경 전용)를 12경전 전체로 확장.
역경은 이미 완료됐으므로 SKIP_DONE=True 시 건너뜀.

사용법:
    python crawl_all.py              # 전체
    python crawl_all.py --only A B   # 특정 경전만
"""

import os, re, json, time, logging, subprocess, argparse
from bs4 import BeautifulSoup

BASE_URL   = "http://koco.skku.edu"
OUTPUT_DIR = "data"
DELAY      = 0.4   # 역경보다 조금 더 보수적

# 12경전 정의 (code, kyung, mi01번호, 이름)
CLASSICS = [
    ("A", "A", 1,  "대학(大學)"),
    ("B", "B", 2,  "논어(論語)"),
    ("C", "C", 3,  "맹자(孟子)"),
    ("D", "D", 4,  "중용(中庸)"),
    ("E", "E", 5,  "시경(詩經)"),
    ("F", "F", 6,  "서경(書經)"),
    ("G", "G", 7,  "역경(易經)"),   # 완료
    ("H", "H", 8,  "예기(禮記)"),
    ("I", "I", 9,  "춘추(春秋)"),
    ("J", "J", 10, "효경(孝經)"),
    ("K", "K", 11, "소학(小學)"),
    ("L", "L", 12, "근사록(近思錄)"),
]

# 이미 완료된 경전 (역경)
DONE_CODES = {"G"}

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
    handlers=[
        logging.FileHandler("crawl_all.log", encoding="utf-8"),
        logging.StreamHandler(),
    ],
)
log = logging.getLogger()

for d in ["texts", "haeje", "pdfs"]:
    os.makedirs(os.path.join(OUTPUT_DIR, d), exist_ok=True)

stats_total = {"pages": 0, "texts": 0, "chars": 0, "errors": 0}


def curl_get(url):
    try:
        result = subprocess.run(
            ["curl", "-s", "-L", "--max-time", "30", url],
            capture_output=True, timeout=35,
        )
        stats_total["pages"] += 1
        time.sleep(DELAY)
        return result.stdout.decode("utf-8", errors="replace")
    except Exception as e:
        log.warning(f"curl 실패: {url} — {e}")
        stats_total["errors"] += 1
        return ""


def extract_pn_ids(html):
    results = []
    pattern = r"go_pyun\('([^']*?)'\s*,\s*'(\d+)'\s*,\s*'([^']*?)'\)"
    for m in re.finditer(pattern, html):
        results.append({"pn_name": m.group(1), "pn_id": m.group(2), "xml": m.group(3)})
    return results


def extract_sj_ids(toc_html, kyung):
    """목차 페이지에서 sj_id 추출. goPage 패턴 사용."""
    pattern = rf"goPage\('{kyung}','(\d+)','([^']+)'\)"
    matches = re.findall(pattern, toc_html)
    soup = BeautifulSoup(toc_html, "lxml")
    
    books = []
    seen = set()
    
    for vol, sj_id in matches:
        if sj_id in seen:
            continue
        seen.add(sj_id)
        # 링크 텍스트 찾기
        name = sj_id
        for a in soup.find_all("a"):
            onclick = str(a.get("onclick", "")) + str(a.get("href", ""))
            if sj_id in onclick:
                t = a.get_text(strip=True)
                if t:
                    name = t
                    break
        books.append({"sj_id": sj_id, "name": name, "volume": int(vol)})
    
    # 패턴 없을 때 대안: href에서 sj_id 추출
    if not books:
        for a in soup.find_all("a", href=True):
            href = a["href"]
            m = re.search(r"sj_id=(\d+_\d+)", href)
            if m:
                sj_id = m.group(1)
                if sj_id not in seen:
                    seen.add(sj_id)
                    books.append({"sj_id": sj_id, "name": a.get_text(strip=True) or sj_id, "volume": 0})
    
    return books


def extract_text_from_pyun(html):
    if not html or len(html) < 100:
        return "", "", {}
    soup = BeautifulSoup(html, "lxml")
    meta = {}
    for field in ["sj_id", "pn_id", "pn_nm", "seomyung", "au", "fr_bk"]:
        inp = soup.find("input", {"name": field})
        if inp:
            meta[field] = inp.get("value", "")
    
    org_input = soup.find("input", {"name": "org_conts"})
    full_text = org_input.get("value", "").strip() if org_input else ""
    
    gyeongmun, jusuk = [], []
    for font in soup.find_all("font"):
        color = font.get("color", "").upper().replace("#", "")
        text = font.get_text(strip=True)
        if not text:
            continue
        if color == "9A764A":
            gyeongmun.append(text)
        elif color == "3D3D3D":
            jusuk.append(text)
    
    structured = ""
    if gyeongmun or jusuk:
        parts = []
        if gyeongmun:
            parts.append("【경문】\n" + "\n".join(gyeongmun))
        if jusuk:
            parts.append("【주석】\n" + "\n".join(jusuk))
        structured = "\n\n".join(parts)
    
    if not full_text and not structured:
        for td in soup.find_all("td"):
            t = td.get_text(strip=True)
            if len(t) > 200:
                full_text = t
                break
    
    return full_text, structured, meta


def crawl_classic(code, kyung, mi_num, label, skip_done=True):
    if skip_done and code in DONE_CODES:
        log.info(f"[{code}] {label} — 이미 완료, 건너뜀")
        return {}
    
    log.info("=" * 60)
    log.info(f"[{code}] {label} 크롤링 시작")
    log.info("=" * 60)
    
    stats = {"texts": 0, "chars": 0, "errors": 0, "empty": 0}
    
    # 1단계: 목차
    toc_html = curl_get(f"{BASE_URL}/JPN/content/mi01_{mi_num}.jsp")
    if not toc_html:
        log.error(f"[{code}] 목차 접근 실패")
        return stats
    
    books = extract_sj_ids(toc_html, kyung)
    log.info(f"[{code}] 서명 {len(books)}종 발견")
    
    if not books:
        # 직접 URL 패턴 시도
        log.warning(f"[{code}] goPage 패턴 없음 — kyung 코드 확인 필요")
        # 목차 HTML 일부 출력해서 확인
        log.info(f"목차 HTML 앞 500자: {toc_html[:500]}")
        return stats
    
    all_books_meta = []
    
    # 2단계: 서명별 수집
    for bi, book in enumerate(books):
        sj_id = book["sj_id"]
        log.info(f"  [{bi+1}/{len(books)}] {book['name']} ({sj_id})")
        
        pyun_html = curl_get(f"{BASE_URL}/PyunList.jsp?sj_id={sj_id}&kyung={kyung}&nav_kind=1")
        pn_list = extract_pn_ids(pyun_html) if pyun_html else []
        
        if not pn_list:
            stats["empty"] += 1
            # 직접 접근
            direct = curl_get(f"{BASE_URL}/Dir/Dir_PyunContents.jsp?pn_id=&sj_id={sj_id}&nav_kind=1")
            if direct and len(direct) > 500:
                full_text, structured, meta = extract_text_from_pyun(direct)
                text = structured or full_text
                if text and len(text) > 30:
                    fname = f"{sj_id}_direct.txt"
                    fpath = os.path.join(OUTPUT_DIR, "texts", fname)
                    with open(fpath, "w", encoding="utf-8") as f:
                        f.write(f"# {book['name']}\n\n{text}")
                    stats["texts"] += 1
                    stats["chars"] += len(text)
            continue
        
        log.info(f"    편 {len(pn_list)}개")
        book_meta = {**book, "classic": code, "sections": [], "total_chars": 0}
        
        for pi, pn in enumerate(pn_list):
            pn_id, pn_name = pn["pn_id"], pn["pn_name"]
            content_html = curl_get(
                f"{BASE_URL}/Dir/Dir_PyunContents.jsp?pn_id={pn_id}&sj_id={sj_id}&nav_kind=1"
            )
            full_text, structured, meta = extract_text_from_pyun(content_html)
            text = structured or full_text
            
            if text and len(text) > 30:
                safe = re.sub(r'[\\/:*?"<>|\s]', '_', pn_name)[:30]
                fname = f"{sj_id}_{pi:03d}_{safe}.txt"
                fpath = os.path.join(OUTPUT_DIR, "texts", fname)
                
                header = f"# {book['name']} — {pn_name}"
                if meta.get("au"):
                    header += f"\n# 저자: {meta['au']}"
                
                with open(fpath, "w", encoding="utf-8") as f:
                    f.write(header + "\n\n")
                    f.write(structured if structured else "")
                    if full_text and structured:
                        f.write(f"\n\n{'─'*30}\n\n【전문】\n{full_text}")
                    elif full_text:
                        f.write(full_text)
                
                stats["texts"] += 1
                stats["chars"] += len(text)
                book_meta["total_chars"] += len(text)
                book_meta["sections"].append({"pn_id": pn_id, "name": pn_name, "chars": len(text), "file": fname})
                log.info(f"      [{pi+1}/{len(pn_list)}] {pn_name} ({len(text)}자)")
        
        all_books_meta.append(book_meta)
    
    # 메타데이터 저장
    meta_path = os.path.join(OUTPUT_DIR, f"metadata_{code}.json")
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump({
            "경전": label,
            "code": code,
            "수집일": time.strftime("%Y-%m-%d %H:%M"),
            "서명수": len(books),
            "통계": stats,
            "books": [b for b in all_books_meta if b.get("total_chars", 0) > 0],
        }, f, ensure_ascii=False, indent=2)
    
    log.info(f"[{code}] {label} 완료: 텍스트 {stats['texts']}개, {stats['chars']:,}자")
    stats_total["texts"] += stats["texts"]
    stats_total["chars"] += stats["chars"]
    return stats


# ── 실행 ──
parser = argparse.ArgumentParser()
parser.add_argument("--only", nargs="*", help="특정 경전 코드만 (예: A B C)")
parser.add_argument("--include-done", action="store_true", help="완료된 역경도 재수집")
args = parser.parse_args()

target_codes = set(args.only) if args.only else None
skip_done = not args.include_done

for code, kyung, mi_num, label in CLASSICS:
    if target_codes and code not in target_codes:
        continue
    crawl_classic(code, kyung, mi_num, label, skip_done=skip_done)

log.info("=" * 60)
log.info(f"전체 완료: 텍스트 {stats_total['texts']}개, {stats_total['chars']:,}자")
log.info("=" * 60)
