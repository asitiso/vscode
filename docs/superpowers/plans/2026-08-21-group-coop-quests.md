# Group Coop Quests Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add weekly cooperative group quests and a fair contribution-based MVP to the existing group detail screen without requiring members to do the same exercise.

**Architecture:** Keep all quest/MVP rules in a pure selector module that consumes the existing `GroupMemberSummary[]`. Render the derived view in a focused `GroupCoopQuestPanel` inserted above the existing ranking panel. Do not change Supabase schema, `groupApi.ts`, save state, XP, rewards, or ranking behavior.

**Tech Stack:** React 19, TypeScript, Vitest, Testing Library, CSS, existing group data model.

**Spec:** `docs/superpowers/specs/2026-08-21-group-coop-quests-design.md`

## Global Constraints

- Exercise type is never compared or weighted.
- Use existing `weeklySeconds` and `weeklyGoalPercent` only.
- No new Supabase migration, persistent table, game-save field, XP, item, or reward-claim state.
- Attendance target: `ceil(memberCount * 0.7)`, minimum 1 for non-empty groups.
- Time target: `memberCount * 60 minutes`.
- Goal-completion target: `ceil(memberCount * 0.5)`, minimum 1 for non-empty groups.
- MVP score: participation +1; each completed 30 minutes +1 capped at +4; goal >=50% +1; goal >=100% additional +2; max 8.
- MVP ties: higher goal percent, then higher weekly seconds, then nickname ascending.
- Empty member arrays must never count as completed.
- Existing live status, today/week ranking, chase UI, group management, and group API aggregation remain unchanged.

---

### Task 1: Pure quest and MVP selector

**Files:**
- Create: `src/group/groupQuestSelectors.ts`
- Test: `src/group/groupQuestSelectors.test.ts`

**Interfaces:**
- Consumes: `GroupMemberSummary[]` from `src/group/groupTypes.ts`.
- Produces: `buildGroupQuestView(members: GroupMemberSummary[]): GroupQuestView`.
- `GroupQuestView` contains `attendance`, `time`, `goal`, `allCompleted`, and `mvp`.
- Each quest item contains `{ current: number; target: number; completed: boolean; progressPercent: number }`.
- `mvp` is `null` or `{ member: GroupMemberSummary; score: number }`.

- [ ] **Step 1: Write failing selector tests**

Create `src/group/groupQuestSelectors.test.ts` using Vitest and real `GroupMemberSummary` objects. Cover these exact behaviors:

```ts
import { describe, expect, it } from 'vitest';
import type { GroupMemberSummary } from './groupTypes';
import { buildGroupQuestView } from './groupQuestSelectors';

function member(
  userId: string,
  nickname: string,
  weeklySeconds: number,
  weeklyGoalPercent: number,
): GroupMemberSummary {
  return {
    userId,
    nickname,
    todaySeconds: 0,
    weeklySeconds,
    weeklyGoalPercent,
    isActive: false,
  };
}

describe('buildGroupQuestView', () => {
  it('4명 그룹의 출석 목표는 3명이고 시간 목표는 240분이다', () => {
    const view = buildGroupQuestView([
      member('a', '가', 1800, 20),
      member('b', '나', 3600, 40),
      member('c', '다', 0, 0),
      member('d', '라', 0, 0),
    ]);
    expect(view.attendance.target).toBe(3);
    expect(view.attendance.current).toBe(2);
    expect(view.time.target).toBe(240);
    expect(view.time.current).toBe(90);
  });

  it('5명 그룹의 개인목표 완료 목표는 3명이다', () => {
    const view = buildGroupQuestView(Array.from({ length: 5 }, (_, index) => member(String(index), `멤버${index}`, 0, 0)));
    expect(view.goal.target).toBe(3);
  });

  it('진행률은 100%를 넘지 않고 세 미션이 모두 완료되면 allCompleted가 true다', () => {
    const view = buildGroupQuestView([
      member('a', '가', 10800, 120),
      member('b', '나', 10800, 100),
    ]);
    expect(view.attendance.completed).toBe(true);
    expect(view.time.completed).toBe(true);
    expect(view.goal.completed).toBe(true);
    expect(view.time.progressPercent).toBe(100);
    expect(view.allCompleted).toBe(true);
  });

  it('MVP 시간 점수는 4점으로 제한되고 100% 목표 달성 시 최대 8점이다', () => {
    const view = buildGroupQuestView([member('a', '민수', 9000, 100)]);
    expect(view.mvp?.score).toBe(8);
  });

  it('50%와 100% 목표 경계를 각각 적용한다', () => {
    const below = buildGroupQuestView([member('a', '가', 1800, 49)]);
    const half = buildGroupQuestView([member('a', '가', 1800, 50)]);
    const full = buildGroupQuestView([member('a', '가', 1800, 100)]);
    expect(below.mvp?.score).toBe(2);
    expect(half.mvp?.score).toBe(3);
    expect(full.mvp?.score).toBe(5);
  });

  it('MVP 동률은 목표 달성률, 운동시간, 닉네임 순서로 푼다', () => {
    const byGoal = buildGroupQuestView([
      member('a', '가', 3600, 60),
      member('b', '나', 3600, 70),
    ]);
    expect(byGoal.mvp?.member.userId).toBe('b');

    const byTime = buildGroupQuestView([
      member('a', '가', 1800, 60),
      member('b', '나', 3000, 60),
    ]);
    expect(byTime.mvp?.member.userId).toBe('b');

    const byName = buildGroupQuestView([
      member('a', '가', 1800, 60),
      member('b', '나', 1800, 60),
    ]);
    expect(byName.mvp?.member.userId).toBe('a');
  });

  it('모두 0점이면 MVP가 없고 음수 시간은 0으로 정규화한다', () => {
    const view = buildGroupQuestView([
      member('a', '가', -100, 0),
      member('b', '나', 0, 0),
    ]);
    expect(view.time.current).toBe(0);
    expect(view.mvp).toBeNull();
  });

  it('빈 그룹은 0/0이더라도 완료로 판정하지 않는다', () => {
    const view = buildGroupQuestView([]);
    expect(view.attendance).toEqual({ current: 0, target: 0, completed: false, progressPercent: 0 });
    expect(view.time.completed).toBe(false);
    expect(view.goal.completed).toBe(false);
    expect(view.allCompleted).toBe(false);
    expect(view.mvp).toBeNull();
  });
});
```

- [ ] **Step 2: Run selector test and verify RED**

Run:

```bash
npm test -- src/group/groupQuestSelectors.test.ts
```

Expected: FAIL because `./groupQuestSelectors` does not exist yet.

- [ ] **Step 3: Implement the minimal selector**

Create `src/group/groupQuestSelectors.ts` with focused exported types and helpers:

```ts
import type { GroupMemberSummary } from './groupTypes';

export interface GroupQuestProgress {
  current: number;
  target: number;
  completed: boolean;
  progressPercent: number;
}

export interface GroupQuestMvp {
  member: GroupMemberSummary;
  score: number;
}

export interface GroupQuestView {
  attendance: GroupQuestProgress;
  time: GroupQuestProgress;
  goal: GroupQuestProgress;
  allCompleted: boolean;
  mvp: GroupQuestMvp | null;
}

function clampProgress(current: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min(100, Math.max(0, (current / target) * 100));
}

function progress(current: number, target: number, hasMembers: boolean): GroupQuestProgress {
  return {
    current,
    target,
    completed: hasMembers && target > 0 && current >= target,
    progressPercent: clampProgress(current, target),
  };
}

function normalizedSeconds(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function normalizedGoal(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function contributionScore(member: GroupMemberSummary): number {
  const seconds = normalizedSeconds(member.weeklySeconds);
  if (seconds <= 0) return 0;
  const goal = normalizedGoal(member.weeklyGoalPercent);
  const participation = 1;
  const time = Math.min(4, Math.floor(seconds / 1800));
  const halfGoal = goal >= 50 ? 1 : 0;
  const fullGoal = goal >= 100 ? 2 : 0;
  return participation + time + halfGoal + fullGoal;
}

export function buildGroupQuestView(members: GroupMemberSummary[]): GroupQuestView {
  const hasMembers = members.length > 0;
  const normalized = members.map((member) => ({
    member,
    seconds: normalizedSeconds(member.weeklySeconds),
    goal: normalizedGoal(member.weeklyGoalPercent),
  }));

  const attendanceCurrent = normalized.filter((item) => item.seconds > 0).length;
  const attendanceTarget = hasMembers ? Math.max(1, Math.ceil(members.length * 0.7)) : 0;
  const totalMinutes = Math.floor(normalized.reduce((sum, item) => sum + item.seconds, 0) / 60);
  const timeTarget = members.length * 60;
  const goalCurrent = normalized.filter((item) => item.goal >= 100).length;
  const goalTarget = hasMembers ? Math.max(1, Math.ceil(members.length * 0.5)) : 0;

  const attendance = progress(attendanceCurrent, attendanceTarget, hasMembers);
  const time = progress(totalMinutes, timeTarget, hasMembers);
  const goal = progress(goalCurrent, goalTarget, hasMembers);

  const ranked = normalized
    .map(({ member, seconds, goal: goalPercent }) => ({ member, seconds, goalPercent, score: contributionScore(member) }))
    .filter((item) => item.score > 0)
    .sort((left, right) =>
      right.score - left.score ||
      right.goalPercent - left.goalPercent ||
      right.seconds - left.seconds ||
      left.member.nickname.localeCompare(right.member.nickname, 'ko'),
    );

  return {
    attendance,
    time,
    goal,
    allCompleted: attendance.completed && time.completed && goal.completed,
    mvp: ranked[0] ? { member: ranked[0].member, score: ranked[0].score } : null,
  };
}
```

- [ ] **Step 4: Run selector tests and verify GREEN**

Run:

```bash
npm test -- src/group/groupQuestSelectors.test.ts
```

Expected: PASS.

- [ ] **Step 5: Review selector behavior**

Confirm no React, Supabase, storage, or ranking imports were added and `GroupMemberSummary` remains unchanged.

---

### Task 2: Cooperative quest panel UI

**Files:**
- Create: `src/screens/group/GroupCoopQuestPanel.tsx`
- Create: `src/screens/group/GroupCoopQuestPanel.test.tsx`
- Modify: `src/screens/group/GroupScreens.css`

**Interfaces:**
- Consumes: `members: GroupMemberSummary[]`.
- Calls: `buildGroupQuestView(members)` from Task 1.
- Produces: a presentational panel with three quests, progress bars, completion headline, and MVP/waiting state.

- [ ] **Step 1: Write failing component tests**

Create `src/screens/group/GroupCoopQuestPanel.test.tsx`:

```tsx
// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { GroupMemberSummary } from '../../group/groupTypes';
import { GroupCoopQuestPanel } from './GroupCoopQuestPanel';

function member(userId: string, nickname: string, weeklySeconds: number, weeklyGoalPercent: number): GroupMemberSummary {
  return { userId, nickname, todaySeconds: 0, weeklySeconds, weeklyGoalPercent, isActive: false };
}

afterEach(cleanup);

describe('GroupCoopQuestPanel', () => {
  it('세 공동 미션과 진행 수치를 보여준다', () => {
    render(<GroupCoopQuestPanel members={[
      member('a', '민수', 3600, 100),
      member('b', '지수', 1800, 40),
      member('c', '유나', 0, 0),
      member('d', '준호', 0, 0),
    ]} />);
    expect(screen.getByText('👟 모두의 출석')).toBeInTheDocument();
    expect(screen.getByText('2 / 3명')).toBeInTheDocument();
    expect(screen.getByText('⏱️ 함께 채운 시간')).toBeInTheDocument();
    expect(screen.getByText('90 / 240분')).toBeInTheDocument();
    expect(screen.getByText('🎯 각자의 목표, 하나의 팀')).toBeInTheDocument();
    expect(screen.getByText('1 / 2명')).toBeInTheDocument();
  });

  it('세 미션이 모두 완료되면 COMPLETE 문구를 보여준다', () => {
    render(<GroupCoopQuestPanel members={[
      member('a', '민수', 7200, 100),
      member('b', '지수', 7200, 100),
    ]} />);
    expect(screen.getByText('🏆 이번 주 우리 그룹 미션 COMPLETE!')).toBeInTheDocument();
  });

  it('이번 주 MVP와 기여 점수를 보여준다', () => {
    render(<GroupCoopQuestPanel members={[
      member('a', '민수', 9000, 100),
      member('b', '지수', 1800, 50),
    ]} />);
    expect(screen.getByText('🔥 이번 주 MVP')).toBeInTheDocument();
    expect(screen.getByText('민수')).toBeInTheDocument();
    expect(screen.getByText('기여도 8점')).toBeInTheDocument();
  });

  it('기여자가 없으면 첫 기여 대기 문구를 보여준다', () => {
    render(<GroupCoopQuestPanel members={[member('a', '민수', 0, 0)]} />);
    expect(screen.getByText('이번 주 첫 기여자를 기다리고 있어요')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run component test and verify RED**

Run:

```bash
npm test -- src/screens/group/GroupCoopQuestPanel.test.tsx
```

Expected: FAIL because `GroupCoopQuestPanel` does not exist yet.

- [ ] **Step 3: Implement the minimal panel**

Create `src/screens/group/GroupCoopQuestPanel.tsx` with one reusable row helper and no local state:

```tsx
import type { GroupMemberSummary } from '../../group/groupTypes';
import { buildGroupQuestView, type GroupQuestProgress } from '../../group/groupQuestSelectors';

function QuestRow({ title, progress, unit }: { title: string; progress: GroupQuestProgress; unit: '명' | '분' }) {
  return (
    <div className={`group-quest-row ${progress.completed ? 'is-complete' : ''}`}>
      <div className="group-quest-row__copy">
        <strong>{title}</strong>
        <span>{progress.current} / {progress.target}{unit}</span>
      </div>
      <div className="group-quest-progress" aria-label={`${title} 진행률 ${Math.round(progress.progressPercent)}%`}>
        <i style={{ width: `${progress.progressPercent}%` }} />
      </div>
    </div>
  );
}

export function GroupCoopQuestPanel({ members }: { members: GroupMemberSummary[] }) {
  const view = buildGroupQuestView(members);
  return (
    <section className={`group-quest-panel ${view.allCompleted ? 'is-complete' : ''}`} aria-labelledby="group-quest-title">
      <div className="group-quest-panel__heading">
        <div>
          <span>WEEKLY CO-OP</span>
          <h3 id="group-quest-title">{view.allCompleted ? '🏆 이번 주 우리 그룹 미션 COMPLETE!' : '이번 주 공동 퀘스트'}</h3>
        </div>
        <b>{[view.attendance, view.time, view.goal].filter((quest) => quest.completed).length}/3</b>
      </div>

      <div className="group-quest-list">
        <QuestRow title="👟 모두의 출석" progress={view.attendance} unit="명" />
        <QuestRow title="⏱️ 함께 채운 시간" progress={view.time} unit="분" />
        <QuestRow title="🎯 각자의 목표, 하나의 팀" progress={view.goal} unit="명" />
      </div>

      <div className="group-quest-mvp">
        <span>🔥 이번 주 MVP</span>
        {view.mvp ? (
          <div><strong>{view.mvp.member.nickname}</strong><b>기여도 {view.mvp.score}점</b></div>
        ) : (
          <p>이번 주 첫 기여자를 기다리고 있어요</p>
        )}
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Add panel styles following existing group visual language**

Append focused selectors to `src/screens/group/GroupScreens.css`:

```css
.group-quest-panel{display:flex;flex-direction:column;gap:12px;padding:16px;border:1px solid #e4d8f4;border-radius:22px;background:rgba(255,255,255,.96);box-shadow:0 10px 24px rgba(90,60,130,.08)}
.group-quest-panel.is-complete{border-color:#e2c66e;background:linear-gradient(180deg,#fffaf0,#fff)}
.group-quest-panel__heading{display:flex;justify-content:space-between;gap:12px;align-items:center}
.group-quest-panel__heading span{font-size:9px;font-weight:900;letter-spacing:.15em;color:#8b5ed7}
.group-quest-panel__heading h3{margin:3px 0 0;font-size:17px;color:#34204f}
.group-quest-panel__heading b{display:grid;place-items:center;min-width:42px;height:32px;border-radius:999px;background:#efe8fb;color:#6743b8;font-size:12px}
.group-quest-list{display:flex;flex-direction:column;gap:9px}
.group-quest-row{padding:11px 12px;border:1px solid #eee5f8;border-radius:15px;background:#fbf9ff}
.group-quest-row.is-complete{border-color:#d9e8c2;background:#fbfff6}
.group-quest-row__copy{display:flex;justify-content:space-between;gap:10px;align-items:center;margin-bottom:7px}
.group-quest-row__copy strong{font-size:13px;color:#392653}
.group-quest-row__copy span{font-size:11px;font-weight:900;color:#7658a4;white-space:nowrap}
.group-quest-progress{height:7px;border-radius:999px;background:#e9e2f1;overflow:hidden}
.group-quest-progress i{display:block;height:100%;border-radius:999px;background:linear-gradient(90deg,#9d82e8,#6f49d8);transition:width .25s ease}
.group-quest-row.is-complete .group-quest-progress i{background:linear-gradient(90deg,#9fc96d,#68ad63)}
.group-quest-mvp{padding:12px 13px;border-radius:16px;background:#f7f2ff}
.group-quest-mvp>span{font-size:10px;font-weight:900;color:#7d60aa}
.group-quest-mvp>div{display:flex;justify-content:space-between;gap:10px;align-items:center;margin-top:4px}
.group-quest-mvp strong{font-size:15px;color:#3e285b}
.group-quest-mvp b{font-size:12px;color:#6f49d8}
.group-quest-mvp p{margin:5px 0 0;font-size:12px;color:#867992}
```

- [ ] **Step 5: Run panel tests and selector tests**

Run:

```bash
npm test -- src/group/groupQuestSelectors.test.ts src/screens/group/GroupCoopQuestPanel.test.tsx
```

Expected: PASS.

---

### Task 3: Integrate panel into group detail without changing ranking

**Files:**
- Modify: `src/screens/group/GroupDetailScreen.tsx`
- Test: existing `src/screens/group/GroupMotivationPanel.test.tsx`

**Interfaces:**
- `GroupDetailScreen` passes only `detail.members` to `GroupCoopQuestPanel`.
- `GroupMotivationPanel` receives the same props as before and remains untouched.

- [ ] **Step 1: Add integration import and render position**

Modify `src/screens/group/GroupDetailScreen.tsx`:

```tsx
import { GroupCoopQuestPanel } from './GroupCoopQuestPanel';
```

Render it immediately before `GroupMotivationPanel`:

```tsx
<GroupCoopQuestPanel members={detail.members} />
<GroupMotivationPanel
  members={detail.members}
  currentUserId={user?.id}
  onSelectMember={setSelected}
  onRemoveMember={(member) => void remove(member)}
  canRemoveMembers={mine}
/>
```

Do not change `loadGroupDetail`, polling, member removal, leave behavior, active count, invite code, or ranking props.

- [ ] **Step 2: Run targeted group regression tests**

Run:

```bash
npm test -- src/screens/group/GroupMotivationPanel.test.tsx src/group/groupQuestSelectors.test.ts src/screens/group/GroupCoopQuestPanel.test.tsx
```

Expected: PASS with existing ranking assertions unchanged.

- [ ] **Step 3: Type-check the integration**

Run:

```bash
npx tsc -b
```

Expected: exit code 0.

---

### Task 4: Full regression and release verification

**Files:**
- No production file changes unless verification exposes a defect attributable to this feature.

- [ ] **Step 1: Run full test suite**

```bash
npm test
```

Expected: all test files and tests pass.

- [ ] **Step 2: Run TypeScript build check**

```bash
npx tsc -b
```

Expected: exit code 0.

- [ ] **Step 3: Run production build**

```bash
npx vite build
```

Expected: exit code 0. Existing bundle-size warning is acceptable if unchanged and no new build error appears.

- [ ] **Step 4: Run lint**

```bash
npm run lint
```

Expected: 0 errors. Existing warnings are acceptable only if they predate this feature; no new warnings from touched files.

- [ ] **Step 5: Review final branch diff**

Compare `feature/pr-insights-20260819...feature/group-coop-quests-20260821` and confirm only these intended paths changed:

- `docs/superpowers/specs/2026-08-21-group-coop-quests-design.md`
- `docs/superpowers/plans/2026-08-21-group-coop-quests.md`
- `src/group/groupQuestSelectors.ts`
- `src/group/groupQuestSelectors.test.ts`
- `src/screens/group/GroupCoopQuestPanel.tsx`
- `src/screens/group/GroupCoopQuestPanel.test.tsx`
- `src/screens/group/GroupDetailScreen.tsx`
- `src/screens/group/GroupScreens.css`

No `groupApi.ts`, migration, game-save, reward, XP, or ranking-selector changes are expected.
