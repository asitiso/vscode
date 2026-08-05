export type CharacterDialogueContext = {
  hasUnopenedPack: boolean;
  remainingWeeklySessions: number;
  weeklyGoalComplete: boolean;
  todayLogged: boolean;
  streak: number;
};

export type CharacterDialogueGroup =
  | 'unopened-pack'
  | 'weekly-one-left'
  | 'weekly-complete'
  | 'today-complete'
  | 'streak'
  | 'before-workout'
  | 'fallback';

export type CharacterReaction = 'bounce' | 'wiggle' | 'wave' | 'jump' | 'double-pop';

const FALLBACK_MESSAGE = '오늘도 함께해 줘서 고마워!';

const DIALOGUES: Record<CharacterDialogueGroup, readonly string[]> = {
  'unopened-pack': [
    '저기 반짝이는 상자가 보여!',
    '새로운 카드가 기다리고 있어!',
    '보상 상자를 열어볼까?',
    '오늘의 선물을 확인해 봐!',
  ],
  'weekly-one-left': [
    '한 번만 더 하면 주간 목표 달성이야!',
    '거의 다 왔어! 마지막 한 번!',
    '이번 주 목표가 바로 앞이야!',
    '조금만 더 힘내면 특별 보상이야!',
  ],
  'weekly-complete': [
    '이번 주 목표를 완성했어!',
    '주간 미션 성공! 정말 대단해!',
    '꾸준함의 힘이 빛나고 있어!',
    '이번 주도 완벽하게 해냈네!',
  ],
  'today-complete': [
    '오늘도 해냈네! 정말 멋져!',
    '운동 완료! 내가 다 뿌듯해!',
    '오늘의 기록이 또 하나 쌓였어!',
    '꾸준히 하는 네가 최고야!',
  ],
  streak: [
    '연속 기록이 계속 자라고 있어!',
    '꾸준함이 최고의 능력이야!',
    '이번 주도 흐름이 아주 좋아!',
    '지금 페이스를 그대로 이어가자!',
  ],
  'before-workout': [
    '오늘은 어떤 운동을 해볼까?',
    '조금만 움직여도 충분해!',
    '준비되면 같이 시작하자!',
    '오늘의 첫 운동을 기다리고 있어!',
  ],
  fallback: [
    '오늘도 만나서 반가워!',
    '나는 항상 여기서 응원하고 있어!',
    '새로운 운동 카드를 모아보자!',
    '작은 기록도 멋진 성장이야!',
    '오늘은 어떤 일이 생길까?',
  ],
};

const REACTIONS: readonly CharacterReaction[] = ['bounce', 'wiggle', 'wave', 'jump', 'double-pop'];

export function resolveCharacterDialogueGroup(
  context: CharacterDialogueContext,
): CharacterDialogueGroup {
  if (context.hasUnopenedPack) return 'unopened-pack';
  if (context.remainingWeeklySessions === 1) return 'weekly-one-left';
  if (context.weeklyGoalComplete) return 'weekly-complete';
  if (context.todayLogged) return 'today-complete';
  if (context.streak >= 1) return 'streak';
  if (!context.todayLogged) return 'before-workout';
  return 'fallback';
}

function selectDifferentValue<T>(
  values: readonly T[],
  previous: T | undefined,
  random: () => number,
): T | undefined {
  const candidates = previous === undefined ? values : values.filter((value) => value !== previous);
  const pool = candidates.length > 0 ? candidates : values;
  if (pool.length === 0) return undefined;
  const index = Math.min(pool.length - 1, Math.floor(random() * pool.length));
  return pool[index];
}

export function selectCharacterDialogue(
  context: CharacterDialogueContext,
  previousMessage?: string,
  random: () => number = Math.random,
): string {
  const group = resolveCharacterDialogueGroup(context);
  return selectDifferentValue(DIALOGUES[group], previousMessage, random) ?? FALLBACK_MESSAGE;
}

export function selectCharacterReaction(
  previousReaction?: CharacterReaction,
  random: () => number = Math.random,
): CharacterReaction {
  return selectDifferentValue(REACTIONS, previousReaction, random) ?? 'bounce';
}
