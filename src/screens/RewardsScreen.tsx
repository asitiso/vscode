import { useMemo, useState } from 'react';
import './RewardsScreen.css';
import './RewardsReport.css';
import { useGame } from '../store/GameContext';
import { PlaceholderArt } from '../components/PlaceholderArt';
import { CARDS_BY_ID } from '../data/cards';
import { EXERCISES_BY_ID } from '../data/exercises';
import { getLocalDateKey } from '../game/cardSets';
import { STAR_THRESHOLDS, pickDisplayIllustration } from '../types';
import type { FeelingTag } from '../types';
import { WorkoutReportPanel } from './WorkoutReportPanel';
import { ExerciseAnalysisScreen } from './ExerciseAnalysisScreen';

type RewardsTab = 'today' | 'report' | 'streak';
const FEELING_LABELS: Record<FeelingTag, string> = { easy:'가볍게 완료했어요', moderate:'적당히 힘들었어요', hard:'정말 힘들었어요', 'personal-best':'개인 기록을 경신했어요', 'good-condition':'컨디션이 좋았어요', 'bad-condition':'컨디션이 좋지 않았어요', 'completed-anyway':'그래도 운동을 완료했어요' };
const RARITY_LABELS = { common:'일반', rare:'레어', 'super-rare':'슈퍼 레어', legendary:'레전드' } as const;
function getNextGrowthLabel(count:number, starLevel:number):string { if(starLevel>=4) return '최대 성장 완료'; const nextStar=(starLevel+1) as 2|3|4; return `${nextStar}성까지 ${Math.max(0,STAR_THRESHOLDS[nextStar]-count)}장 남음`; }

export function RewardsScreen(){
  const { state, weeklyProgress }=useGame();
  const [activeTab,setActiveTab]=useState<RewardsTab>('today');
  const [selectedExerciseId,setSelectedExerciseId]=useState<string|null>(null);
  const today=getLocalDateKey();
  const todayLogs=useMemo(()=>state.workoutLogs.filter((log)=>log.date===today),[state.workoutLogs,today]);
  const todayEntries=todayLogs.flatMap((log)=>log.entries);
  const exerciseCount=new Set(todayEntries.map((entry)=>entry.exerciseId)).size;
  const totalMinutes=todayEntries.reduce((sum,entry)=>sum+(entry.durationMinutes??0),0);
  const totalSets=todayEntries.reduce((sum,entry)=>sum+(entry.sets??0),0);
  const totalReps=todayEntries.reduce((sum,entry)=>sum+(entry.reps??0)*Math.max(1,entry.sets??1),0);
  const latestLog=todayLogs.at(-1);
  const mostActiveExercise=todayEntries.reduce<Record<string,number>>((counts,entry)=>{counts[entry.exerciseId]=(counts[entry.exerciseId]??0)+(entry.sets??entry.durationMinutes??1);return counts;},{});
  const topExerciseId=Object.entries(mostActiveExercise).sort((a,b)=>b[1]-a[1])[0]?.[0];
  const topExerciseName=topExerciseId?todayEntries.find((entry)=>entry.exerciseId===topExerciseId)?.exerciseName??EXERCISES_BY_ID[topExerciseId]?.name:null;
  const todayCards=state.grantedPacks.filter((pack)=>pack.openedAt?.slice(0,10)===today&&pack.resultCardId).sort((a,b)=>(b.openedAt??'').localeCompare(a.openedAt??'')).map((pack)=>{const card=pack.resultCardId?CARDS_BY_ID[pack.resultCardId]:undefined;const owned=card?state.ownedCards[card.id]:undefined;return card&&owned?{pack,card,owned}:null;}).filter((item):item is NonNullable<typeof item>=>Boolean(item));
  const rewards=[{id:'r1',name:'특별 카드 테두리',locked:weeklyProgress.streak<1},{id:'r2',name:'홈 화면 배경',locked:weeklyProgress.streak<2},{id:'r3',name:'프로필 배지',locked:weeklyProgress.streak<4},{id:'r4',name:'카드 뒷면 디자인',locked:weeklyProgress.streak<8}];

  return <div className="rewards-screen">
    {!selectedExerciseId&&<><header className="rewards-screen__header"><p className="rewards-screen__eyebrow">ACTIVITY & REWARD</p><h1 className="rewards-screen__title">보상</h1><p className="rewards-screen__desc">오늘의 운동, 과거 기록과 연속 보상을 확인해요.</p></header><div className="rewards-tabs" role="tablist" aria-label="보상 화면 탭"><button type="button" role="tab" aria-selected={activeTab==='today'} className={activeTab==='today'?'is-active':''} onClick={()=>setActiveTab('today')}>오늘 활동</button><button type="button" role="tab" aria-selected={activeTab==='report'} className={activeTab==='report'?'is-active':''} onClick={()=>setActiveTab('report')}>운동 리포트</button><button type="button" role="tab" aria-selected={activeTab==='streak'} className={activeTab==='streak'?'is-active':''} onClick={()=>setActiveTab('streak')}>연속 보상</button></div></>}
    {selectedExerciseId?<ExerciseAnalysisScreen exerciseId={selectedExerciseId} workoutLogs={state.workoutLogs} onBack={()=>setSelectedExerciseId(null)}/>:<>
      {activeTab==='today'&&<div className="rewards-today" role="tabpanel"><section className="today-summary-card"><div className="today-summary-card__heading"><div><span>오늘 운동 요약</span><strong>{todayLogs.length>0?'오늘도 멋지게 완료했어요!':'아직 기록된 운동이 없어요'}</strong></div><span className="today-summary-card__badge">{todayLogs.length}회</span></div><div className="today-stat-grid"><div><strong>{exerciseCount}</strong><span>운동 종목</span></div><div><strong>{totalMinutes||totalSets}</strong><span>{totalMinutes>0?'운동 시간(분)':'총 세트'}</span></div><div><strong>{totalReps}</strong><span>총 반복</span></div></div>{latestLog&&<div className="today-highlight"><span>{latestLog.feeling==='personal-best'?'🏆':'💪'}</span><div><strong>{FEELING_LABELS[latestLog.feeling]}</strong><p>{topExerciseName?`${topExerciseName}을(를) 가장 집중해서 운동했어요.`:'오늘의 운동 기록이 저장됐어요.'}</p></div></div>}</section><section className="today-reward-section"><div className="today-section-heading"><div><span>오늘의 보상</span><strong>오늘 획득한 카드</strong></div><span>{todayCards.length}장</span></div>{todayCards.length>0?<div className="today-card-strip">{todayCards.map(({pack,card,owned})=><article key={pack.id} className={`today-reward-card today-reward-card--${card.rarity}`}><div className="today-reward-card__image"><PlaceholderArt assetName={pickDisplayIllustration(card,owned.starLevel)} emoji="🃏" label={card.name}/><span className="today-reward-card__status">{owned.count===1?'NEW':'POWER UP'}</span></div><div className="today-reward-card__body"><span className="today-reward-card__rarity">{RARITY_LABELS[card.rarity]}</span><h2>{card.name}</h2><p>{'★'.repeat(owned.starLevel)} · 총 {owned.count}장</p><div className="today-reward-card__growth"><span>{getNextGrowthLabel(owned.count,owned.starLevel)}</span></div></div></article>)}</div>:<div className="today-empty-card"><span>🎁</span><strong>오늘 획득한 카드가 아직 없어요</strong><p>운동을 기록하고 카드팩을 열면 여기에 보상이 모여요.</p></div>}</section></div>}
      {activeTab==='report'&&<div className="rewards-report" role="tabpanel"><WorkoutReportPanel workoutLogs={state.workoutLogs} onSelectExercise={setSelectedExerciseId}/></div>}
      {activeTab==='streak'&&<div className="rewards-list" role="tabpanel"><div className="streak-summary"><span>현재 연속 기록</span><strong>{weeklyProgress.streak}주 연속</strong><p>주간 목표를 달성할수록 새로운 꾸미기 보상이 열려요.</p></div>{rewards.map((reward)=><div key={reward.id} className={`rewards-item ${reward.locked?'rewards-item--locked':''}`}><span className="rewards-item__icon">{reward.locked?'🔒':'🎁'}</span><span>{reward.name}</span></div>)}</div>}
    </>}
  </div>;
}
