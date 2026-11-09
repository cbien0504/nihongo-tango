import { useState } from "react";
import type { KanjiDeck, KanjiItem } from "../data/kanjiDecks";
import { QuizBuffer, shuffleArray } from "../utils/quizEngine";
import { trackEvent } from "../utils/gtm";

/** "han_viet": pick the Hán Việt of a kanji; "kanji": pick the kanji of a Hán Việt. */
export type KanjiQuizMode = "han_viet" | "kanji";

export interface KanjiQuestion {
  item: KanjiItem;
  options: string[];
  answer: string;
  /** Drawn from the retry queue (answered wrong earlier in this round). */
  isRetry: boolean;
}

const answerOf = (mode: KanjiQuizMode, item: KanjiItem) => (mode === "han_viet" ? item.han_viet : item.kanji);

/** Four options; kanji read like the asked one are left out, they would be right answers too. */
export const buildKanjiQuestion = (
  item: KanjiItem,
  mode: KanjiQuizMode,
  pool: KanjiItem[],
  isRetry = false
): KanjiQuestion => {
  const answer = answerOf(mode, item);
  const others = shuffleArray(pool.filter((other) => other.han_viet !== item.han_viet)).map((other) => answerOf(mode, other));
  const distractors = [...new Set(others)].slice(0, 3);
  return { item, options: shuffleArray([...distractors, answer]), answer, isRetry };
};

interface QuizState {
  mode: KanjiQuizMode;
  batchKey: string;
  items: KanjiItem[];
  /** Mutable queue of the current round; mutated only inside event handlers. */
  buffer: QuizBuffer;
  round: number;
  question: KanjiQuestion | null;
  selectedIndex: number | null;
  correctCount: number;
  wrongCount: number;
  wrongItems: KanjiItem[];
}

interface KanjiQuizOptions {
  /** Kanji to practice in a batch, e.g. without the remembered ones. */
  batchItems: (key: string) => KanjiItem[];
  onWrong?: (item: KanjiItem) => void;
}

/** Multiple-choice quiz over the kanji of a batch: wrong answers come back later in the round. */
export function useKanjiQuiz(deck: KanjiDeck, initialMode: KanjiQuizMode, { batchItems, onWrong }: KanjiQuizOptions) {
  const draw = (mode: KanjiQuizMode, buffer: QuizBuffer, items: KanjiItem[]): KanjiQuestion | null => {
    if (buffer.isRoundComplete()) return null;
    const isRetry = buffer.getPendingNewCount() === 0;
    const index = buffer.nextIndex();
    if (index === null) return null;
    // A short batch borrows its wrong options from the whole level.
    return buildKanjiQuestion(items[index], mode, items.length < 4 ? deck.items : items, isRetry);
  };

  const startRound = (mode: KanjiQuizMode, batchKey: string, round: number, items = batchItems(batchKey)): QuizState => {
    const buffer = new QuizBuffer(items.map((_, i) => i));
    return {
      mode,
      batchKey,
      items,
      buffer,
      round,
      question: draw(mode, buffer, items),
      selectedIndex: null,
      correctCount: 0,
      wrongCount: 0,
      wrongItems: [],
    };
  };

  const [state, setState] = useState<QuizState>(() => startRound(initialMode, deck.batches[1]?.key ?? "all", 1));
  const { mode, items, buffer, question, selectedIndex } = state;
  const isAnswered = question !== null && selectedIndex !== null;
  const isCorrect = isAnswered && question.options[selectedIndex] === question.answer;

  // The question on screen stays in its queue until it is answered.
  const pendingCurrent = question !== null && !isAnswered;
  const pendingNew = buffer.getPendingNewCount() + (pendingCurrent && !question.isRetry ? 1 : 0);
  const retry = buffer.getPendingRetryCount() + (pendingCurrent && question.isRetry ? 1 : 0);
  const total = items.length;

  /** `items` replaces the kanji of the batch, e.g. when the learner just changed its filter. */
  const selectBatch = (key: string, items?: KanjiItem[]) => {
    setState(startRound(mode, key, 1, items));
    trackEvent("kanji_batch", { level: deck.level, batchKey: key, mode });
  };

  /** Asks the other way round, from the start of the batch. */
  const selectMode = (next: KanjiQuizMode) => setState(startRound(next, state.batchKey, 1));

  const nextRound = () => setState(startRound(mode, state.batchKey, state.round + 1));

  const answer = (index: number) => {
    if (!question || isAnswered || index < 0 || index >= question.options.length) return;
    const correct = question.options[index] === question.answer;
    if (correct) {
      setState({ ...state, selectedIndex: index, correctCount: state.correctCount + 1 });
    } else {
      buffer.markWrong(items.indexOf(question.item));
      onWrong?.(question.item);
      const wrongItems = state.wrongItems.includes(question.item) ? state.wrongItems : [...state.wrongItems, question.item];
      setState({ ...state, selectedIndex: index, wrongCount: state.wrongCount + 1, wrongItems });
    }
    trackEvent("kanji_answer", { level: deck.level, mode, result: correct ? "correct" : "wrong", kanji: question.item.kanji });
  };

  const next = () => setState({ ...state, question: draw(mode, buffer, items), selectedIndex: null });

  return {
    mode,
    batchKey: state.batchKey,
    round: state.round,
    question,
    selectedIndex,
    isAnswered,
    isCorrect,
    isRoundComplete: question === null,
    correctCount: state.correctCount,
    wrongCount: state.wrongCount,
    wrongItems: state.wrongItems,
    progress: { total, pendingNew, retry, mastered: Math.max(0, total - pendingNew - retry) },
    selectBatch,
    selectMode,
    nextRound,
    answer,
    next,
  };
}

export type KanjiQuiz = ReturnType<typeof useKanjiQuiz>;
