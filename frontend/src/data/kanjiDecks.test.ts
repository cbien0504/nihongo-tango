import { describe, expect, it } from "vitest";
import { KANJI_BATCH_SIZE, KANJI_N2_DECK, KANJI_N3_DECK } from "./kanjiDecks";
import { N2_DECK } from "./vocabDecks";

const n2Kanji = (kanji: string) => KANJI_N2_DECK.items.find((item) => item.kanji === kanji)!;

describe("kanji decks", () => {
  it("lists the N3 kanji of kohi.vn and the N2 kanji of JLPTsensei once each, numbered in order", () => {
    expect(KANJI_N3_DECK.items).toHaveLength(416);
    expect(KANJI_N2_DECK.items).toHaveLength(374);
    for (const deck of [KANJI_N3_DECK, KANJI_N2_DECK]) {
      expect(new Set(deck.items.map((item) => item.kanji)).size).toBe(deck.items.length);
      expect(deck.items.map((item) => item.stt)).toEqual(deck.items.map((_, index) => index + 1));
    }
    expect(KANJI_N3_DECK.items[0]).toEqual({ stt: 1, kanji: "丸", han_viet: "HOÀN", meaning: "Tròn" });
  });

  it("gives every kanji a Hán Việt, the N3 one for a kanji of both lists", () => {
    for (const deck of [KANJI_N3_DECK, KANJI_N2_DECK]) {
      expect(deck.items.filter((item) => !item.han_viet || item.han_viet.includes("?"))).toEqual([]);
    }
    const n3 = new Map(KANJI_N3_DECK.items.map((item) => [item.kanji, item.han_viet]));
    const shared = KANJI_N2_DECK.items.filter((item) => n3.has(item.kanji));
    expect(shared.length).toBeGreaterThan(100);
    shared.forEach((item) => expect(item.han_viet).toBe(n3.get(item.kanji)));
    expect(n2Kanji("比").han_viet).toBe("TỈ");
    // Read from the kanji table, with the reading of the Japanese kanji.
    expect(n2Kanji("県").han_viet).toBe("HUYỆN");
    // Typos of kohi.vn corrected by scripts/crawl_kanji.py.
    expect(KANJI_N3_DECK.items.find((item) => item.kanji === "陽")!.han_viet).toBe("DƯƠNG");
  });

  it("cuts the lists into lessons of 20 kanji, after the whole list", () => {
    const [all, first, ...others] = KANJI_N3_DECK.batches;
    expect(all.items).toHaveLength(416);
    expect(first.items).toHaveLength(KANJI_BATCH_SIZE);
    expect(first.label).toBe("Bài 1: 丸久才支戸… (chữ 1–20)");
    expect(others.at(-1)!.items).toHaveLength(16);
    expect(KANJI_N3_DECK.getBatch("kanji_2").items[0]).toBe(KANJI_N3_DECK.items[20]);
    expect(KANJI_N3_DECK.getBatch("missing")).toBe(all);
  });

  it("shows up to three words written with the kanji, words of its level first", () => {
    for (const item of KANJI_N2_DECK.items.slice(0, 40)) {
      const examples = KANJI_N2_DECK.examplesOf(item);
      expect(examples.length).toBeLessThanOrEqual(3);
      examples.forEach((word) => expect(word.kanji).toContain(item.kanji));
      if (N2_DECK.items.some((word) => word.kanji.includes(item.kanji))) expect(N2_DECK.items).toContain(examples[0]);
    }
    expect(KANJI_N2_DECK.examplesOf(n2Kanji("党")).length).toBeGreaterThan(0);
  });
});
