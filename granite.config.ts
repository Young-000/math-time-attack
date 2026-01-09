import { defineConfig } from '@apps-in-toss/web-framework/config';

export default defineConfig({
  appName: 'math-time-attack',
  brand: {
    displayName: '연산 타임어택',
    primaryColor: '#3182F6', // 토스 블루
    icon: 'https://math-time-attack.vercel.app/app-icon.svg',
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
    type: 'game',
    bounces: false, // 게임에서는 바운스 비활성화
    pullToRefreshEnabled: false, // 게임에서는 당겨서 새로고침 비활성화
    allowsBackForwardNavigationGestures: false, // 게임 중 스와이프 뒤로가기 방지
  },
  navigationBar: {
    withBackButton: true,
    withHomeButton: false, // 게임에서는 홈 버튼 불필요
  },
  features: {
    gameCenter: true,
    ads: false,
  },
  permissions: [],
  outdir: 'dist',
});
