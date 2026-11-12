import { useState } from "react";
import type { KanjiDeck, KanjiItem } from "../../data/kanjiDecks";
import { UNREMEMBERED_BATCH_KEY } from "../../data/vocabDecks";
import { useKanjiProgress } from "../../hooks/useKanjiProgress";
import { useKanjiQuiz, type KanjiQuizMode } from "../../hooks/useKanjiQuiz";
import { useKeyboardShortcuts } from "../../hooks/useKeyboardShortcuts";
import { booleanCodec, enumCodec, usePersistentState } from "../../hooks/usePersistentState";
import { trackEvent } from "../../utils/gtm";
import { toPercent } from "../../utils/quizEngine";
import OptionButton from "../ui/OptionButton";
import ProgressCard from "../ui/ProgressCard";
import ResultPanel from "../ui/ResultPanel";
import { getOptionState } from "../ui/helpers";
import WordMarkButtons from "../vocab/WordMarkButtons";
import KanjiListModal from "./KanjiListModal";

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

/**
 * Multiple-choice quiz over the single kanji of a level: their Hán Việt, or the kanji of a Hán Việt.
 * Like the vocabulary, every kanji is in the learner's Chưa nhớ list until the learner marks it
 * remembered (Đã nhớ), the kanji answered first; both lists are saved with the learner's progress.
 */
export default function KanjiPractice({ deck, active }: KanjiPracticeProps) {
  const [savedMode, setSavedMode] = usePersistentState<KanjiQuizMode>(`mimikara_kanji_mode_${deck.id}`, "han_viet", modeCodec);
  // Lessons and the whole list keep only the kanji not marked Đã nhớ yet.
  const [onlyUnlearned, setOnlyUnlearned] = usePersistentState(`mimikara_kanji_only_unlearned_${deck.id}`, false, booleanCodec);
  const [isListOpen, setIsListOpen] = useState(false);
  const kanjiProgress = useKanjiProgress(deck);
  const quiz = useKanjiQuiz(deck, savedMode, {
    batchItems: (key) => kanjiProgress.batchItems(key, onlyUnlearned),
    onAnswer: kanjiProgress.markStudied,
    onWrong: kanjiProgress.markUnremembered,
  });
  const { question, selectedIndex, isAnswered } = quiz;
  const asksKanji = quiz.mode === "kanji";
  const firstLesson = deck.batches[1] ?? deck.batches[0];
  const isReviewMode = quiz.batchKey === UNREMEMBERED_BATCH_KEY;
  const remainingToReview = kanjiProgress.unremembered.length;
  // Only the review list or a batch filtered to its unlearned kanji can be empty.
  const isEmpty = quiz.progress.total === 0;

  const selectMode = (mode: KanjiQuizMode) => {
    setSavedMode(mode);
    quiz.selectMode(mode);
    trackEvent("kanji_mode", { level: deck.level, mode });
  };

  const setUnlearnedFilter = (enabled: boolean) => {
    setOnlyUnlearned(enabled);
    quiz.selectBatch(quiz.batchKey, kanjiProgress.batchItems(quiz.batchKey, enabled));
    trackEvent("kanji_only_unlearned", { level: deck.level, enabled });
  };

  const reviewUnremembered = () => {
    setIsListOpen(false);
    quiz.selectBatch(UNREMEMBERED_BATCH_KEY);
  };

  // Single primary action of the round-complete screen, shared by its button and Enter/Space.
  const completeAction =
    isReviewMode && remainingToReview === 0
      ? { label: `📖 Quay lại luyện ${firstLesson.title}`, run: () => quiz.selectBatch(firstLesson.key) }
      : {
          label: isReviewMode ? `🔄 Tiếp tục ôn tập (${remainingToReview} chữ còn lại)` : "🔄 Bắt đầu lượt mới",
          run: quiz.nextRound,
        };

  useKeyboardShortcuts(active && !isListOpen && !isEmpty, (e) => {
    const key = e.key.toLowerCase();
    const isConfirm = e.key === "Enter" || e.key === " ";
    if (quiz.isRoundComplete) {
      if (isConfirm) {
        e.preventDefault();
        completeAction.run();
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
    } else if (key === "c") {
      e.preventDefault();
      kanjiProgress.markUnremembered(question?.item);
    } else if (key === "d") {
      e.preventDefault();
      kanjiProgress.markRemembered(question?.item);
    }
  });

  const { total, mastered, retry, pendingNew } = quiz.progress;
  const accuracy = toPercent(quiz.correctCount, quiz.correctCount + quiz.wrongCount);
  const selectId = `kanji-batch-${deck.id}`;
  const knownCount = kanjiProgress.known.length;

  let content;
  if (isEmpty && !isReviewMode) {
    content = (
      <ResultPanel
        icon="🎉"
        title="Bạn đã nhớ hết các chữ ở đây!"
        description="Mọi chữ Kanji của phần này đều đã được đánh dấu Đã nhớ. Hãy luyện lại cả phần, hoặc chọn bài khác còn chữ chưa thuộc."
        actions={
          <button type="button" className="btn btn--primary" onClick={() => setUnlearnedFilter(false)}>
            📖 Luyện lại cả phần
          </button>
        }
      />
    );
  } else if (isEmpty) {
    content = (
      <ResultPanel
        icon="🎉"
        title="Danh sách Kanji chưa nhớ hiện đang trống!"
        description={`Bạn đã đánh dấu Đã nhớ mọi chữ Kanji ${deck.level}. Bấm “Chưa nhớ” (phím C) sau khi trả lời để ôn lại một chữ.`}
        actions={
          <button type="button" className="btn btn--primary" onClick={() => quiz.selectBatch(firstLesson.key)}>
            📖 Luyện {firstLesson.title}
          </button>
        }
      />
    );
  } else if (question) {
    content = (
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
                {!quiz.isCorrect && <span className="muted"> (được ôn trước trong danh sách Chưa nhớ)</span>}
              </div>
              <KanjiAnswer deck={deck} item={question.item} />
              <WordMarkButtons
                status={kanjiProgress.statusOf(question.item)}
                noun="chữ"
                onMarkUnremembered={() => kanjiProgress.markUnremembered(question.item)}
                onMarkRemembered={() => kanjiProgress.markRemembered(question.item)}
              />
            </div>
            <button type="button" className="btn btn--primary" onClick={quiz.next}>
              Câu tiếp theo <kbd>Space / Enter ↵</kbd>
            </button>
          </div>
        )}
      </section>
    );
  } else {
    content = (
      <ResultPanel
        icon="🎉"
        title={
          isReviewMode
            ? remainingToReview === 0
              ? "Xuất sắc! Bạn đã thuộc hết các chữ trong danh sách Chưa nhớ!"
              : `Hoàn thành 1 lượt ôn tập! Hiện còn ${remainingToReview} chữ chưa nhớ.`
            : "Hoàn thành lượt Kanji!"
        }
        description={
          isReviewMode
            ? "Bấm “Đã nhớ” (phím D) sau khi trả lời để gỡ một chữ khỏi danh sách Chưa nhớ."
            : "Mọi chữ trong lượt này (kể cả các chữ từng làm sai) đều đã được trả lời đúng."
        }
        metrics={[
          { label: "Lượt trả lời đúng", value: quiz.correctCount, tone: "success" },
          { label: "Lượt trả lời sai", value: quiz.wrongCount, tone: "danger" },
          { label: "Tỉ lệ chính xác", value: `${accuracy}%`, tone: "primary" },
        ]}
        actions={
          <button type="button" className="btn btn--primary" onClick={completeAction.run}>
            {completeAction.label}
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
    );
  }

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
            <option value={UNREMEMBERED_BATCH_KEY}>📌 Ôn tập Kanji chưa nhớ ({remainingToReview} chữ)</option>
            {deck.batches.map((batch) => {
              const known = kanjiProgress.countKnown(batch.items);
              // A learned lesson is ticked, so the lessons left to learn stand out.
              const mark = batch.key !== "all" && known === batch.items.length ? "✅ " : "";
              return (
                <option key={batch.key} value={batch.key}>
                  {`${mark}${batch.label} · ${known}/${batch.items.length} đã nhớ`}
                </option>
              );
            })}
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
          <button
            type="button"
            className={`btn btn--sm btn--secondary tone-warning ${onlyUnlearned ? "is-active" : ""}`}
            aria-pressed={onlyUnlearned}
            onClick={() => setUnlearnedFilter(!onlyUnlearned)}
            title={
              onlyUnlearned
                ? "Đang chỉ luyện các chữ chưa đánh dấu Đã nhớ (gồm cả chữ chưa học). Nhấn để luyện cả bài"
                : "Chỉ luyện các chữ chưa đánh dấu Đã nhớ, gồm cả chữ chưa học"
            }
          >
            🎯 Chỉ chữ chưa thuộc: {onlyUnlearned ? "Bật" : "Tắt"}
          </button>
        </div>

        <div className="toolbar-row">
          <span className="toolbar-note">
            ✅ Đã nhớ <strong>{knownCount}</strong> / {deck.items.length} chữ Kanji {deck.level}
          </span>
          <button
            type="button"
            className="btn btn--sm btn--secondary tone-warning toolbar-end"
            onClick={() => setIsListOpen(true)}
            title="Xem, tìm kiếm và ôn tập các chữ Kanji chưa nhớ và đã nhớ"
            aria-label="Xem danh sách Kanji chưa nhớ"
          >
            📌 Kanji chưa nhớ <span className="count-pill">{remainingToReview}</span>
          </button>
        </div>
      </section>

      <ProgressCard
        eyebrow={`Lượt ${quiz.round} · Kanji ${deck.level}`}
        title={deck.getBatchTitle(quiz.batchKey)}
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

      {content}

      <p className="hint">
        Phím tắt: <kbd>1</kbd>–<kbd>4</kbd> chọn đáp án · <kbd>C</kbd> chưa nhớ / <kbd>D</kbd> đã nhớ · <kbd>Space</kbd>/
        <kbd>Enter</kbd> câu tiếp theo
        <br />
        Nguồn Kanji: {deck.source}
        {deck.hanVietSource && ` · Âm Hán Việt: ${deck.hanVietSource}`}
      </p>

      {isListOpen && (
        <KanjiListModal
          deck={deck}
          unremembered={kanjiProgress.unremembered}
          known={kanjiProgress.known}
          onClose={() => setIsListOpen(false)}
          onReview={reviewUnremembered}
          onMarkRemembered={kanjiProgress.markRemembered}
          onMarkUnremembered={kanjiProgress.markUnremembered}
        />
      )}
    </>
  );
}
