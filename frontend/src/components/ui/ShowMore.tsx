import { LIST_PAGE_SIZE } from "./helpers";

interface ShowMoreProps {
  /** Rows shown so far. */
  shown: number;
  total: number;
  /** What the rows are: "từ", "chữ". */
  noun: string;
  onShowMore: () => void;
}

/** Button under a long list cut to its first rows: shows LIST_PAGE_SIZE more. */
export default function ShowMore({ shown, total, noun, onShowMore }: ShowMoreProps) {
  if (shown >= total) return null;
  return (
    <div className="show-more">
      <button type="button" className="btn btn--sm btn--secondary" onClick={onShowMore}>
        ⬇️ Xem thêm {Math.min(LIST_PAGE_SIZE, total - shown)} {noun} (còn {total - shown})
      </button>
    </div>
  );
}
