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

## 🚨 광고 API (GoogleAdMob) 주의사항

> **보상형 광고 구현 시 반드시 확인할 것**

### 필수 이벤트 처리 패턴

```typescript
GoogleAdMob.showAppsInTossAdMob({
  options: { adGroupId: AD_GROUP_ID },
  onEvent: (event) => {
    switch (event.type) {
      case 'requested':
        // ⚠️ 필수: 광고 요청 시 로드 상태 리셋
        setIsAdLoaded(false);
        break;
      case 'userEarnedReward':
        // 보상 지급 (이 이벤트 기준으로 처리)
        onRewardCallback();
        break;
      case 'dismissed':
        // 광고 닫힘
        setIsAdLoaded(false);
        break;
    }
  },
});
```

### 주의사항

1. **`requested` 이벤트에서 `setIsAdLoaded(false)` 필수**
   - 문서 공식 패턴임
   - 누락 시 다음 광고 로드/표시에 문제 발생

2. **보상은 `userEarnedReward` 이벤트 기준**
   - `dismissed`가 아닌 `userEarnedReward`에서 보상 처리
   - 사용자가 광고를 끝까지 시청해야 발생

3. **버튼 disabled 조건**
   - `isAdLoaded`가 true일 때만 활성화
   - `isAdLoading` 중에는 비활성화 (클릭 시 에러 발생)

### 관련 파일
- `src/presentation/hooks/useRewardedAd.ts` - 광고 훅
- `src/presentation/pages/TimeAttackPage.tsx` - 타임어택 +10초 광고
- `src/presentation/pages/ResultPage.tsx` - 결과 페이지 하트 충전 광고
- `src/presentation/pages/DifficultySelectPage.tsx` - 난이도 선택 하트 충전 광고

---

## 🚨 하트 시스템 주의사항

### 게임 시작 시 하트 체크 필수

모든 게임 시작 경로에서 하트 체크 → 소모 로직이 있어야 함:

| 경로 | 파일 | 함수 |
|------|------|------|
| 난이도 선택 → 게임 | `DifficultySelectPage.tsx` | `tryStartGame()` |
| 결과 → 다시하기 | `ResultPage.tsx` | `handleRetry()` |
| 타임어택 결과 → 다시하기 | `TimeAttackResultPage.tsx` | `handleRetry()` |

### 하트 체크 패턴

```typescript
const handleRetry = () => {
  const currentHearts = getHeartInfo();

  if (currentHearts.count <= 0) {
    setShowNoHeartsModal(true);  // 충전 모달 표시
    return;
  }

  const used = consumeHeart();
  if (!used) {
    setShowNoHeartsModal(true);
    return;
  }

  setHeartInfo(getHeartInfo());
  navigate(`/game/${difficulty}`);
};
```

### 주의사항

1. **직접 `navigate()` 금지**: 하트 체크 없이 바로 게임 페이지로 이동하면 안 됨
2. **결과 페이지에 하트 UI 필수**: 사용자가 남은 하트 확인 가능해야 함
3. **하트 부족 모달 필수**: 광고/공유로 충전할 수 있는 옵션 제공

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
