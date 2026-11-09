# Mimikara Oboeru N5 → N2 – Frontend

React + TypeScript + Vite app organized by JLPT level: the level tabs **N5 · N4 · N3 · N2** each open the sections of that level, **📖 Từ vựng** and **🈶 Kanji** for every level, **📝 Luyện đề** for N3 and N2. The chosen level and section are saved in localStorage (`mimikara_level`, `mimikara_section`); a level without the chosen section opens its vocabulary. Every level and section stays mounted, so switching keeps the current session.

Learners first register or log in with a username and a password (see [Login and progress](#login-and-progress)); the level tabs then show how many words of each level they remembered.

- **📖 Từ vựng N3** – multiple-choice quiz over the Mimikara Oboeru N3 vocabulary, by lesson, by unit or all words. Wrong answers come back later in the round; every word answered goes to the learner's *Chưa nhớ* list until it is marked Đã nhớ.
- **📖 Từ vựng N5 · N4 · N2** – the same quiz over the JLPT lists of [JTest.net](https://jtest.net/tu-vung-n5), by lesson, by chapter or all words: はじめての日本語能力試験 N5 単語 1000 (10 chapters × 5 lessons, 1047 words), N4 単語 1500 (7 chapters, 36 lessons, 894 words) and N2 単語 2500 (12 chapters × 5 lessons, 1546 words).

In every level, each learner has their own words to review (📌 Chưa nhớ) and remembered words (✅ Đã nhớ), both listed by the **📌 Từ chưa nhớ** button. Only the learner marks a word remembered, with the Đã nhớ button (D) after answering or on the back of a flashcard; until then, a word studied (answered in the quiz, right or wrong, or graded as a flashcard) is to review, and a wrong answer, the Chưa nhớ button (C) or a flashcard graded Quên puts a remembered word back to review. Words never studied are in neither list. The lists show 100 words at a time (**Xem thêm** adds 100), the search looks through all of them. The **Chọn bài** menu shows how many words of each lesson, unit and level are remembered, e.g. "(12/14 đã nhớ)", and ticks ✅ a lesson whose words are all remembered; **🎯 Chỉ từ chưa thuộc** (saved per level) keeps only the words not marked Đã nhớ yet, never-studied words included, in both study modes. The speaker, Hán Việt and Hiragana settings are shared by all levels. Every vocabulary section offers two study modes, and shows companion words with every answer:

- **📝 Trắc nghiệm** – the quiz above.
- **🧠 Thẻ ghi nhớ** – flashcards with spaced repetition (Leitner boxes): recall the meaning, flip the card (Space), then grade yourself 1 Quên · 2 Khó · 3 Nhớ · 4 Dễ. Remembered words come back after 1 → 3 → 7 → 14 → 30 → 60 → 120 days, forgotten ones come back in the same session and go back to the Chưa nhớ list. Each session takes the due reviews of the selected batch plus 20 new words. Progress is saved per learner and level.
- **🔗 Học 1 được 2** – after answering (and on the back of a flashcard) up to two companion words are shown: the 自動詞/他動詞 pair of a verb (倒れる → 倒す), then synonyms and antonyms, each with reading, Hán Việt, meaning and speaker.

- **🈶 Kanji N5 · N4 · N3 · N2** – multiple-choice quiz over the single kanji of the level (see [Kanji lists](#kanji-lists)), by lessons of 20 kanji in the order of the list or the whole list. Two ways to ask, saved per level (`mimikara_kanji_mode_<level>`): **Kanji → Hán Việt** and **Hán Việt → Kanji**; a wrong option is never read like the kanji asked. Wrong answers come back later in the round and are listed at its end. Every answer shows the kanji with its Hán Việt and meaning, and up to three words of the vocabulary written with it, words of the same level first. On and kun readings are left out. Like the vocabulary, every kanji answered goes to the learner's **Chưa nhớ** list until it is marked **Đã nhớ**, and the buttons (or keys) **Chưa nhớ (C)** / **Đã nhớ (D)** mark the kanji answered. The lessons show how many of their kanji are remembered (✅ when all are); **📌 Ôn tập Kanji chưa nhớ** practices the list to review, **🎯 Chỉ chữ chưa thuộc** leaves the remembered kanji out of the lessons (saved per level, `mimikara_kanji_only_unlearned_<level>`), and **📌 Kanji chưa nhớ** opens both lists to search, copy them or move a kanji from one to the other. These lists are saved with the learner's progress, in a deck of their own (`n3Kanji`…), apart from the words of the level.

- **📝 Luyện đề N3** – 文字・語彙 exam papers built from `JLPT_N3_tu_vung_Minchan.docx` (440 questions). Questions are grouped by part like the real exam: 問題1 漢字読み, 問題2 表記, 問題3 文脈規定, 問題4 言い換え類義. Pick a random mock paper (real N3 question counts), a lesson (Bài 1–8) or a whole part, then submit to see the score per part. The options of every question are shuffled each time a paper is started or retried.
- **📝 Luyện đề N2** – the 26 vocabulary quizzes of [JTest.net](https://jtest.net/jlpt/n2/vocabulary) (262 questions) in the same papers: 文脈規定 (191 questions), 言い換え類義 (41) and 用法 (30), whose options are sentences shown one per row. Pick a mock paper (7 + 5 + 5 questions like the real N2 paper), a quiz (Quiz 1–26) or a part; after submitting, every question shows the explanation of the site: the word with its reading and meaning, the sentence in Vietnamese and the other words of the sentence.

## Scripts

```bash
npm run dev     # start Vite dev server; /api goes to backend/dev_server.py (or API_PROXY=https://<CloudFront domain>)
npm run test    # run Vitest suite
npm run lint    # run Oxlint
npm run build   # type-check and build to dist/
```

## Login and progress

The login screen has a username (3–30 characters among `a-z 0-9 . _ -`, case-insensitive) and a password (6–128 characters), checked like in `backend/` before anything is sent, and two buttons: **Đăng nhập** checks the password (an unknown username suggests registering), **Đăng ký** creates the account unless the username is taken. Either way the server sets the session, an HttpOnly cookie the app never reads; `mimikara_user` only remembers who is logged in on this device, so the next visit opens the levels directly. Logging out saves the last changes, closes the session on the server, then shows the login. When the server refuses the session (expired, closed elsewhere), the app asks to log in again and keeps the changes made on this device.

`utils/progressStore.ts` keeps the progress of the logged-in learner:

- for each level, the status of a word (`u` to review, `k` remembered) and its flashcard, and the status of each kanji (deck `<level>Kanji`), each with the time it changed;
- cached in localStorage (`mimikara_progress_<username>`), so the app opens instantly and works offline;
- downloaded with `GET /api/users/<username>/progress` when the app opens (and again when the page comes back after a minute), merged entry by entry: the latest change wins, so several devices never overwrite each other;
- changes are sent with `PATCH /api/users/<username>/progress/<level>` 3 s after the last one, right away when the page is hidden, and retried after 5 s, 15 s, 60 s when the server cannot be reached. The user chip in the header shows the state: Đã lưu, Đang lưu…, Chưa lưu được, Hết phiên.

Progress saved in a browser before logins existed (`mimikara_unremembered_words`, `mimikara_srs_n3`…) is offered to the first learner who logs in there; importing adds only the words that learner has no progress for, then removes the old keys.

## Structure

```text
src/
├── App.tsx                 # header, theme, login or the learner's study levels
├── components/
│   ├── StudyLevels.tsx     # JLPT level tabs (with remembered words) and the section tabs of each level
│   ├── user/               # LoginScreen (log in / register), UserBar, SessionNotices (welcome, old progress import, expired session), ProgressProvider
│   ├── ui/                 # shared pieces: OptionButton, HanVietButton, CompanionList, ProgressCard, ResultPanel, Modal, SettingToggle, VocabTable
│   ├── vocab/              # vocabulary section of a level: mode switch + toolbar (VocabPractice), QuizPractice, FlashcardPractice, QuestionCard, WordHero, UnrememberedModal
│   ├── kanji/              # Kanji section of every level: KanjiPractice (Kanji ↔ Hán Việt quiz), KanjiListModal (Chưa nhớ / Đã nhớ)
│   └── exam/               # exam papers (sections, questions, result)
├── hooks/                  # persistent state, learner progress (useProgress, word lists, flashcards), shared vocab settings, speech, keyboard shortcuts, quiz session, kanji quiz and kanji progress
├── data/                   # N5/N4/N2 (jtest.net) and N3 vocabulary, companions, exam, N5–N2 kanji lists and kanji Hán Việt JSON; vocabDecks and kanjiDecks build the words and kanji of every level, examBanks the exam papers of N3 and N2
├── utils/                  # progressStore + progressApi (accounts, learner progress & sync), progress (merge, username and password rules), legacyProgress, quizEngine, srs, examEngine, hanViet, gtm
├── test/                   # test setup (offline by default) and fakeApi, the backend served from memory
└── types/
```

## Exam data

`src/data/jlpt_n3_minchan_exam.json` is generated from the Word document; regenerate it after editing the document:

```bash
pip install python-docx
python3 scripts/build_exam_data.py   # run from the repository root
```

Underlined words in the document become the `target` of each question; answers marked `*` in the answer key are flagged `inferred` and shown as reference answers.

`src/data/jtest_n2_exam.json` is crawled from the quizzes of jtest.net. A quiz page has no answers: the crawler submits every quiz unanswered, like a visitor, and reads the correct option and the explanation from the result page (two requests per quiz, with a pause between requests). `src/data/examBanks.ts` builds the papers of every level from these files, with the question count of each part in the mock paper.

```bash
python3 scripts/crawl_jtest_quiz.py n2   # run from the repository root, then build_han_viet_data.py
```

## N5, N4, N2 vocabulary and companion words

The JLPT lists of jtest.net (with their "Từ liên quan": synonyms, antonyms…) are crawled into `scripts/data/jtest_<level>.json`, one request per lesson page with a pause between requests. `build_vocab_data.py` then writes:

- `src/data/jtest_<level>_vocab.json` – the N5, N4 and N2 decks. Words are numbered across the whole list (1–1050 for N5, the site restarts at 1 in every lesson) because the unremembered list and the flashcard progress match words by number. The source has no Hán Việt, so the app derives it from the kanji (see below).
- `src/data/vocab_companions.json` – up to two companions per word of every level: the 自動詞/他動詞 pair found with [JMdict](https://www.edrdg.org/wiki/index.php/JMdict-EDICT_Dictionary_Project) (EDRDG, CC BY-SA 4.0) transitivity and the usual okurigana alternations (上がる/上げる, 開く/開ける, 残る/残す, 冷える/冷やす…), then synonyms and antonyms of jtest.net (Mimikara N3 words are matched to the jtest lists, N3 first) and JMdict antonyms. Every companion has a Vietnamese meaning taken from the word lists.

```bash
# run from the repository root
python3 scripts/crawl_jtest.py n5        # and n4, n2 (the decks); n3, n1 give more companions to N3 words
python3 scripts/build_vocab_data.py      # downloads JMdict
python3 scripts/build_han_viet_data.py   # downloads KANJIDIC2
```

## Kanji lists

`scripts/crawl_kanji.py` downloads the lists, pausing between pages, and writes `src/data/kanji_<level>.json` without the on and kun readings:

- **N3** – the table of [kohi.vn](https://kohi.vn/blog/tong-hop-kanji-n3-day-du-nhat-nigbu): kanji, Hán Việt and Vietnamese meaning. The script skips empty rows and kanji listed twice, numbers the 416 kanji again and fixes the readings in `KOHI_CORRECTIONS` (陽 DƯƠNG, 板 BẢN, 数 SỐ, 炭 THÁN).
- **N5, N4, N2** – the lists of JLPTsensei ([N5](https://jlptsensei.com/jlpt-n5-kanji-list/) 80 kanji, [N4](https://jlptsensei.com/jlpt-n4-kanji-list/) 167 on 2 pages, [N2](https://jlptsensei.com/jlpt-n2-kanji-list/) 374 on 4 pages), kanji only (their meanings are English). A kanji also in the N3 list (161 of the N2 kanji, 1 of N4) takes its N3 Hán Việt; the others are read in `kanji_han_viet.json`, so run `build_han_viet_data.py` after the crawl: it adds the kanji of every list to that table.

```bash
# run from the repository root
python3 scripts/crawl_kanji.py           # every level, or some: python3 scripts/crawl_kanji.py n5 n4
python3 scripts/build_han_viet_data.py   # downloads KANJIDIC2
```

## Hán Việt buttons

Every exam word written in kanji (the underlined word and each option, except the sentences of 用法 options) has a **Hán Việt** button that shows its Sino-Vietnamese reading; in the vocabulary quiz the same button appears while Hán Việt is hidden. Readings come from the N3 vocabulary data when the word is in it, otherwise kanji by kanji from `src/data/kanji_han_viet.json`; the N5, N4 and N2 vocabulary and the companion words get their Hán Việt the same way, leaving out the context in brackets (（お金を）下ろす → HẠ). Regenerate that table after changing the exam data or running `build_vocab_data.py` or `crawl_kanji.py`:

```bash
python3 scripts/build_han_viet_data.py   # run from the repository root; downloads KANJIDIC2
```

Per-kanji readings prefer the vocabulary data, then the first Vietnamese reading of [KANJIDIC2](https://www.edrdg.org/wiki/index.php/KANJIDIC_Project) (EDRDG, CC BY-SA 4.0); `OVERRIDES` in the script fixes kanji whose KANJIDIC2 reading is uncommon.
