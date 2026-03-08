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
          aria-label="\uB4A4\uB85C\uAC00\uAE30"
        >
          \u2190
        </button>
        <h1 className="hof-title">{'\u{1F3C6}'} \uBA85\uC608\uC758 \uC804\uB2F9</h1>
      </header>

      <div className="hof-tabs">
        <button
          className={`hof-tab ${activeTab === 'weekly' ? 'active' : ''}`}
          onClick={() => setActiveTab('weekly')}
        >
          \uC8FC\uAC04 \uCC4C\uB9B0\uC9C0
        </button>
        <button
          className={`hof-tab ${activeTab === 'monthly' ? 'active' : ''}`}
          onClick={() => setActiveTab('monthly')}
        >
          \uC6D4\uAC04 \uCC4C\uB9B0\uC9C0
        </button>
      </div>

      <main className="hof-content">
        {isLoading ? (
          <div className="hof-loading">\uB85C\uB529 \uC911...</div>
        ) : grouped.size === 0 ? (
          <div className="hof-empty">
            <div className="hof-empty-icon">{'\u{1F3C6}'}</div>
            <p className="hof-empty-text">\uC544\uC9C1 \uCC4C\uB9B0\uC9C0 \uAE30\uB85D\uC774 \uC5C6\uC5B4\uC694</p>
            <p className="hof-empty-sub">\uC774\uBC88 \uC8FC \uB7AD\uD0B9\uC5D0 \uB3C4\uC804\uD574\uBCF4\uC138\uC694!</p>
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
                        {TROPHY_ICONS[entry.rank - 1] ?? `${entry.rank}\uC704`}
                      </span>
                      <div className="hof-winner-info">
                        <span className="hof-winner-name">
                          {entry.nickname ?? '\uC775\uBA85'}
                        </span>
                        <span className="hof-winner-score">
                          {entry.score}\uC810 \u00B7 {entry.difficulty}
                        </span>
                      </div>
                      <span className="hof-winner-stars">
                        +{entry.points_awarded}\uBCC4
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
