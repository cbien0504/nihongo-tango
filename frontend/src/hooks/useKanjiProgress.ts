import { useCallback, useMemo } from "react";
import { kanjiKey, type KanjiDeck, type KanjiItem } from "../data/kanjiDecks";
import type { WordStatus } from "../types/progress";
import { trackEvent } from "../utils/gtm";
import { kanjiProgressId } from "../utils/progress";
import { useDeckProgress, useProgressStore } from "./useProgress";

type MaybeItem = KanjiItem | null | undefined;

/**
 * Kanji of a level the learner has to review (`unremembered`, chưa nhớ) and has remembered (`known`, đã nhớ),
 * in the order they were marked. They are saved in the progress of the level's kanji ("n3Kanji"), apart
 * from its words. Like a word, a kanji is remembered only when the learner marks it so; a kanji answered
 * is to review until then, and a wrong answer marks it to review again. Kanji never answered are in
 * neither list.
 */
export function useKanjiProgress(deck: KanjiDeck) {
  const store = useProgressStore();
  const progressId = kanjiProgressId(deck.id);
  const { words: entries } = useDeckProgress(progressId);

  const { unremembered, known } = useMemo(() => {
    const lists = { u: [] as { t: number; item: KanjiItem }[], k: [] as { t: number; item: KanjiItem }[] };
    for (const [key, entry] of Object.entries(entries)) {
      const item = deck.itemByKey(key);
      if (item) lists[entry.s].push({ t: entry.t, item });
    }
    const ordered = (list: { t: number; item: KanjiItem }[]) => list.sort((a, b) => a.t - b.t).map(({ item }) => item);
    return { unremembered: ordered(lists.u), known: ordered(lists.k) };
  }, [deck, entries]);

  /** Status of a kanji; `undefined` while it was never marked. */
  const statusOf = useCallback(
    (item: MaybeItem): WordStatus | undefined => (item ? entries[kanjiKey(item)]?.s : undefined),
    [entries]
  );

  /** How many of these kanji are remembered (đã nhớ). */
  const countKnown = useCallback((items: KanjiItem[]) => items.filter((item) => statusOf(item) === "k").length, [statusOf]);

  /** Kanji to practice in a batch; `onlyUnlearned` leaves out the remembered ones but keeps the kanji never studied. */
  const batchItems = useCallback(
    (key: string, onlyUnlearned: boolean) => {
      const items = deck.getBatchItems(key, unremembered);
      return onlyUnlearned ? items.filter((item) => statusOf(item) !== "k") : items;
    },
    [deck, unremembered, statusOf]
  );

  const markUnremembered = useCallback(
    (item: MaybeItem) => {
      if (item && store.setWordStatus(progressId, kanjiKey(item), "u")) {
        trackEvent("kanji_mark_unremembered", { level: deck.level, kanji: item.kanji });
      }
    },
    [store, progressId, deck.level]
  );

  /** A kanji answered is to review, unless the learner already marked it. */
  const markStudied = useCallback(
    (item: MaybeItem) => {
      if (item && !store.getDeck(progressId).words[kanjiKey(item)]) markUnremembered(item);
    },
    [store, progressId, markUnremembered]
  );

  const markRemembered = useCallback(
    (item: MaybeItem) => {
      if (item && store.setWordStatus(progressId, kanjiKey(item), "k")) {
        trackEvent("kanji_mark_remembered", { level: deck.level, kanji: item.kanji });
      }
    },
    [store, progressId, deck.level]
  );

  return { unremembered, known, statusOf, countKnown, batchItems, markStudied, markUnremembered, markRemembered };
}

export type KanjiProgress = ReturnType<typeof useKanjiProgress>;
