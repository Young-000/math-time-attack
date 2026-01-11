/**
 * 난이도 선택 페이지
 */

import { useNavigate } from 'react-router-dom';
import { DIFFICULTY_CONFIG, type DifficultyType } from '@domain/entities';
import { getBestRecord } from '@data/recordService';
import { formatTime } from '@lib/utils';

const difficulties: DifficultyType[] = ['easy', 'medium', 'hard'];

export function DifficultySelectPage() {
  const navigate = useNavigate();

  const handleSelect = (difficulty: DifficultyType) => {
    navigate(`/game/${difficulty}`);
  };

  const handleRankingClick = () => {
    navigate('/ranking');
  };

  return (
    <div className="page">
      <header className="header">
        <div className="header-top">
          <button
            className="ranking-link-btn"
            onClick={handleRankingClick}
            aria-label="랭킹 보기"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path
                d="M7 17h2v-7H7v7zm4 0h2V7h-2v10zm4 0h2v-4h-2v4z"
                fill="currentColor"
              />
            </svg>
            랭킹
          </button>
        </div>
        <h1 className="title">연산 타임어택</h1>
        <p className="subtitle">5문제를 가장 빠르게 풀어보세요!</p>
      </header>

      <main className="content">
        <div className="difficulty-list">
          {difficulties.map((difficulty) => {
            const config = DIFFICULTY_CONFIG[difficulty];
            const record = getBestRecord(difficulty);

            return (
              <button
                key={difficulty}
                className="difficulty-card"
                onClick={() => handleSelect(difficulty)}
                data-difficulty={difficulty}
              >
                <div className="difficulty-header">
                  <span className="difficulty-label">{config.label}</span>
                  <span className="difficulty-range">
                    {config.min}-{config.max}단
                  </span>
                </div>
                <p className="difficulty-desc">{config.description}</p>
                <div className="difficulty-record">
                  {record ? (
                    <span className="record-time">
                      최고 기록: {formatTime(record.time)}
                    </span>
                  ) : (
                    <span className="record-none">기록 없음</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </main>
    </div>
  );
}
