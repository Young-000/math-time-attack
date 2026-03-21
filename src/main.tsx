import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { initializeUserIdentity, checkUnlinkReferrer, clearAllUserData } from '@infrastructure/userIdentity';
import './styles/global.css';

// AIT 가이드라인: UNLINK referrer 처리 (연결 해제 시 모든 데이터 삭제)
if (checkUnlinkReferrer()) {
  clearAllUserData();
  window.history.replaceState({}, '', window.location.pathname);
}

// 앱 시작 시 유저 식별자(hash) 조회 및 캐싱
initializeUserIdentity();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
