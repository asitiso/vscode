import { describe, expect, it } from 'vitest';
import { getHomeGroupShortcutCopy } from './homeGroupShortcut';

describe('getHomeGroupShortcutCopy', () => {
  it('shows a simple group entry point without requiring group data on home', () => {
    expect(getHomeGroupShortcutCopy()).toEqual({
      title: '내 그룹',
      subtitle: '같이 운동하기',
    });
  });
});
