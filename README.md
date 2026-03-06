# gyeonghak.com — 배포 가이드

## 파일 구조

```
gyeonghak/
├── pages/
│   ├── index.js          # 메인 (경전 그리드)
│   ├── classic/[code].js # 경전별 서명 목록
│   ├── book/[id].js      # 원문 뷰어 (경문+주석)
│   ├── search.js         # 검색 결과
│   ├── ai.js             # AI 경학 연구 보조
│   └── api/
│       ├── search.js     # 검색 API (FTS)
│       └── ai.js         # Claude API 연결
├── lib/
│   └── db.js             # SQLite 연결
├── scripts/
│   ├── build_db.py       # txt → SQLite DB 구축
│   └── crawl_all.py      # 12경전 전체 크롤러
└── .env.local.example    # 환경변수 예시
```

## 배포 순서

### 1단계: DB 구축 (로컬에서)
```bash
cd gyeonghak
# data/ 폴더를 크롤링 data 폴더로 심링크 또는 복사
pip install beautifulsoup4
python scripts/build_db.py
# → gyeonghak.db 생성됨
```

### 2단계: 로컬 테스트
```bash
npm install
cp .env.local.example .env.local
# .env.local에 실제 ANTHROPIC_API_KEY 입력
npm run dev
# http://localhost:3000 에서 확인
```

### 3단계: Vercel 배포
```bash
# GitHub에 올리기 (gyeonghak.db는 .gitignore로 제외됨)
git init
git add .
git commit -m "initial"
git remote add origin https://github.com/본인계정/gyeonghak.git
git push -u origin main
```

Vercel 대시보드에서:
1. "New Project" → GitHub 연결
2. Environment Variables에 `ANTHROPIC_API_KEY` 추가
3. Deploy

### 4단계: DNS 연결 (Namecheap)
Vercel에서 제공하는 CNAME 값을 Namecheap DNS에 추가.
자세한 방법: Vercel 대시보드 → Settings → Domains → gyeonghak.com 추가

## SQLite vs Vercel 주의사항

Vercel은 서버리스라 SQLite 파일을 직접 쓰기 어려움.
해결책 2가지:

**A. Supabase (권장, 무료)**
- supabase.com에서 프로젝트 생성
- `scripts/build_db.py`를 PostgreSQL 버전으로 수정
- 연결 문자열을 `DATABASE_URL` 환경변수로 설정

**B. 로컬 서버 (간단)**
- 노트북에서 직접 `npm start`로 서버 실행
- Vercel 없이 ngrok으로 임시 공개

## 나머지 11경전 크롤링

역경(G) 완료 상태에서:
```bash
python scripts/crawl_all.py --only A B C D E F H I J K L
```

특정 경전만:
```bash
python scripts/crawl_all.py --only A  # 대학만
```

크롤링 후 다시 DB 빌드:
```bash
python scripts/build_db.py
```
