# Project Overview

## 기본 정보
| 항목 | 내용 |
|------|------|
| **프로젝트명** | math-time-attack |
| **목적** | 곱셈 실력 테스트 타임어택 게임 |
| **상태** | 🟢 운영 중 |
| **시작일** | - |
| **마지막 업데이트** | 2025-01-19 |

## 한 줄 요약
> 구구단부터 99단까지! 곱셈 실력을 테스트하는 타임어택 게임

## 기술 스택
| 분류 | 기술 |
|------|------|
| Frontend | React |
| Framework | @apps-in-toss/web-framework |
| Database | Supabase |
| UI | @toss/tds-mobile |
| Language | TypeScript |
| Testing | E2E (Playwright) |

## 주요 기능
- 곱셈 문제 타임어택
- 난이도별 게임 모드
- 점수 기록 및 랭킹
- 토스 앱 연동

## 아키텍처 개요
```
src/
├── pages/        # 라우팅 페이지
├── components/   # UI 컴포넌트
├── hooks/        # 커스텀 훅
└── utils/        # 유틸리티
```

## 디렉토리 구조
```
math-time-attack/
├── coverage/          # 테스트 커버리지
├── dist/              # 빌드 결과물
├── docs/              # 문서
├── e2e/               # E2E 테스트
├── public/            # 정적 파일
├── screenshots/       # 스크린샷
├── src/               # 소스 코드
└── supabase/          # Supabase 설정
```

## 최근 작업 내역
| 날짜 | 작업 내용 | 상태 |
|------|----------|------|
| - | 초기 개발 완료 | ✅ 완료 |

## 다음 할 일
- [ ] 새로운 게임 모드 추가
- [ ] UI/UX 개선

## 참고 사항
- Supabase 스키마: `math_attack`
- 토스 앱 내 서비스로 배포

---
*이 문서는 Claude Code Stop 훅에 의해 자동으로 업데이트됩니다.*
