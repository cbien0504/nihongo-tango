import kanjiN5Data from "./kanji_n5.json";
import kanjiN4Data from "./kanji_n4.json";
import kanjiN3Data from "./kanji_n3.json";
import kanjiN2Data from "./kanji_n2.json";
import type { DeckId } from "../types/progress";
import type { VocabItem } from "../types/quiz";
import { getHanViet } from "../utils/hanViet";
import { N2_DECK, N3_DECK, N4_DECK, N5_DECK, UNREMEMBERED_BATCH_KEY, type VocabDeck } from "./vocabDecks";

export interface KanjiItem {
  stt: number;
  kanji: string;
  han_viet: string;
  /** Vietnamese meaning; empty when the list has none (JLPTsensei lists N5, N4, N2 with English meanings). */
  meaning: string;
}

export interface KanjiBatch {
  key: string;
  title: string;
  label: string;
  items: KanjiItem[];
}

/** The single kanji of a JLPT level (scripts/crawl_kanji.py), practiced in its Kanji section. */
export interface KanjiDeck {
  id: DeckId;
  level: string;
  source: string;
  items: KanjiItem[];
  /** The kanji of a progress key (`kanjiKey`). */
  itemByKey: (key: string) => KanjiItem | undefined;
  /** Every kanji first, then lessons of KANJI_BATCH_SIZE kanji in the order of the list. */
  batches: KanjiBatch[];
  getBatch: (key: string) => KanjiBatch;
  /** Title of a batch, or of the kanji to review (UNREMEMBERED_BATCH_KEY). */
  getBatchTitle: (key: string) => string;
  /** Kanji to practice for a batch; the kanji to review are a snapshot of the current list. */
  getBatchItems: (key: string, unremembered: KanjiItem[]) => KanjiItem[];
  /** Words of the vocabulary decks written with the kanji, this level first. */
  examplesOf: (item: KanjiItem) => VocabItem[];
}

export const KANJI_BATCH_SIZE = 20;

/** Key of a kanji in the progress of its level's kanji ("n3Kanji"): "stt_12". */
export const kanjiKey = (item: KanjiItem) => `stt_${item.stt}`;
const MAX_EXAMPLES = 3;
const VOCAB_DECKS = [N5_DECK, N4_DECK, N3_DECK, N2_DECK];
// Context written in brackets is not part of a word: （お金を）下ろす is not an example of 金.
const ANNOTATION = /[（(][^）)]*[）)]/g;

const createKanjiDeck = (
  id: KanjiDeck["id"],
  level: string,
  source: string,
  items: KanjiItem[],
  vocab: VocabDeck
): KanjiDeck => {
  const all: KanjiBatch = { key: "all", title: `Tất cả Kanji ${level}`, label: `📚 Tất cả (${items.length} chữ Kanji ${level})`, items };
  const lessons: KanjiBatch[] = [];
  for (let start = 0; start < items.length; start += KANJI_BATCH_SIZE) {
    const batchItems = items.slice(start, start + KANJI_BATCH_SIZE);
    const number = lessons.length + 1;
    const preview = batchItems.slice(0, 5).map((item) => item.kanji).join("");
    lessons.push({
      key: `kanji_${number}`,
      title: `Kanji ${level} – Bài ${number}`,
      label: `Bài ${number}: ${preview}… (chữ ${start + 1}–${start + batchItems.length})`,
      items: batchItems,
    });
  }
  const batches = [all, ...lessons];
  const byKey = new Map(batches.map((batch) => [batch.key, batch]));
  const byProgressKey = new Map(items.map((item) => [kanjiKey(item), item]));
  const getBatch = (key: string) => byKey.get(key) ?? all;

  const decks = [vocab, ...VOCAB_DECKS.filter((deck) => deck !== vocab)];
  const examples = new Map<string, VocabItem[]>();
  const examplesOf = (item: KanjiItem) => {
    if (!examples.has(item.kanji)) {
      const seen = new Set<string>();
      const words = decks
        .flatMap((deck) =>
          deck.items
            .filter((word) => word.kanji.replace(ANNOTATION, "").includes(item.kanji))
            .sort((a, b) => a.kanji.length - b.kanji.length)
        )
        .filter((word) => !seen.has(word.kanji) && seen.add(word.kanji));
      examples.set(item.kanji, words.slice(0, MAX_EXAMPLES));
    }
    return examples.get(item.kanji)!;
  };

  return {
    id,
    level,
    source,
    items,
    itemByKey: (key) => byProgressKey.get(key),
    batches,
    getBatch,
    getBatchTitle: (key) => (key === UNREMEMBERED_BATCH_KEY ? `Kanji ${level} chưa nhớ` : getBatch(key).title),
    getBatchItems: (key, unremembered) => (key === UNREMEMBERED_BATCH_KEY ? unremembered : getBatch(key).items),
    examplesOf,
  };
};

const n3Items: KanjiItem[] = kanjiN3Data.kanji;
const n3Readings = new Map(n3Items.map((item) => [item.kanji, item.han_viet]));

// The lists of JLPTsensei have no Hán Việt: a kanji also listed in N3 keeps the reading it has
// there, the others are read from the kanji table.
const senseiItems = (list: { stt: number; kanji: string }[]): KanjiItem[] =>
  list.map(({ stt, kanji }) => ({ stt, kanji, han_viet: n3Readings.get(kanji) ?? getHanViet(kanji), meaning: "" }));

export const KANJI_N5_DECK = createKanjiDeck("n5", "N5", kanjiN5Data.source, senseiItems(kanjiN5Data.kanji), N5_DECK);
export const KANJI_N4_DECK = createKanjiDeck("n4", "N4", kanjiN4Data.source, senseiItems(kanjiN4Data.kanji), N4_DECK);
export const KANJI_N3_DECK = createKanjiDeck("n3", "N3", kanjiN3Data.source, n3Items, N3_DECK);
export const KANJI_N2_DECK = createKanjiDeck("n2", "N2", kanjiN2Data.source, senseiItems(kanjiN2Data.kanji), N2_DECK);
