import { createContext, useContext, useSyncExternalStore } from "react";
import type { DeckProgress, ProgressDeckId } from "../types/progress";
import type { ProgressStore, SyncStatus } from "../utils/progressStore";

/** The progress store of the logged-in learner (components/user/ProgressProvider). */
export const ProgressContext = createContext<ProgressStore | null>(null);

export function useProgressStore(): ProgressStore {
  const store = useContext(ProgressContext);
  if (!store) throw new Error("useProgressStore needs a ProgressProvider");
  return store;
}

/** Word (or kanji) statuses and flashcards of a deck; re-renders when they change. */
export function useDeckProgress(deck: ProgressDeckId): DeckProgress {
  const store = useProgressStore();
  return useSyncExternalStore(store.subscribe, () => store.getDeck(deck));
}

export function useSyncStatus(): SyncStatus {
  const store = useProgressStore();
  return useSyncExternalStore(store.subscribe, store.getStatus);
}
