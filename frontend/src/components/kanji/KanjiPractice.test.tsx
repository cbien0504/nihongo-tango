import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { KANJI_N3_DECK, kanjiKey } from "../../data/kanjiDecks";
import { ProgressContext } from "../../hooks/useProgress";
import type { WordStatus } from "../../types/progress";
import { ProgressStore } from "../../utils/progressStore";
import KanjiPractice from "./KanjiPractice";

/** A learner's progress, not synced: `marks` gives the status of N3 kanji by their number. */
const progressWith = (marks: Record<number, WordStatus> = {}) => {
  const store = new ProgressStore("tester", {
    load: vi.fn(async () => ({ username: "tester", progress: {} })),
    patchDeck: vi.fn(async () => ({})),
  });
  for (const [stt, status] of Object.entries(marks)) store.setWordStatus("n3Kanji", `stt_${stt}`, status);
  return store;
};

const renderPractice = (store = progressWith(), active = true) => {
  render(
    <ProgressContext.Provider value={store}>
      <KanjiPractice deck={KANJI_N3_DECK} active={active} />
    </ProgressContext.Provider>
  );
  return store;
};

const card = () => document.querySelector<HTMLElement>(".question-card")!;
const shown = () => card().querySelector(".word-main")!.textContent!;
const options = () => Array.from(card().querySelectorAll<HTMLElement>(".option"));
const optionTexts = () => options().map((option) => option.querySelector(".option-text")!.textContent!);
/** The kanji asked by the Hán Việt question. */
const asked = () => KANJI_N3_DECK.items.find((item) => item.kanji === shown())!;
/** Right option: the Hán Việt of the kanji shown, or a kanji read like the Hán Việt shown. */
const isRight = (text: string) =>
  text === asked()?.han_viet || KANJI_N3_DECK.items.some((item) => item.kanji === text && item.han_viet === shown());
const progressCount = () => document.querySelector(".progress-count")!.textContent;
const listButton = () => screen.getByRole("button", { name: "Xem danh sách Kanji chưa nhớ" });
const selectBatch = (key: string) => fireEvent.change(screen.getByLabelText("Chọn bài"), { target: { value: key } });
const answer = (correct: boolean) => {
  const index = optionTexts().findIndex((text) => isRight(text) === correct);
  fireEvent.keyDown(window, { key: String(index + 1) });
};

describe("KanjiPractice", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("asks the Hán Việt of the kanji of the first lesson and explains the answer", () => {
    renderPractice();

    expect(within(card()).getByText("Chọn âm Hán Việt đúng")).toBeInTheDocument();
    expect(options()).toHaveLength(4);
    const item = asked();
    expect(KANJI_N3_DECK.getBatch("kanji_1").items).toContain(item);

    answer(true);
    expect(within(card()).getByText("✅ Chính xác!")).toBeInTheDocument();
    expect(card().querySelector(".feedback-text")).toHaveTextContent(
      `${item.kanji} = ${item.han_viet}${item.meaning ? ` · ${item.meaning}` : ""}`
    );
    expect(document.querySelector(".progress-count")).toHaveTextContent("1 / 20 chữ");
  });

  it("asks a wrong answer again and lists it at the end of the round", () => {
    renderPractice();
    const missed = asked();
    answer(false);
    expect(within(card()).getByText("❌ Chưa chính xác!")).toBeInTheDocument();

    for (let i = 0; i < 40 && document.querySelector(".question-card"); i++) {
      fireEvent.keyDown(window, { key: "Enter" });
      if (document.querySelector(".question-card")) answer(true);
    }

    expect(screen.getByText("Hoàn thành lượt Kanji!")).toBeInTheDocument();
    const wrong = screen.getByText(/Các chữ đã làm sai trong lượt này \(1 chữ\)/).parentElement!;
    expect(within(wrong).getByText(missed.kanji)).toBeInTheDocument();
    expect(within(wrong).getByText(missed.han_viet)).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Enter" });
    expect(screen.getByText(/Lượt 2/)).toBeInTheDocument();
  });

  it("asks the kanji of a Hán Việt the other way round and keeps that choice", () => {
    renderPractice();

    fireEvent.click(screen.getByRole("button", { name: /Hán Việt → Kanji/ }));
    expect(localStorage.getItem("mimikara_kanji_mode_n3")).toBe("kanji");
    expect(within(card()).getByText("Chọn chữ Kanji đúng")).toBeInTheDocument();
    const lesson = KANJI_N3_DECK.getBatch("kanji_1").items;
    expect(lesson.map((item) => item.han_viet)).toContain(shown());
    // One option only is read like the Hán Việt shown.
    expect(optionTexts().filter(isRight)).toHaveLength(1);

    answer(true);
    expect(within(card()).getByText("✅ Chính xác!")).toBeInTheDocument();
  });

  it("practices the lesson or the whole list chosen", () => {
    renderPractice();

    fireEvent.change(screen.getByLabelText("Chọn bài"), { target: { value: "kanji_2" } });
    expect(screen.getByText("Kanji N3 – Bài 2")).toBeInTheDocument();
    expect(KANJI_N3_DECK.getBatch("kanji_2").items.map((item) => item.kanji)).toContain(shown());

    fireEvent.change(screen.getByLabelText("Chọn bài"), { target: { value: "all" } });
    expect(document.querySelector(".progress-count")).toHaveTextContent("0 / 416 chữ");
  });

  it("ignores the keyboard while another section is shown", () => {
    renderPractice(progressWith(), false);
    fireEvent.keyDown(window, { key: "1" });
    expect(card().querySelector(".feedback")).toBeNull();
  });

  it("puts a kanji answered wrong in the Chưa nhớ list, apart from the words, and D marks it remembered", () => {
    const store = renderPractice();
    const missed = asked();
    answer(false);

    expect(within(card()).getByText(/tự động thêm vào danh sách Chưa nhớ/)).toBeInTheDocument();
    expect(store.getDeck("n3Kanji").words[kanjiKey(missed)].s).toBe("u");
    expect(store.getDeck("n3").words).toEqual({});
    expect(listButton()).toHaveTextContent("1");
    expect(within(card()).getByRole("button", { name: /Chưa nhớ \(C\)/ })).toHaveAttribute("aria-pressed", "true");

    fireEvent.keyDown(window, { key: "d" });
    expect(store.getDeck("n3Kanji").words[kanjiKey(missed)].s).toBe("k");
    expect(listButton()).toHaveTextContent("0");
    expect(screen.getByText(/Đã nhớ/, { selector: ".toolbar-note" })).toHaveTextContent("Đã nhớ 1 / 416 chữ Kanji N3");
    const lesson = screen.getByRole("option", { name: /^Bài 1:/ });
    expect(lesson).toHaveTextContent("1/20 đã nhớ");

    fireEvent.keyDown(window, { key: "c" });
    expect(store.getDeck("n3Kanji").words[kanjiKey(missed)].s).toBe("u");
  });

  it("practices only the kanji not remembered yet when asked to, and keeps that choice", () => {
    const lesson = Object.fromEntries(Array.from({ length: 20 }, (_, i) => [i + 1, "k" as const]));
    renderPractice(progressWith({ ...lesson, 21: "k" }));
    expect(screen.getByRole("option", { name: /^✅ Bài 1:/ })).toHaveTextContent("20/20 đã nhớ");

    fireEvent.click(screen.getByRole("button", { name: /Chỉ chữ chưa thuộc: Tắt/ }));
    expect(localStorage.getItem("mimikara_kanji_only_unlearned_n3")).toBe("true");
    expect(screen.getByText("Bạn đã nhớ hết các chữ ở đây!")).toBeInTheDocument();

    selectBatch("kanji_2");
    expect(progressCount()).toContain("0 / 19 chữ");
    expect(shown()).not.toBe(KANJI_N3_DECK.items[20].kanji);

    selectBatch("kanji_1");
    fireEvent.click(screen.getByRole("button", { name: /Luyện lại cả phần/ }));
    expect(progressCount()).toContain("0 / 20 chữ");
    expect(screen.getByRole("button", { name: /Chỉ chữ chưa thuộc: Tắt/ })).toBeInTheDocument();
  });

  it("reviews the kanji to review and lists them with the remembered ones", () => {
    const [first, , third, , fifth] = KANJI_N3_DECK.items;
    const store = renderPractice(progressWith({ 3: "u", 5: "u", 1: "k" }));

    selectBatch("unremembered");
    expect(screen.getByText("Kanji N3 chưa nhớ")).toBeInTheDocument();
    expect(progressCount()).toContain("0 / 2 chữ");
    expect([third.kanji, fifth.kanji]).toContain(shown());

    fireEvent.click(listButton());
    const dialog = screen.getByRole("dialog", { name: /Kanji chưa nhớ N3 \(2 chữ\)/ });
    expect(within(dialog).getAllByRole("row")).toHaveLength(3);
    fireEvent.click(within(dialog).getAllByRole("button", { name: /Đã nhớ$/ })[0]);
    expect(store.getDeck("n3Kanji").words[kanjiKey(third)].s).toBe("k");

    fireEvent.click(within(dialog).getByRole("button", { name: /✅ Đã nhớ/ }));
    const known = within(screen.getByRole("dialog", { name: /Kanji đã nhớ N3 \(2 chữ\)/ }));
    expect(known.getByText(first.kanji)).toBeInTheDocument();
    expect(known.getByText(third.kanji)).toBeInTheDocument();

    // Back to the kanji to review: the first remembered one is 丸, marked before 才.
    fireEvent.click(known.getAllByRole("button", { name: "📌 Chưa nhớ" })[0]);
    expect(store.getDeck("n3Kanji").words[kanjiKey(first)].s).toBe("u");
  });

  it("shows an empty review list", () => {
    renderPractice();
    selectBatch("unremembered");

    expect(screen.getByText("Danh sách Kanji chưa nhớ hiện đang trống!")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Luyện Kanji N3 – Bài 1/ }));
    expect(progressCount()).toContain("0 / 20 chữ");
  });
});
