export interface GroupDailyParticipation {
  date: string;
  participantCount: number;
}

export interface GroupTeamStreakDay {
  date: string;
  label: string;
  participantCount: number;
  completed: boolean;
  isFuture: boolean;
}

export interface GroupTeamStreakView {
  target: number;
  days: GroupTeamStreakDay[];
  streakDays: number;
  todayNeeded: number;
  todayCompleted: boolean;
}

interface GroupTeamStreakInput {
  memberCount: number;
  today: string;
  dailyParticipation: GroupDailyParticipation[];
}

const DAY_LABELS = ['월', '화', '수', '목', '금', '토', '일'];

function parseDateKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function dateKey(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(date: Date, amount: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + amount);
  return next;
}

function mondayOf(date: Date): Date {
  const weekday = date.getUTCDay();
  const delta = weekday === 0 ? -6 : 1 - weekday;
  return addDays(date, delta);
}

export function buildGroupTeamStreakView({ memberCount, today, dailyParticipation }: GroupTeamStreakInput): GroupTeamStreakView {
  const safeMemberCount = Number.isFinite(memberCount) ? Math.max(0, Math.floor(memberCount)) : 0;
  const target = safeMemberCount > 0 ? Math.ceil(safeMemberCount * 0.5) : 0;
  const todayDate = parseDateKey(today);
  const monday = mondayOf(todayDate);
  const countByDate = new Map<string, number>();

  for (const entry of dailyParticipation) {
    const count = Number.isFinite(entry.participantCount) ? Math.max(0, Math.floor(entry.participantCount)) : 0;
    countByDate.set(entry.date, count);
  }

  const days = DAY_LABELS.map((label, index) => {
    const date = dateKey(addDays(monday, index));
    const participantCount = countByDate.get(date) ?? 0;
    const isFuture = date > today;
    return {
      date,
      label,
      participantCount,
      isFuture,
      completed: target > 0 && !isFuture && participantCount >= target,
    };
  });

  const todayIndex = days.findIndex((day) => day.date === today);
  const todayDay = days[todayIndex];
  const todayCompleted = Boolean(todayDay?.completed);
  const todayNeeded = target > 0 && todayDay ? Math.max(0, target - todayDay.participantCount) : 0;

  let streakDays = 0;
  let index = todayCompleted ? todayIndex : todayIndex - 1;
  while (index >= 0 && days[index].completed) {
    streakDays += 1;
    index -= 1;
  }

  return { target, days, streakDays, todayNeeded, todayCompleted };
}
