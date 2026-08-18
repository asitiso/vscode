import { useEffect, useState } from 'react';
import { useGroupAuth } from '../../group/GroupAuthContext';
import { loadGroupProfile, upsertGroupProfile } from '../../group/groupApi';

export function GroupNicknameSettings() {
  const { user } = useGroupAuth();
  const [nickname, setNickname] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!user) { setLoaded(false); setNickname(''); return; }
    loadGroupProfile().then((profile) => {
      setNickname(profile?.nickname ?? '');
      setLoaded(Boolean(profile));
    }).catch(() => setLoaded(false));
  }, [user?.id]);

  if (!user || !loaded) return null;

  async function save() {
    const value = nickname.trim();
    if (value.length < 2 || value.length > 20) { setMessage('2~20자로 입력해 주세요.'); return; }
    try { const profile = await upsertGroupProfile(value); setNickname(profile.nickname); setMessage('그룹 닉네임을 변경했습니다.'); }
    catch { setMessage('닉네임을 변경하지 못했습니다.'); }
  }

  return <section className="settings-section">
    <label className="settings-label" htmlFor="group-nickname">그룹 닉네임</label>
    <p className="cloud-save__description">그룹에서만 보이는 이름입니다. 게임의 사용자 이름은 바뀌지 않습니다.</p>
    <div className="settings-row">
      <input id="group-nickname" className="settings-input" value={nickname} maxLength={20} onChange={(e) => setNickname(e.target.value)} />
      <button type="button" className="settings-save-btn" onClick={save}>변경</button>
    </div>
    {message && <p className="cloud-save__time" role="status">{message}</p>}
  </section>;
}
