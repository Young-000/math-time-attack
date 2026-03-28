/**
 * 명예의 전당 페이지
 * 역대 주간/월간 챌린지 우승자를 기간별로 보여줌
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchHallOfFame, type HallOfFameEntry } from '@domain/services/hallOfFameService';
import { BannerAd } from '@presentation/components';

type TabType = 'weekly' | 'monthly';

const TROPHY_ICONS = ['\u{1F947}', '\u{1F948}', '\u{1F949}'];

function groupByPeriod(entries: HallOfFameEntry[]): Map<string, HallOfFameEntry[]> {
  const map = new Map<string, HallOfFameEntry[]>();
  for (const entry of entries) {
    const key = entry.period_key;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(entry);
  }
  return map;
}

export function HallOfFamePage(): JSX.Element {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('weekly');
  const [entries, setEntries] = useState<HallOfFameEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      const data = await fetchHallOfFame(activeTab);
      setEntries(data);
    } catch {
      setEntries([]);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab]);

  useEffect(() => { loadData(); }, [loadData]);

  const grouped = groupByPeriod(entries);

  return (
    <div className="page hall-of-fame-page">
      <header className="hof-header">
        <button
          className="hof-back-btn"
          onClick={() => navigate('/ranking')}
          aria-label="뒤로가기"
        >
          {'←'}
        </button>
        <h1 className="hof-title">{'\u{1F3C6}'} 명예의 전당</h1>
      </header>

      <div className="hof-tabs">
        <button
          className={`hof-tab ${activeTab === 'weekly' ? 'active' : ''}`}
          onClick={() => setActiveTab('weekly')}
        >
          주간 챌린지
        </button>
        <button
          className={`hof-tab ${activeTab === 'monthly' ? 'active' : ''}`}
          onClick={() => setActiveTab('monthly')}
        >
          월간 챌린지
        </button>
      </div>

      <main className="hof-content">
        {isLoading ? (
          <div className="hof-loading">로딩 중...</div>
        ) : grouped.size === 0 ? (
          <div className="hof-empty">
            <div className="hof-empty-icon">{'\u{1F3C6}'}</div>
            <p className="hof-empty-text">아직 챌린지 기록이 없어요</p>
            <p className="hof-empty-sub">이번 주 랭킹에 도전해보세요!</p>
          </div>
        ) : (
          Array.from(grouped.entries()).map(([periodKey, periodEntries]) => {
            const label = periodEntries[0]?.period_label ?? periodKey;
            return (
              <div key={periodKey} className="hof-period-card">
                <h2 className="hof-period-label">{label}</h2>
                <div className="hof-winners">
                  {periodEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className={`hof-winner rank-${entry.rank}`}
                    >
                      <span className="hof-trophy">
                        {TROPHY_ICONS[entry.rank - 1] ?? `${entry.rank}위`}
                      </span>
                      <div className="hof-winner-info">
                        <span className="hof-winner-name">
                          {entry.nickname ?? '익명'}
                        </span>
                        <span className="hof-winner-score">
                          {entry.score}점 · {entry.difficulty}
                        </span>
                      </div>
                      <span className="hof-winner-stars">
                        +{entry.points_awarded}별
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </main>

      <BannerAd className="banner-ad-hof" />
    </div>
  );
}
