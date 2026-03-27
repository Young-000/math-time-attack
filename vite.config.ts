import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { aitMock } from './src/vite-plugin-ait-mock';

export default defineConfig({
  plugins: [aitMock(), react()],
  resolve: {
    alias: {
      '@domain': path.resolve(__dirname, './src/domain'),
      '@data': path.resolve(__dirname, './src/data'),
      '@infrastructure': path.resolve(__dirname, './src/infrastructure'),
      '@presentation': path.resolve(__dirname, './src/presentation'),
      '@lib': path.resolve(__dirname, './src/lib'),
      '@constants': path.resolve(__dirname, './src/constants'),
    },
  },
  server: {
    port: 5174,
  },
});
