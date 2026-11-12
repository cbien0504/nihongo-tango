import { describe, expect, it } from "vitest";
import { KANJI_BATCH_SIZE, KANJI_N2_DECK, KANJI_N3_DECK, KANJI_N4_DECK, KANJI_N5_DECK, kanjiKey } from "./kanjiDecks";
import { N2_DECK, N5_DECK, UNREMEMBERED_BATCH_KEY } from "./vocabDecks";

const DECKS = [KANJI_N5_DECK, KANJI_N4_DECK, KANJI_N3_DECK, KANJI_N2_DECK];

const n2Kanji = (kanji: string) => KANJI_N2_DECK.items.find((item) => item.kanji === kanji)!;

describe("kanji decks", () => {
  it("lists the N3 kanji of kohi.vn and the N5, N4, N2 kanji of JLPTsensei once each, numbered in order", () => {
    expect(DECKS.map((deck) => deck.items.length)).toEqual([80, 167, 416, 374]);
    for (const deck of DECKS) {
      expect(new Set(deck.items.map((item) => item.kanji)).size).toBe(deck.items.length);
      expect(deck.items.map((item) => item.stt)).toEqual(deck.items.map((_, index) => index + 1));
    }
    expect(KANJI_N3_DECK.items[0]).toEqual({ stt: 1, kanji: "丸", han_viet: "HOÀN", meaning: "Tròn" });
  });

  it("gives every kanji a Hán Việt, and the N2 kanji the Hán Việt and meaning of tudienabc.com", () => {
    for (const deck of DECKS) {
      expect(deck.items.filter((item) => !item.han_viet || item.han_viet.includes("?"))).toEqual([]);
    }
    // tudienabc.com reads the kanji of both lists like kohi.vn, but gives both readings of 領.
    const n3 = new Map(KANJI_N3_DECK.items.map((item) => [item.kanji, item.han_viet]));
    const shared = KANJI_N2_DECK.items.filter((item) => n3.has(item.kanji));
    expect(shared).toHaveLength(161);
    expect(shared.filter((item) => item.han_viet !== n3.get(item.kanji)).map((item) => `${item.kanji} ${item.han_viet}`)).toEqual([
      "領 LĨNH, LÃNH",
    ]);
    expect(n2Kanji("比")).toMatchObject({ han_viet: "TỈ", meaning: "so sánh, tỉ lệ, tỉ dụ" });
    // Found in the N1 lessons of tudienabc.com.
    expect(n2Kanji("保")).toMatchObject({ han_viet: "BẢO", meaning: "bảo trì, bảo vệ, đảm bảo" });
    // Corrected by scripts/crawl_kanji.py: tudienabc.com reads the simplified Chinese 机 (機).
    expect(n2Kanji("机")).toMatchObject({ han_viet: "KỈ", meaning: "cái bàn" });
    // Missing from tudienabc.com: read from the kanji table, without meaning.
    expect(n2Kanji("坊")).toMatchObject({ han_viet: "PHƯỜNG", meaning: "" });
    expect(KANJI_N2_DECK.items.filter((item) => !item.meaning).map((item) => item.kanji)).toEqual(["坊"]);
    expect(KANJI_N2_DECK.hanVietSource).toBe("");
    expect(KANJI_N5_DECK.hanVietSource).toContain("KANJIDIC2");
    expect(KANJI_N5_DECK.items.slice(0, 3).map((item) => `${item.kanji} ${item.han_viet}`)).toEqual(["日 NHẬT", "一 NHẤT", "国 QUỐC"]);
    // KANJIDIC2 overridden by scripts/build_han_viet_data.py.
    expect(KANJI_N4_DECK.items.find((item) => item.kanji === "料")!.han_viet).toBe("LIỆU");
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

  it("finds a kanji by its progress key and practices the kanji to review", () => {
    const [first, second] = KANJI_N5_DECK.items;
    expect(kanjiKey(second)).toBe("stt_2");
    expect(KANJI_N5_DECK.itemByKey("stt_2")).toBe(second);
    expect(KANJI_N5_DECK.itemByKey("stt_999")).toBeUndefined();

    expect(KANJI_N5_DECK.getBatchItems(UNREMEMBERED_BATCH_KEY, [second, first])).toEqual([second, first]);
    expect(KANJI_N5_DECK.getBatchTitle(UNREMEMBERED_BATCH_KEY)).toBe("Kanji N5 chưa nhớ");
    expect(KANJI_N5_DECK.getBatchItems("kanji_1", [second])).toHaveLength(KANJI_BATCH_SIZE);
    expect(KANJI_N5_DECK.getBatchTitle("kanji_1")).toBe("Kanji N5 – Bài 1");
    // N5 kanji are shown with N5 words first.
    expect(N5_DECK.items).toContain(KANJI_N5_DECK.examplesOf(first)[0]);
  });
});
