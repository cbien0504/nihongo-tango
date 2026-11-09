import type { WordStatus } from "../../types/progress";

interface WordMarkButtonsProps {
  status: WordStatus | undefined;
  /** What is marked, in the button titles: "từ" (default) or "chữ" for a kanji. */
  noun?: string;
  onMarkUnremembered: () => void;
  onMarkRemembered: () => void;
}

/** Chưa nhớ / Đã nhớ buttons (keys C / D) of an answered word or kanji: only the learner marks it remembered. */
export default function WordMarkButtons({ status, noun = "từ", onMarkUnremembered, onMarkRemembered }: WordMarkButtonsProps) {
  return (
    <div className="feedback-actions">
      <span className="muted">Đánh dấu:</span>
      <button
        type="button"
        className={`btn btn--xs btn--secondary tone-danger ${status === "u" ? "is-active" : ""}`}
        aria-pressed={status === "u"}
        onClick={onMarkUnremembered}
        title={`Đánh dấu ${noun} là chưa nhớ (Phím C)`}
      >
        📌 Chưa nhớ (C)
      </button>
      <button
        type="button"
        className={`btn btn--xs btn--secondary tone-success ${status === "k" ? "is-active" : ""}`}
        aria-pressed={status === "k"}
        onClick={onMarkRemembered}
        title={`Đánh dấu ${noun} là đã nhớ (Phím D)`}
      >
        ✨ Đã nhớ (D)
      </button>
    </div>
  );
}
