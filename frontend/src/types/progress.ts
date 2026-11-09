import type { SrsCard } from "../utils/srs";

export type DeckId = "n5" | "n4" | "n3" | "n2";
/** Progress of the single kanji of a level ("n3Kanji"), saved apart from the progress of its words. */
export type KanjiProgressId = `${DeckId}Kanji`;
/** A deck of progress saved on the server: the words of a level or its single kanji. */
export type ProgressDeckId = DeckId | KanjiProgressId;

/** "u": a word to review (chưa nhớ), "k": a remembered word (đã nhớ). */
export type WordStatus = "u" | "k";

/** Status of a word and when it last changed (epoch ms): copies from several devices merge by that time. */
export interface WordEntry {
  s: WordStatus;
  t: number;
}

/** Flashcard progress of a word and when it was last graded (epoch ms). */
export interface CardEntry extends SrsCard {
  t: number;
}

/** Progress of a learner in a deck, keyed by the `getItemKey` of its words or `kanjiKey` of its kanji ("stt_12"). */
export interface DeckProgress {
  words: Record<string, WordEntry>;
  cards: Record<string, CardEntry>;
}

export type Progress = Partial<Record<ProgressDeckId, DeckProgress>>;
