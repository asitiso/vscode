import { useState } from 'react';
import { useGroupAuth } from '../../group/GroupAuthContext';

export function GroupAuthScreen() {
  const { signInWithGoogle, sendMagicLink } = useGroupAuth();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function google() {
    setBusy(true); setMessage('');
    try {
      const { error } = await signInWithGoogle();
      if (error) setMessage('Google 로그인을 시작하지 못했습니다.');
    } catch { setMessage('로그인 연결을 확인해 주세요.'); setBusy(false); }
  }

  async function magicLink() {
    if (!email.trim()) return;
    setBusy(true); setMessage('');
    try {
      const { error } = await sendMagicLink(email);
      setMessage(error ? '로그인 링크를 보내지 못했습니다.' : '메일함으로 로그인 링크를 보냈어요.');
    } catch { setMessage('로그인 연결을 확인해 주세요.'); }
    finally { setBusy(false); }
  }

  return <div className="group-auth-card">
    <div className="group-hero-icon">👥</div>
    <h2>운동 그룹 시작하기</h2>
    <p>친구들과 오늘·이번 주 운동시간을 확인할 수 있어요. 일반 게임 이용에는 로그인이 필요하지 않습니다.</p>
    <button type="button" className="group-primary-btn" onClick={google} disabled={busy}>Google로 계속하기</button>
    <div className="group-divider"><span>또는</span></div>
    <label className="group-field">이메일
      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" />
    </label>
    <button type="button" className="group-secondary-btn" onClick={magicLink} disabled={busy || !email.trim()}>이메일 로그인 링크 받기</button>
    {message && <p className="group-status" role="status">{message}</p>}
  </div>;
}
