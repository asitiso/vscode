import { useState } from 'react';
import { upsertGroupProfile } from '../../group/groupApi';
import type { GroupProfile } from '../../group/groupTypes';

export function GroupProfileSetup({ initialNickname, onSaved }: { initialNickname: string; onSaved: (profile: GroupProfile) => void }) {
  const [nickname, setNickname] = useState(initialNickname.slice(0, 20));
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function save() {
    const value = nickname.trim();
    if (value.length < 2 || value.length > 20) { setError('닉네임은 2~20자로 입력해 주세요.'); return; }
    setBusy(true); setError('');
    try { onSaved(await upsertGroupProfile(value)); }
    catch { setError('닉네임을 저장하지 못했습니다.'); }
    finally { setBusy(false); }
  }

  return <div className="group-auth-card">
    <div className="group-hero-icon">🏷️</div>
    <h2>그룹 닉네임</h2>
    <p>게임 닉네임을 기본으로 가져왔어요. 그룹에서 보일 이름은 언제든 변경할 수 있습니다.</p>
    <label className="group-field">닉네임
      <input value={nickname} maxLength={20} onChange={(e) => setNickname(e.target.value)} />
    </label>
    <button type="button" className="group-primary-btn" onClick={save} disabled={busy}>그룹 시작하기</button>
    {error && <p className="group-error" role="alert">{error}</p>}
  </div>;
}
