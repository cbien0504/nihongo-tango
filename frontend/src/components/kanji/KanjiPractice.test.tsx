import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { KANJI_N3_DECK } from "../../data/kanjiDecks";
import KanjiPractice from "./KanjiPractice";

const card = () => document.querySelector<HTMLElement>(".question-card")!;
const shown = () => card().querySelector(".word-main")!.textContent!;
const options = () => Array.from(card().querySelectorAll<HTMLElement>(".option"));
const optionTexts = () => options().map((option) => option.querySelector(".option-text")!.textContent!);
/** The kanji asked by the Hán Việt question. */
const asked = () => KANJI_N3_DECK.items.find((item) => item.kanji === shown())!;
/** Right option: the Hán Việt of the kanji shown, or a kanji read like the Hán Việt shown. */
const isRight = (text: string) =>
  text === asked()?.han_viet || KANJI_N3_DECK.items.some((item) => item.kanji === text && item.han_viet === shown());
const answer = (correct: boolean) => {
  const index = optionTexts().findIndex((text) => isRight(text) === correct);
  fireEvent.keyDown(window, { key: String(index + 1) });
};

describe("KanjiPractice", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("asks the Hán Việt of the kanji of the first lesson and explains the answer", () => {
    render(<KanjiPractice deck={KANJI_N3_DECK} active />);

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
    render(<KanjiPractice deck={KANJI_N3_DECK} active />);
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
    render(<KanjiPractice deck={KANJI_N3_DECK} active />);

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
    render(<KanjiPractice deck={KANJI_N3_DECK} active />);

    fireEvent.change(screen.getByLabelText("Chọn bài"), { target: { value: "kanji_2" } });
    expect(screen.getByText("Kanji N3 – Bài 2")).toBeInTheDocument();
    expect(KANJI_N3_DECK.getBatch("kanji_2").items.map((item) => item.kanji)).toContain(shown());

    fireEvent.change(screen.getByLabelText("Chọn bài"), { target: { value: "all" } });
    expect(document.querySelector(".progress-count")).toHaveTextContent("0 / 416 chữ");
  });

  it("ignores the keyboard while another section is shown", () => {
    render(<KanjiPractice deck={KANJI_N3_DECK} active={false} />);
    fireEvent.keyDown(window, { key: "1" });
    expect(card().querySelector(".feedback")).toBeNull();
  });
});
