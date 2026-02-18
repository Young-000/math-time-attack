# 구구단 챌린지 (Math Time Attack) - 트러블슈팅

> 프로젝트 고유 이슈와 해결법. 공통 이슈는 workspace/CLAUDE.md 참조.

---

## 보상형 광고 이벤트 순서 오류

**증상**: 광고를 시청했는데 보상이 지급되지 않거나, 두 번째 광고부터 로드되지 않음

**원인**: GoogleAdMob 이벤트 처리 순서를 잘못 구현하거나 `requested` 이벤트에서 `setIsAdLoaded(false)` 누락

**해결**:
```typescript
// 반드시 이 순서로 처리
case 'requested': setIsAdLoaded(false);       // 필수!
case 'userEarnedReward': onRewardCallback();  // 보상 지급
case 'dismissed': setIsAdLoaded(false);       // 정리
```
- 보상은 반드시 `userEarnedReward` 이벤트에서만 지급
- `dismissed` 이벤트에서 보상 지급하면 안 됨

---

## 하트 체크 없이 게임 시작

**증상**: 하트가 0개인데 게임이 시작됨

**원인**: `navigate()` 호출 전에 하트 체크 로직이 빠짐

**해결**: 모든 게임 시작 경로에서 하트 체크 패턴 적용:
- `DifficultySelectPage.tsx` -> `tryStartGame()`
- `ResultPage.tsx` -> `handleRetry()`
- `TimeAttackResultPage.tsx` -> `handleRetry()`

직접 `navigate()` 호출 금지. 반드시 `getHeartInfo()` -> `consumeHeart()` -> `navigate()` 순서.

---

## .granite/app.json 미커밋

**증상**: 앱인토스 개발자센터에서 설정이 반영되지 않음

**원인**: `.granite/app.json` 수정사항이 로컬에만 있고 커밋되지 않은 상태

**해결**: 변경사항 확인 후 커밋:
```bash
git diff .granite/app.json
git add .granite/app.json
git commit -m "chore: update granite app.json config"
```

---

## TDS 컴포넌트 미사용으로 UI 불일치

**증상**: 다른 토스 앱과 UI가 다르게 보임 (폰트, 버튼 스타일, 간격 등)

**원인**: TDS 컴포넌트 대신 커스텀 CSS로 직접 구현

**해결**: `@toss/tds-mobile`의 공식 컴포넌트 사용:
- 버튼: `Button`, `CTAButton`, `FixedBottomCTA`
- 입력: `TextField`
- 키보드 대응: `fixedAboveKeyboard` prop

---

*마지막 업데이트: 2026-02-13*
