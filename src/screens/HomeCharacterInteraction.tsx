import { useEffect, useRef, useState } from 'react';
import './HomeCharacterInteraction.css';
import { PlaceholderArt } from '../components/PlaceholderArt';
import {
  selectCharacterDialogue,
  selectCharacterReaction,
  type CharacterDialogueContext,
  type CharacterReaction,
} from '../game/characterDialogue';

interface HomeCharacterInteractionProps {
  assetName: string;
  dialogueContext: CharacterDialogueContext;
}

export function HomeCharacterInteraction({
  assetName,
  dialogueContext,
}: HomeCharacterInteractionProps) {
  const [message, setMessage] = useState<string | null>(null);
  const [reaction, setReaction] = useState<CharacterReaction | null>(null);
  const [interactionId, setInteractionId] = useState(0);
  const previousMessageRef = useRef<string | undefined>(undefined);
  const previousReactionRef = useRef<CharacterReaction | undefined>(undefined);
  const closeTimerRef = useRef<number | null>(null);
  const reactionTimerRef = useRef<number | null>(null);

  function clearTimers() {
    if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current);
    if (reactionTimerRef.current !== null) window.clearTimeout(reactionTimerRef.current);
    closeTimerRef.current = null;
    reactionTimerRef.current = null;
  }

  useEffect(() => clearTimers, []);

  function closeMessage() {
    if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current);
    closeTimerRef.current = null;
    setMessage(null);
  }

  function handleCharacterActivate() {
    clearTimers();

    const nextMessage = selectCharacterDialogue(dialogueContext, previousMessageRef.current);
    const nextReaction = selectCharacterReaction(previousReactionRef.current);

    previousMessageRef.current = nextMessage;
    previousReactionRef.current = nextReaction;
    setMessage(nextMessage);
    setReaction(nextReaction);
    setInteractionId((current) => current + 1);

    reactionTimerRef.current = window.setTimeout(() => {
      reactionTimerRef.current = null;
      setReaction(null);
    }, 700);

    closeTimerRef.current = window.setTimeout(() => {
      closeTimerRef.current = null;
      setMessage(null);
    }, 3000);
  }

  return (
    <div className="home-character">
      {message && (
        <button
          type="button"
          className="home-character__speech"
          onClick={closeMessage}
          role="status"
          aria-live="polite"
          aria-label={`대화 닫기: ${message}`}
        >
          {message}
        </button>
      )}

      <button
        key={interactionId}
        type="button"
        className={`home-character__button${reaction ? ` home-character__button--${reaction}` : ''}`}
        onClick={handleCharacterActivate}
        aria-label="캐릭터와 대화하기"
      >
        <PlaceholderArt assetName={assetName} emoji="🏃" label="오늘의 캐릭터" />
      </button>
    </div>
  );
}
