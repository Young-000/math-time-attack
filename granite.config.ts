import { defineConfig } from '@apps-in-toss/web-framework/config';

export default defineConfig({
  appName: 'gugudan-challenge',
  brand: {
    displayName: '구구단 챌린지',
    primaryColor: '#3182F6',
    icon: 'https://static.toss.im/appsintoss/14599/b5316113-3d20-490d-812a-584f30b33f20.png',
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
