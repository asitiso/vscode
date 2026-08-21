import { useState } from 'react';
import './GroupInviteActions.css';

function inviteMessage(groupName: string, inviteCode: string): string {
  return `운동 그룹 "${groupName}"에 함께해요!\n초대코드: ${inviteCode}`;
}

export function GroupInviteActions({ groupName, inviteCode }: { groupName: string; inviteCode: string }) {
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');

  async function copy(text: string, successMessage: string) {
    setError('');
    try {
      if (!navigator.clipboard?.writeText) throw new Error('CLIPBOARD_UNAVAILABLE');
      await navigator.clipboard.writeText(text);
      setFeedback(successMessage);
    } catch {
      setFeedback('');
      setError('복사하지 못했습니다.');
    }
  }

  async function share() {
    setError('');
    const text = inviteMessage(groupName, inviteCode);
    if (!navigator.share) {
      await copy(text, '초대문구 복사됨 ✓');
      return;
    }

    try {
      await navigator.share({ text });
      setFeedback('');
    } catch (shareError) {
      if (shareError instanceof DOMException && shareError.name === 'AbortError') return;
      setFeedback('');
      setError('공유하지 못했습니다.');
    }
  }

  return (
    <div className="group-invite-actions">
      <button type="button" onClick={() => void copy(inviteCode, '복사됨 ✓')}>코드 복사</button>
      <button type="button" onClick={() => void share()}>친구에게 공유</button>
      {feedback && <small className="group-invite-actions__feedback">{feedback}</small>}
      {error && <small className="group-invite-actions__error" role="alert">{error}</small>}
    </div>
  );
}
