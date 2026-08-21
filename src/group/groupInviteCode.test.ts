import { describe, expect, it } from 'vitest';
import { extractGroupInviteCode } from './groupInviteCode';

describe('extractGroupInviteCode', () => {
  it('normalizes a raw six-character invite code', () => {
    expect(extractGroupInviteCode(' ab12c3 ')).toBe('AB12C3');
  });

  it('extracts the code from the shared invite message', () => {
    expect(extractGroupInviteCode('운동 그룹 "아침 운동단"에 함께해요!\n초대코드: ABC123')).toBe('ABC123');
  });

  it('returns null when the text does not contain a supported invite-code shape', () => {
    expect(extractGroupInviteCode('친구가 123456번 운동했대요')).toBeNull();
  });
});
