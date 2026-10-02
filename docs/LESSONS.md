# Math Time Attack — LESSONS

> 비자명한 교훈만 1줄로 상단 append. 자명한 요약 금지.

- 2026-10-02 **`npm ci`에서 죽은 CI는 테스트 부패를 8개월 동안 숨긴다.** lockfile 불일치(`@emnapi/*`·`yaml` 누락)로
  2026-01-11부터 CI가 설치 단계에서 끝나 테스트가 한 번도 돌지 않았다. 그사이 의도된 소스 변경(난이도 범위 분리,
  프로모션 SDK 직접 호출, local- ID 금지)이 테스트에 반영되지 않아 47건이 깨져 있었고, 진짜 버그 1건
  (`ChallengeBanner` 무한 재렌더)이 섞여 있었다. **lockfile만 고치면 끝이라고 보지 말고 CI 단계를 끝까지 로컬에서 재현한다**
  (lockfile은 CI와 같은 Node 20 / npm 10으로 재생성하고 같은 버전의 `npm ci`로 재현 확인한다.
  깨진 lockfile을 어느 npm이 만들었는지는 확인하지 못했다 — 새 lockfile은 npm 10·11 모두 `npm ci` 통과).
- 2026-10-02 **렌더마다 새로 만드는 `Date`를 `useEffect` 의존성에 넣으면 무한 루프다.** effect 안에서 새 객체로
  setState하면 재렌더 → 새 Date → effect가 끝없이 돈다. 브라우저에서는 조용히 CPU만 태우지만 테스트(act)에서는
  **실패가 아니라 무한 대기**라 vitest 전체가 끝나지 않는다. 의존성은 `getTime()` 같은 원시값으로.
  회귀 테스트는 호출 상한을 넘으면 throw하게 만들어 "멈춤"이 아니라 "실패"로 끝나게 한다.
- 2026-10-02 **`tsconfig.json`이 테스트 파일을 typecheck에서 제외한다** (`exclude: src/**/__tests__/**`).
  CI의 `tsc --noEmit`은 테스트 타입 오류를 잡지 못한다 — 테스트를 고쳤으면 임시 tsconfig로 따로 검사한다.
