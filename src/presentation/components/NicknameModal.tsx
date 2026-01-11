/**
 * 닉네임 변경 모달 컴포넌트
 */

import { useState, useEffect, useRef } from 'react';

interface NicknameModalProps {
  isOpen: boolean;
  currentNickname: string;
  onClose: () => void;
  onSave: (nickname: string) => Promise<boolean>;
}

export function NicknameModal({ isOpen, currentNickname, onClose, onSave }: NicknameModalProps) {
  const [nickname, setNickname] = useState(currentNickname);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setNickname(currentNickname);
      setError(null);
      inputRef.current?.focus();
    }
  }, [isOpen, currentNickname]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmed = nickname.trim();
    if (!trimmed) {
      setError('닉네임을 입력해주세요.');
      return;
    }

    if (trimmed.length > 20) {
      setError('닉네임은 20자 이하로 입력해주세요.');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const success = await onSave(trimmed);
      if (success) {
        onClose();
      } else {
        setError('닉네임 저장에 실패했습니다.');
      }
    } catch {
      setError('오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="nickname-modal-title"
      >
        <h2 id="nickname-modal-title" className="modal-title">
          닉네임 변경
        </h2>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <label htmlFor="nickname-input" className="visually-hidden">
              닉네임
            </label>
            <input
              id="nickname-input"
              ref={inputRef}
              type="text"
              className={`nickname-input ${error ? 'error' : ''}`}
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="닉네임을 입력하세요"
              maxLength={20}
              disabled={isSaving}
            />
            <p className="nickname-hint">최대 20자</p>
            {error && <p className="nickname-error">{error}</p>}
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="modal-btn secondary"
              onClick={onClose}
              disabled={isSaving}
            >
              취소
            </button>
            <button
              type="submit"
              className="modal-btn primary"
              disabled={isSaving}
            >
              {isSaving ? '저장 중...' : '저장'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
