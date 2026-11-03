import type { KanjiDeck, KanjiItem } from "../../data/kanjiDecks";
import { useKanjiQuiz, type KanjiQuizMode } from "../../hooks/useKanjiQuiz";
import { useKeyboardShortcuts } from "../../hooks/useKeyboardShortcuts";
import { enumCodec, usePersistentState } from "../../hooks/usePersistentState";
import { trackEvent } from "../../utils/gtm";
import { HAN_VIET_SOURCE } from "../../utils/hanViet";
import { toPercent } from "../../utils/quizEngine";
import OptionButton from "../ui/OptionButton";
import ProgressCard from "../ui/ProgressCard";
import ResultPanel from "../ui/ResultPanel";
import { getOptionState } from "../ui/helpers";

const MODES = [
  { id: "han_viet", label: "🈶 Kanji → Hán Việt", hint: "Nhìn chữ Kanji, chọn âm Hán Việt" },
  { id: "kanji", label: "🔤 Hán Việt → Kanji", hint: "Nhìn âm Hán Việt, chọn chữ Kanji" },
] as const;

const modeCodec = enumCodec<KanjiQuizMode>(MODES.map((m) => m.id));

interface KanjiPracticeProps {
  deck: KanjiDeck;
  /** Keyboard shortcuts are listened to. */
  active: boolean;
}

/** Kanji, Hán Việt and meaning of a kanji, with words of the vocabulary written with it. */
function KanjiAnswer({ deck, item }: { deck: KanjiDeck; item: KanjiItem }) {
  const examples = deck.examplesOf(item);
  return (
    <>
      <p className="feedback-text">
        <strong lang="ja">{item.kanji}</strong> = <strong>{item.han_viet}</strong>
        {item.meaning && ` · ${item.meaning}`}
      </p>
      {examples.length > 0 && (
        <div className="companions">
          <span className="companions-title">📖 Từ vựng có chữ này</span>
          <ul className="companion-list">
            {examples.map((word) => (
              <li key={`${word.stt}-${word.kanji}`} className="companion">
                <span className="companion-word" lang="ja">
                  {word.kanji}
                </span>
                <span lang="ja">{word.hiragana}</span>
                {word.han_viet && <span className="badge tone-warning">{word.han_viet}</span>}
                <span>{word.meaning}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}

/** Multiple-choice quiz over the single kanji of a level: their Hán Việt, or the kanji of a Hán Việt. */
export default function KanjiPractice({ deck, active }: KanjiPracticeProps) {
  const [savedMode, setSavedMode] = usePersistentState<KanjiQuizMode>(`mimikara_kanji_mode_${deck.id}`, "han_viet", modeCodec);
  const quiz = useKanjiQuiz(deck, savedMode);
  const { question, selectedIndex, isAnswered } = quiz;
  const asksKanji = quiz.mode === "kanji";

  const selectMode = (mode: KanjiQuizMode) => {
    setSavedMode(mode);
    quiz.selectMode(mode);
    trackEvent("kanji_mode", { level: deck.level, mode });
  };

  useKeyboardShortcuts(active, (e) => {
    const isConfirm = e.key === "Enter" || e.key === " ";
    if (quiz.isRoundComplete) {
      if (isConfirm) {
        e.preventDefault();
        quiz.nextRound();
      }
      return;
    }
    if (!isAnswered) {
      if (["1", "2", "3", "4"].includes(e.key)) {
        e.preventDefault();
        quiz.answer(Number(e.key) - 1);
      }
      return;
    }
    if (isConfirm) {
      e.preventDefault();
      quiz.next();
    }
  });

  const { total, mastered, retry, pendingNew } = quiz.progress;
  const accuracy = toPercent(quiz.correctCount, quiz.correctCount + quiz.wrongCount);
  const selectId = `kanji-batch-${deck.id}`;

  return (
    <>
      <div className="mode-switch" role="group" aria-label="Cách hỏi Kanji">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            className={`mode-btn ${quiz.mode === m.id ? "is-active" : ""}`}
            aria-pressed={quiz.mode === m.id}
            onClick={() => selectMode(m.id)}
          >
            <span className="mode-label">{m.label}</span>
            <span className="mode-hint">{m.hint}</span>
          </button>
        ))}
      </div>

      <section className="card toolbar">
        <div className="toolbar-row">
          <label htmlFor={selectId} className="field-label">
            Chọn bài
          </label>
          <select id={selectId} className="select" value={quiz.batchKey} onChange={(e) => quiz.selectBatch(e.target.value)}>
            {deck.batches.map((batch) => (
              <option key={batch.key} value={batch.key}>
                {batch.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="btn btn--secondary btn--icon"
            onClick={() => quiz.selectBatch(quiz.batchKey)}
            title="Làm lại bài này từ đầu"
            aria-label="Làm lại bài Kanji này"
          >
            🔄
          </button>
        </div>
      </section>

      <ProgressCard
        eyebrow={`Lượt ${quiz.round} · Kanji ${deck.level}`}
        title={deck.getBatch(quiz.batchKey).title}
        count={
          <>
            <strong>{mastered}</strong> / {total} chữ ({toPercent(mastered, total)}%)
          </>
        }
        total={total}
        segments={[
          { tone: "success", label: "Đã đúng", value: mastered },
          { tone: "warning", label: "Cần làm lại", value: retry },
          { tone: "primary", label: "Chưa làm", value: pendingNew },
        ]}
      />

      {question ? (
        <section className="card question-card">
          <div className="question-head">
            <div className="badge-row">
              <span className="badge tone-primary">#{question.item.stt}</span>
              {question.isRetry && <span className="badge tone-warning">↩ Câu hỏi ôn tập lại</span>}
            </div>
            <span className="eyebrow">{asksKanji ? "Chọn chữ Kanji đúng" : "Chọn âm Hán Việt đúng"}</span>
          </div>

          <div className="word-hero">
            {asksKanji ? (
              <div className="word-main">{question.item.han_viet}</div>
            ) : (
              <div className="word-main kanji-main" lang="ja">
                {question.item.kanji}
              </div>
            )}
          </div>

          <div className={`options ${asksKanji ? "options--grid options--kanji" : "options--stacked"}`}>
            {question.options.map((option, idx) => (
              <OptionButton
                key={idx}
                index={idx}
                label={option}
                lang={asksKanji ? "ja" : undefined}
                state={getOptionState({ isSelected: selectedIndex === idx, isAnswer: option === question.answer, revealed: isAnswered })}
                disabled={isAnswered}
                onSelect={() => quiz.answer(idx)}
              />
            ))}
          </div>

          {isAnswered && (
            <div className={`feedback tone-${quiz.isCorrect ? "success" : "danger"}`}>
              <div className="feedback-body">
                <div className="feedback-title">
                  <span>{quiz.isCorrect ? "✅ Chính xác!" : "❌ Chưa chính xác!"}</span>
                </div>
                <KanjiAnswer deck={deck} item={question.item} />
              </div>
              <button type="button" className="btn btn--primary" onClick={quiz.next}>
                Câu tiếp theo <kbd>Space / Enter ↵</kbd>
              </button>
            </div>
          )}
        </section>
      ) : (
        <ResultPanel
          icon="🎉"
          title="Hoàn thành lượt Kanji!"
          description="Mọi chữ trong lượt này (kể cả các chữ từng làm sai) đều đã được trả lời đúng."
          metrics={[
            { label: "Lượt trả lời đúng", value: quiz.correctCount, tone: "success" },
            { label: "Lượt trả lời sai", value: quiz.wrongCount, tone: "danger" },
            { label: "Tỉ lệ chính xác", value: `${accuracy}%`, tone: "primary" },
          ]}
          actions={
            <button type="button" className="btn btn--primary" onClick={quiz.nextRound}>
              🔄 Bắt đầu lượt mới
            </button>
          }
        >
          {quiz.wrongItems.length > 0 && (
            <div className="result-section">
              <h3 className="result-section-title">📝 Các chữ đã làm sai trong lượt này ({quiz.wrongItems.length} chữ)</h3>
              <ul className="kanji-list">
                {quiz.wrongItems.map((item) => (
                  <li key={item.kanji}>
                    <span className="kanji-list-char" lang="ja">
                      {item.kanji}
                    </span>
                    <span className="badge tone-warning">{item.han_viet}</span>
                    {item.meaning && <span className="muted">{item.meaning}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </ResultPanel>
      )}

      <p className="hint">
        Phím tắt: <kbd>1</kbd>–<kbd>4</kbd> chọn đáp án · <kbd>Space</kbd>/<kbd>Enter</kbd> câu tiếp theo
        <br />
        Nguồn Kanji: {deck.source}
        {deck.id === "n2" && ` · Âm Hán Việt: theo Kanji N3 của kohi.vn, các chữ khác theo ${HAN_VIET_SOURCE}`}
      </p>
    </>
  );
}
