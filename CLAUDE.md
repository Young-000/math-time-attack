# 구구단 챌린지

구구단 연습 앱 (앱인토스 일반 앱)

---

## 🚨 앱인토스 개발 필수 규칙

> **이 프로젝트는 앱인토스(Apps-in-Toss) 미니앱입니다.**

### 개발 시 반드시 먼저 확인할 것

1. **TDS 문서 검색 우선**
   - UI/UX 수정 전 `knowlege-skills:docs-search` 스킬로 TDS 문서 검색
   - CSS로 직접 구현하기 전에 TDS 컴포넌트 존재 여부 확인

2. **TDS 컴포넌트 사용 필수**
   - `@toss/tds-mobile` 패키지의 컴포넌트 우선 사용
   - 키보드 대응: `FixedBottomCTA` + `fixedAboveKeyboard` prop
   - 입력 필드: `TextField` 컴포넌트
   - 버튼: `Button`, `CTAButton` 컴포넌트

3. **검색 쿼리 예시**
   ```bash
   # 키보드 위 고정
   "BottomCTA fixedAboveKeyboard 키보드"

   # 입력 필드
   "TextField Input 텍스트 입력"

   # 하단 고정 버튼
   "FixedBottomCTA 하단 고정"
   ```

### TDS 주요 컴포넌트

| 용도 | 컴포넌트 | import |
|------|----------|--------|
| 하단 고정 버튼 | `FixedBottomCTA` | `@toss/tds-mobile` |
| 키보드 위 고정 | `fixedAboveKeyboard={true}` | prop |
| 텍스트 입력 | `TextField` | `@toss/tds-mobile` |
| 버튼 | `Button`, `CTAButton` | `@toss/tds-mobile` |

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

### 기본 명령어
```bash
npm install      # 의존성 설치
npm run dev      # 개발 서버 (localhost:5173)
npm run build    # 프로덕션 빌드
npm run preview  # 빌드 결과 미리보기
```

### 코드 품질 검사
```bash
npm run lint       # ESLint 실행
npm run typecheck  # TypeScript 타입 검사
```

### 테스트 실행
```bash
npm run test              # 단위 테스트 (Vitest)
npm run test:coverage     # 테스트 커버리지 보고서
npm run test:e2e          # E2E 테스트 (Playwright)
npm run test:e2e:ui       # E2E 테스트 UI 모드
npm run test:e2e:headed   # E2E 테스트 헤드 모드
```

### 배포 전 체크리스트
```bash
npm run lint       # 에러 0개
npm run typecheck  # 에러 0개
npm run build      # 빌드 성공
npm test           # 80% 이상 통과
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
