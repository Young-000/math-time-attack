import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { initializeUserIdentity } from '@infrastructure/userIdentity';
import './styles/global.css';

// 앱 시작 시 유저 식별자(hash) 조회 및 캐싱
initializeUserIdentity();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
