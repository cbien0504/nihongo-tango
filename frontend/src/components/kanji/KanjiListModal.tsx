import { useMemo, useState } from "react";
import type { KanjiDeck, KanjiItem } from "../../data/kanjiDecks";
import { trackEvent } from "../../utils/gtm";
import Modal from "../ui/Modal";
import ShowMore from "../ui/ShowMore";
import { LIST_PAGE_SIZE } from "../ui/helpers";

const LISTS = {
  unremembered: {
    label: "📌 Chưa nhớ",
    title: "📋 Kanji chưa nhớ",
    search: "Tìm Kanji chưa nhớ",
    empty: "🎉 Danh sách Chưa nhớ hiện đang trống!",
    tone: "tone-warning",
  },
  known: {
    label: "✅ Đã nhớ",
    title: "✅ Kanji đã nhớ",
    search: "Tìm Kanji đã nhớ",
    empty: "Chưa có chữ nào: bấm “Đã nhớ” (phím D) sau khi trả lời để thêm chữ vào đây.",
    tone: "tone-success",
  },
} as const;

type ListId = keyof typeof LISTS;

interface KanjiListModalProps {
  deck: KanjiDeck;
  /** Kanji to review (chưa nhớ). */
  unremembered: KanjiItem[];
  /** Remembered kanji (đã nhớ). */
  known: KanjiItem[];
  onClose: () => void;
  onReview: () => void;
  onMarkRemembered: (item: KanjiItem) => void;
  onMarkUnremembered: (item: KanjiItem) => void;
}

const matchesQuery = (item: KanjiItem, q: string) =>
  [item.kanji, item.han_viet, item.meaning, String(item.stt)].some((field) => field.toLowerCase().includes(q));

const formatForClipboard = (items: KanjiItem[]) =>
  items
    .map((item, index) => `${index + 1}. [#${item.stt}] ${item.kanji} [Hán Việt: ${item.han_viet}]${item.meaning ? ` : ${item.meaning}` : ""}`)
    .join("\n");

/** The learner's kanji to review and remembered kanji of a level: search, copy, review, move between lists. */
export default function KanjiListModal({
  deck,
  unremembered,
  known,
  onClose,
  onReview,
  onMarkRemembered,
  onMarkUnremembered,
}: KanjiListModalProps) {
  const [list, setList] = useState<ListId>("unremembered");
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(LIST_PAGE_SIZE);
  const [copied, setCopied] = useState(false);
  const shown = list === "unremembered" ? unremembered : known;

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return q ? shown.filter((item) => matchesQuery(item, q)) : shown;
  }, [shown, query]);

  const copyList = () => {
    navigator.clipboard
      ?.writeText(formatForClipboard(shown))
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch((e) => console.error("Failed to copy the kanji list", e));
    trackEvent(list === "unremembered" ? "copy_unremembered_kanji" : "copy_known_kanji", { level: deck.level, count: shown.length });
  };

  return (
    <Modal
      title={`${LISTS[list].title} ${deck.level} (${shown.length} chữ)`}
      subtitle="Chữ đã trả lời mà chưa đánh dấu Đã nhớ đều là Chưa nhớ"
      onClose={onClose}
      toolbar={
        <>
          <div className="list-switch" role="group" aria-label="Danh sách Kanji">
            {(Object.keys(LISTS) as ListId[]).map((id) => (
              <button
                key={id}
                type="button"
                className={`btn btn--sm btn--secondary ${LISTS[id].tone} ${list === id ? "is-active" : ""}`}
                aria-pressed={list === id}
                onClick={() => {
                  setList(id);
                  setLimit(LIST_PAGE_SIZE);
                }}
              >
                {LISTS[id].label} <span className="count-pill">{(id === "unremembered" ? unremembered : known).length}</span>
              </button>
            ))}
          </div>
          <input
            type="search"
            className="input"
            placeholder="🔍 Tìm theo Kanji, Hán Việt hoặc nghĩa..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setLimit(LIST_PAGE_SIZE);
            }}
            aria-label={LISTS[list].search}
          />
          <button type="button" className="btn btn--sm btn--secondary" onClick={copyList} disabled={shown.length === 0}>
            {copied ? "✅ Đã sao chép!" : "📋 Sao chép danh sách"}
          </button>
        </>
      }
      footer={
        <>
          <span className="muted">
            Hiển thị: <strong>{Math.min(limit, filtered.length)}</strong> / {shown.length} chữ
          </span>
          <div className="modal-footer-actions">
            {list === "unremembered" && unremembered.length > 0 && (
              <button type="button" className="btn btn--sm btn--secondary tone-warning" onClick={onReview}>
                📌 Ôn tập các chữ này
              </button>
            )}
            <button type="button" className="btn btn--sm btn--primary" onClick={onClose}>
              Đóng
            </button>
          </div>
        </>
      }
    >
      {shown.length === 0 ? (
        <p className="empty-state">{LISTS[list].empty}</p>
      ) : filtered.length === 0 ? (
        <p className="empty-state">Không tìm thấy chữ Kanji nào khớp với từ khóa "{query}".</p>
      ) : (
        <div className="table-wrap">
          <table className="vocab-table">
            <thead>
              <tr>
                <th className="col-stt">STT</th>
                <th>Kanji</th>
                <th>Hán Việt</th>
                <th>Nghĩa · Từ vựng có chữ này</th>
                <th className="col-action">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, limit).map((item) => (
                <tr key={item.kanji}>
                  <td className="col-stt">#{item.stt}</td>
                  <td>
                    <span className="kanji-list-char" lang="ja">
                      {item.kanji}
                    </span>
                  </td>
                  <td>
                    <span className="badge tone-warning">{item.han_viet}</span>
                  </td>
                  <td className="vocab-meaning">
                    {item.meaning}
                    {deck.examplesOf(item).map((word) => (
                      <div key={`${word.stt}-${word.kanji}`} className="vocab-companion">
                        📖 <span lang="ja">{word.kanji}</span> (<span lang="ja">{word.hiragana}</span>) – {word.meaning}
                      </div>
                    ))}
                  </td>
                  <td className="col-action">
                    {list === "unremembered" ? (
                      <button
                        type="button"
                        className="btn btn--xs btn--secondary tone-success"
                        onClick={() => onMarkRemembered(item)}
                        title="Đánh dấu đã nhớ (gỡ khỏi danh sách chưa nhớ)"
                      >
                        ✨ Đã nhớ
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn btn--xs btn--secondary tone-warning"
                        onClick={() => onMarkUnremembered(item)}
                        title="Chuyển lại vào danh sách chưa nhớ để ôn tập"
                      >
                        📌 Chưa nhớ
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <ShowMore shown={limit} total={filtered.length} noun="chữ" onShowMore={() => setLimit(limit + LIST_PAGE_SIZE)} />
        </div>
      )}
    </Modal>
  );
}
