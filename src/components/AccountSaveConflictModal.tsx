import './AccountSaveConflictModal.css';
import { useGame } from '../store/GameContext';

export function AccountSaveConflictModal() {
  const { accountConflict, accountSyncStatus, resolveAccountConflict } = useGame();
  if (!accountConflict) return null;

  const busy = accountSyncStatus === 'saving';

  return (
    <div className="account-save-conflict" role="presentation">
      <section
        className="account-save-conflict__card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="account-save-conflict-title"
      >
        <span className="account-save-conflict__eyebrow">SAVE CONFLICT</span>
        <h2 id="account-save-conflict-title">저장 데이터가 서로 달라요</h2>
        <p>계정에 저장된 데이터와 이 기기의 데이터가 모두 변경되었습니다. 사용할 데이터를 선택해 주세요.</p>
        <div className="account-save-conflict__actions">
          <button
            type="button"
            className="account-save-conflict__button account-save-conflict__button--server"
            disabled={busy}
            onClick={() => void resolveAccountConflict('server')}
          >
            계정 데이터 사용
          </button>
          <button
            type="button"
            className="account-save-conflict__button account-save-conflict__button--device"
            disabled={busy}
            onClick={() => void resolveAccountConflict('device')}
          >
            이 기기 데이터 사용
          </button>
        </div>
        <small>선택하지 않는 동안에는 어느 쪽 데이터도 자동으로 덮어쓰지 않습니다.</small>
      </section>
    </div>
  );
}
