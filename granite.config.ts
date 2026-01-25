import { defineConfig } from '@apps-in-toss/web-framework/config';

export default defineConfig({
  appName: 'math-time-attack',
  brand: {
    displayName: '구구단 챌린지',
    primaryColor: '#3182F6',
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
    type: 'partner',
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
