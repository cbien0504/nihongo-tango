import { describe, expect, it } from "vitest";
import type { KanjiItem } from "../data/kanjiDecks";
import { buildKanjiQuestion } from "./useKanjiQuiz";

const kanji = (stt: number, char: string, hanViet: string): KanjiItem => ({ stt, kanji: char, han_viet: hanViet, meaning: "" });

const TAI = kanji(1, "才", "TÀI");
const POOL = [
  TAI,
  kanji(2, "財", "TÀI"),
  kanji(3, "材", "TÀI"),
  kanji(4, "丸", "HOÀN"),
  kanji(5, "久", "CỬU"),
  kanji(6, "支", "CHI"),
  kanji(7, "枝", "CHI"),
  kanji(8, "戸", "HỘ"),
];

describe("buildKanjiQuestion", () => {
  it("offers four different Hán Việt, none of them read like the kanji asked", () => {
    for (let i = 0; i < 30; i++) {
      const question = buildKanjiQuestion(TAI, "han_viet", POOL);
      expect(question.answer).toBe("TÀI");
      expect(question.options).toHaveLength(4);
      expect(new Set(question.options).size).toBe(4);
      expect(question.options.filter((option) => option === "TÀI")).toHaveLength(1);
    }
  });

  it("offers four kanji for a Hán Việt, without the other kanji read the same way", () => {
    for (let i = 0; i < 30; i++) {
      const question = buildKanjiQuestion(TAI, "kanji", POOL);
      expect(question.answer).toBe("才");
      expect(question.options).toHaveLength(4);
      expect(question.options).toContain("才");
      expect(question.options).not.toContain("財");
      expect(question.options).not.toContain("材");
    }
  });
});
