import { useEffect, useRef, useState } from 'react';
import { createGroup, joinGroup, loadMyGroups } from '../../group/groupApi';
import { extractGroupInviteCode } from '../../group/groupInviteCode';
import type { GroupSummary } from '../../group/groupTypes';
import { formatWorkoutSeconds } from '../../group/groupSelectors';

function errorMessage(error: unknown) {
  const code = error instanceof Error ? error.message : '';
  if (code === 'GROUP_LIMIT_REACHED') return '가입 가능한 그룹은 최대 5개입니다.';
  if (code === 'GROUP_FULL') return '이 그룹은 정원 20명이 모두 찼습니다.';
  if (code === 'INVALID_INVITE_CODE') return '초대코드를 다시 확인해 주세요.';
  if (code === 'INVALID_GROUP_NAME') return '그룹 이름은 2~30자로 입력해 주세요.';
  return '요청을 처리하지 못했습니다.';
}

export function GroupListScreen({ onSelectGroup }: { onSelectGroup: (groupId: string) => void }) {
  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [mode, setMode] = useState<'create'|'join'|null>(null);
  const [message, setMessage] = useState('');
  const [inviteMessage, setInviteMessage] = useState('');
  const [busy, setBusy] = useState(true);
  const [joining, setJoining] = useState(false);
  const joinInFlight = useRef(false);

  async function refresh() {
    setBusy(true);
    try { setGroups(await loadMyGroups()); setMessage(''); }
    catch { setMessage('그룹 목록을 불러오지 못했습니다.'); }
    finally { setBusy(false); }
  }
  useEffect(() => { void refresh(); }, []);

  async function create() {
    try {
      const result = await createGroup(name);
      setName(''); setMode(null); await refresh(); onSelectGroup(result.groupId);
    } catch (error) { setMessage(errorMessage(error)); }
  }
  async function join() {
    if (joinInFlight.current || code.length !== 6) return;
    joinInFlight.current = true;
    setJoining(true);
    setInviteMessage('');
    setMessage('');
    const inviteCode = code;
    try {
      const id = await joinGroup(inviteCode);
      setCode(''); setMode(null); await refresh(); onSelectGroup(id);
    } catch (error) { setMessage(errorMessage(error)); }
    finally {
      joinInFlight.current = false;
      setJoining(false);
    }
  }

  function applyInviteText(value: string): boolean {
    const extracted = extractGroupInviteCode(value);
    if (!extracted) {
      setInviteMessage('초대코드를 찾지 못했어요.');
      return false;
    }
    setCode(extracted);
    setInviteMessage('');
    return true;
  }

  async function pasteInviteCode() {
    if (joining) return;
    try {
      if (!navigator.clipboard?.readText) throw new Error('CLIPBOARD_UNAVAILABLE');
      const value = await navigator.clipboard.readText();
      applyInviteText(value);
    } catch {
      setInviteMessage('클립보드를 읽지 못했습니다.');
    }
  }

  return <>
    <div className="group-action-row">
      <button type="button" onClick={() => setMode(mode === 'create' ? null : 'create')}>+ 그룹 만들기</button>
      <button type="button" onClick={() => setMode(mode === 'join' ? null : 'join')}>코드로 참가</button>
    </div>

    {mode === 'create' && <div className="group-inline-form">
      <input value={name} maxLength={30} onChange={(e) => setName(e.target.value)} placeholder="그룹 이름" />
      <button type="button" onClick={create} disabled={name.trim().length < 2}>만들기</button>
    </div>}
    {mode === 'join' && <>
      <div className="group-inline-form group-inline-form--invite">
        <input
          value={code}
          maxLength={6}
          disabled={joining}
          onChange={(e) => {
            setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''));
            setInviteMessage('');
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              void join();
            }
          }}
          onPaste={(e) => {
            if (joining) {
              e.preventDefault();
              return;
            }
            const value = e.clipboardData.getData('text');
            const extracted = extractGroupInviteCode(value);
            if (extracted) {
              e.preventDefault();
              setCode(extracted);
              setInviteMessage('');
            } else if (value.trim().length > 6) {
              e.preventDefault();
              setCode('');
              setInviteMessage('초대코드를 찾지 못했어요.');
            }
          }}
          placeholder="6자리 초대코드"
        />
        <button type="button" className="group-paste-btn" onClick={() => void pasteInviteCode()} disabled={joining}>붙여넣기</button>
        <button type="button" onClick={() => void join()} disabled={joining || code.length !== 6}>{joining ? '참가 중…' : '참가'}</button>
      </div>
      {inviteMessage && <p className="group-error group-invite-paste-error" role="alert">{inviteMessage}</p>}
    </>}

    {message && <p className="group-error" role="alert">{message}</p>}
    <section className="group-list-section">
      <div className="group-section-heading"><div><span>MY GROUPS</span><h2>내 그룹</h2></div><b>{groups.length} / 5</b></div>
      {busy ? <p className="group-empty">불러오는 중…</p> : groups.length ? <div className="group-list">
        {groups.map((group) => <button type="button" className="group-list-item" key={group.id} onClick={() => onSelectGroup(group.id)}>
          <div><strong>{group.name}</strong><span>{group.memberCount}명 · 이번 주 {formatWorkoutSeconds(group.weeklySeconds)}</span></div><span>›</span>
        </button>)}
      </div> : <div className="group-empty"><strong>아직 가입한 그룹이 없어요</strong><p>친구들과 그룹을 만들거나 초대코드로 참가해 보세요.</p></div>}
    </section>
  </>;
}
