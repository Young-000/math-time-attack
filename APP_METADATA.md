# 구구단 챌린지 - 앱인토스 등록 가이드

> **공식 문서**: https://developers-apps-in-toss.toss.im/prepare/console-workspace.md

앱인토스 콘솔에서 미니앱 등록 시 필요한 모든 정보입니다.

---

## 1. 콘솔 등록 필수 항목

### 1-1. 기본 정보

| 항목 | 값 | 비고 |
|------|-----|------|
| **앱 이름 (displayName)** | 구구단 챌린지 | 한글 권장 |
| **appName (앱 ID)** | `gugudan-challenge` | granite.config.ts와 동일해야 함 |
| **사용 연령** | 전연령 | 비게임 앱 |
| **앱 유형** | 비게임 (partner) | `webViewProps.type: 'partner'` |

### 1-2. 고객센터 정보 (1개 이상 필수)

| 항목 | 값 |
|------|-----|
| **이메일** | (사업자 이메일 입력 필요) |
| **연락처** | (선택) |
| **채팅 상담 URL** | (선택) |

### 1-3. 카테고리 및 검색 (비게임)

| 항목 | 값 |
|------|-----|
| **카테고리** | 교육/학습 |
| **검색 키워드** | 구구단, 곱셈, 수학, 암산, 연습, 학습, 교육, 타임어택, 챌린지, 두뇌 훈련 |

---

## 2. 브랜드 정보

### 2-1. 앱 이름

| 언어 | 값 |
|------|-----|
| **한국어 앱 이름** | 구구단 챌린지 |
| **영어 앱 이름** | Gugudan Challenge |
| **appName** | `gugudan-challenge` |

### 2-2. 앱 설명 (20자 이내)

> 콘솔에서 "한 줄 설명"으로 표시됨

```
곱셈 실력 테스트 게임
```
(10자)

**대안:**
- `5문제, 얼마나 빨리?` (11자)
- `구구단 암산 챌린지` (9자)
- `나의 곱셈 실력은?` (9자)

### 2-3. 검색 키워드

```
구구단, 곱셈, 수학, 암산, 연습, 학습, 교육, 타임어택, 챌린지, 두뇌 훈련
```

---

## 3. 브랜드 로고 (필수)

> **공식 가이드**: https://developers-apps-in-toss.toss.im/design/miniapp-branding-guide.md

### 로고 요구사항
- **크기**: 600x600px 정방형
- **형태**: 각진 형태 (모서리 둥근 형태 불가)
- **배경**: 반드시 배경색 포함
- **호환성**: 라이트/다크 모드 모두에서 잘 보여야 함

### 준비된 파일

| 용도 | 파일명 | 배경색 | 그래픽 |
|------|--------|--------|--------|
| **콘솔 업로드 (다크)** | `public/logo-dark-600.png` | #191F28 | 파란 두뇌 + 노란 번개 |
| **콘솔 업로드 (라이트)** | `public/logo-light-600.png` | #FFFFFF | 파란 두뇌 + 주황 번개 |

### granite.config.ts 설정
```typescript
icon: 'https://math-time-attack.vercel.app/logo-light-600.png'
```

### SVG 원본
| 파일 | 용도 |
|------|------|
| `public/logo-dark.svg` | 다크 모드 원본 |
| `public/logo-light.svg` | 라이트 모드 원본 |

---

## 4. 기타 아이콘 (PWA/웹용)

| 사이즈 | 파일명 | 용도 |
|--------|--------|------|
| 512x512 | `app-icon-512.png` | PWA, OG 이미지 |
| 192x192 | `app-icon-192.png` | Android |
| 180x180 | `apple-touch-icon.png` | iOS |
| 32x32 | `favicon-32.png` | 브라우저 탭 |
| 16x16 | `favicon-16.png` | 브라우저 탭 |

---

## 5. 약관 및 정책 (필수)

> 토스 로그인 사용 시 필수 약관이 자동 포함되며, 파트너사 약관은 직접 등록해야 함

### 준비된 약관 페이지

| 약관 | URL | 파일 |
|------|-----|------|
| **서비스 이용약관** | `https://math-time-attack.vercel.app/legal/terms.html` | `public/legal/terms.html` |
| **개인정보처리방침** | `https://math-time-attack.vercel.app/legal/privacy.html` | `public/legal/privacy.html` |

---

## 6. granite.config.ts 설정

```typescript
import { defineConfig } from '@apps-in-toss/web-framework/config';

export default defineConfig({
  appName: 'gugudan-challenge',  // 콘솔에 등록한 앱 ID와 동일
  brand: {
    displayName: '구구단 챌린지',  // 콘솔에 등록한 앱 이름과 동일
    primaryColor: '#3182F6',
    icon: 'https://math-time-attack.vercel.app/logo-light-600.png',
  },
  web: {
    host: 'localhost',
    port: 5174,
    commands: {
      dev: 'vite',
      build: 'tsc && vite build',
    },
  },
  webViewProps: {
    type: 'partner',  // 비게임 앱
    bounces: false,
    pullToRefreshEnabled: false,
  },
  navigationBar: {
    withBackButton: true,
    withHomeButton: true,
  },
  permissions: [],
  outdir: 'dist',
});
```

---

## 7. 색상 팔레트

| 색상 | HEX | 용도 |
|------|-----|------|
| **토스 블루** | `#3182F6` | primaryColor, 두뇌 그래픽 |
| **다크 배경** | `#191F28` | 다크 모드 로고 배경 |
| **그린** | `#20C997` | CTA 버튼, 성공 |
| **옐로우/오렌지** | `#FFD43B` / `#FF922B` | 번개 그래픽, 강조 |
| **화이트** | `#FFFFFF` | 라이트 모드 로고 배경 |

---

## 8. 앱인토스 등록 체크리스트

### 콘솔 등록 필수 항목

- [x] **앱 로고** - 600x600px PNG (`logo-light-600.png`, `logo-dark-600.png`)
- [x] **앱 이름** - 구구단 챌린지
- [x] **appName** - `gugudan-challenge`
- [x] **앱 설명 (20자)** - "곱셈 실력 테스트 게임"
- [x] **카테고리** - 교육/학습
- [x] **검색 키워드** - 구구단, 곱셈, 수학 등
- [ ] **사용 연령** - 전연령 (콘솔에서 선택)
- [ ] **고객센터 정보** - 이메일 필수 (사업자 이메일 입력)

### 약관

- [x] **서비스 이용약관** - `/terms.html`
- [x] **개인정보처리방침** - `/privacy.html`

### 설정 파일

- [x] **granite.config.ts** - 설정 완료
- [x] **index.html** - SEO 메타태그 설정

### 사업자 관련 (콘솔에서 진행)

- [ ] **토스 비즈니스 회원 가입**
- [ ] **사업자 등록**
- [ ] **대표관리자 신청**

### 앱 내 기능

앱 내 기능:
- 구구단 도전하기: intoss://gugudan-challenge/game
- 타임어택 도전하기: intoss://gugudan-challenge/game?mode=timeattack

### 출시 전 확인

- [ ] **다크패턴 방지 정책** 준수
- [ ] **미니앱 브랜딩 가이드** 준수
- [x] **앱 내 기능 등록** (출시 검토 시)

---

## 참고 문서

| 문서 | URL |
|------|-----|
| **콘솔에서 앱 등록하기** | https://developers-apps-in-toss.toss.im/prepare/console-workspace.html |
| **비게임 출시 가이드** | https://developers-apps-in-toss.toss.im/checklist/app-nongame.html |
| **미니앱 브랜딩 가이드** | https://developers-apps-in-toss.toss.im/design/miniapp-branding-guide.html |
| **다크패턴 방지 정책** | https://developers-apps-in-toss.toss.im/design/consumer-ux-guide.html |

---

*마지막 업데이트: 2026-01-26*
