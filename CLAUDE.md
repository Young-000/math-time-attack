# Math Time Attack

수학 문제 타임어택 게임

---

## 진행상황 체크리스트

| 영역 | 상태 | 배포 URL |
|------|:----:|----------|
| **Frontend** | ✅ | [math-time-attack.vercel.app](https://math-time-attack.vercel.app) |
| **Backend** | ✅ | Supabase 직접 연결 |
| **DB 연결** | ✅ | 스키마 생성 완료 |
| **배포** | ✅ | Vercel |

<details>
<summary>상세 체크리스트</summary>

### Frontend
- [x] 프로젝트 초기화 (Vite)
- [x] TypeScript 설정
- [x] 환경 변수 (.env.local)

### Backend
- [x] Supabase 직접 연결 (별도 백엔드 없음)

### DB 연결
- [x] Project 1 선택
- [x] `math_attack` 스키마 생성
- [x] 테이블 생성 (game_records, user_profiles)
- [x] 클라이언트 `.schema()` 적용
- [x] RLS 정책 활성화

### 배포
- [x] vercel.json
- [x] 프로덕션 배포

</details>

---

## Supabase 설정

> ⚠️ **필수 참조**: [`/SUPABASE_RULES.md`](/SUPABASE_RULES.md)

| 항목 | 값 |
|------|-----|
| **Project** | Project 1 (게임) |
| **Project ID** | `ayibvijmjygujjieueny` |
| **Schema** | `math_attack` |
| **URL** | `https://ayibvijmjygujjieueny.supabase.co` |

## 기술 스택

- **Frontend**: React + Vite + TypeScript
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)

## 개발 명령어

```bash
npm install    # 의존성 설치
npm run dev    # 개발 서버
npm run build  # 프로덕션 빌드
npm run lint   # 린트 실행
```

## 환경 변수

`.env.local`:
```env
# Supabase Configuration - Project 1 (게임)
# Schema: math_attack

VITE_SUPABASE_URL=https://ayibvijmjygujjieueny.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

## 테이블 구조

```sql
-- game_records: 게임 기록 저장
CREATE TABLE math_attack.game_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  odl_id VARCHAR NOT NULL,
  difficulty VARCHAR NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  operation VARCHAR NOT NULL CHECK (operation IN ('addition', 'multiplication', 'mixed')),
  time INTEGER NOT NULL CHECK (time > 0),
  nickname VARCHAR,
  played_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- user_profiles: 닉네임 관리
CREATE TABLE math_attack.user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  odl_id VARCHAR UNIQUE NOT NULL,
  nickname VARCHAR NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

---

*이 프로젝트는 글로벌 규칙 `/CLAUDE.md` 및 `/SUPABASE_RULES.md`를 따릅니다.*
