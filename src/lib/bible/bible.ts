import bibleBooks, { type BibleBook } from "./bible-books";
import chapterVerses from "./chapter-verses";

function createSortedIndices<T>(
  array: ReadonlyArray<Readonly<T>>,
  compareFn: (a: T, b: T) => number
): number[] {
  return Array.from(array.keys()).sort((a, b) =>
    compareFn(array[a], array[b])
  );
}

export type ParsedVerseId = {
  book: number;
  chapter: number;
  verse: number;
};

export type VerseId = number;

export type VerseRange = {
  startVerseId: VerseId;
  endVerseId: VerseId;
};

export type Segment = {
  startVerseId: VerseId;
  endVerseId: VerseId;
  read: boolean;
  verseCount: number;
};

const makeVerseId = (book = 0, chapter = 0, verse = 0): VerseId => {
  return 100000000 + book * 1000000 + chapter * 1000 + verse;
};

const parseVerseId = (verseId: number): ParsedVerseId => {
  verseId -= 100000000;
  const book = Math.floor(verseId / 1000000);
  verseId -= book * 1000000;
  const chapter = Math.floor(verseId / 1000);
  verseId -= chapter * 1000;
  const verse = verseId;
  return { book, chapter, verse };
};

const getBooks = (): BibleBook[] => bibleBooks;

const getChapterVerses = () => chapterVerses;

const getBookCount = (): number => bibleBooks.length;

const getBookChapterCount = (bookIndex: number): number => {
  const targetBook = bibleBooks.find((b) => b.bibleOrder === bookIndex);
  if (!targetBook) return 0;
  return targetBook.chapterCount;
};

const getChapterVerseCount = (
  bookIndex: number,
  chapterIndex: number
): number => {
  const chapterId = Bible.makeVerseId(bookIndex, chapterIndex);
  return chapterVerses[chapterId] || 0;
};

const getBookName = (bookIndex: number): string => {
  const targetBook = bibleBooks.find((b) => b.bibleOrder === bookIndex);
  if (!targetBook) return "";
  return targetBook.name;
};

const getBookIndex = (bookName: string): number => {
  const caseInsensitive = bookName.toLocaleLowerCase();
  const targetBook = bibleBooks.find((b) => {
    if (b.name.toLocaleLowerCase() === caseInsensitive) return true;
    const insensitiveAbbreviations = b.abbreviations.map((a) =>
      a.toLocaleLowerCase()
    );
    if (insensitiveAbbreviations.includes(caseInsensitive)) return true;
    return false;
  });
  if (!targetBook) return -1;
  return targetBook.bibleOrder;
};

const verseExists = (verseId: number): boolean => {
  const { book, chapter, verse } = Bible.parseVerseId(verseId);
  const chapterCount = Bible.getBookChapterCount(book);
  if (!chapterCount) return false;
  const verseCount = Bible.getChapterVerseCount(book, chapter);
  if (!verseCount || verse > verseCount) return false;
  return true;
};

const validateRange = (startVerseId: number, endVerseId: number): boolean => {
  if (!Bible.verseExists(startVerseId)) return false;
  if (!Bible.verseExists(endVerseId)) return false;
  if (startVerseId > endVerseId) return false;
  const startVerse = Bible.parseVerseId(startVerseId);
  const endVerse = Bible.parseVerseId(endVerseId);
  if (startVerse.book !== endVerse.book) return false;
  return true;
};

const countRangeVerses = (
  startVerseId: number,
  endVerseId: number
): number => {
  const startVerse = Bible.parseVerseId(startVerseId);
  const endVerse = Bible.parseVerseId(endVerseId);

  if (startVerse.book !== endVerse.book) {
    let sum = 0;
    const lastChapter = Bible.getBookChapterCount(startVerse.book);
    const lastVerse = Bible.getChapterVerseCount(startVerse.book, lastChapter);
    const tailEndVerseId = Bible.makeVerseId(
      startVerse.book,
      lastChapter,
      lastVerse
    );
    sum += Bible.countRangeVerses(startVerseId, tailEndVerseId);

    for (let i = startVerse.book + 1, l = endVerse.book; i < l; i++) {
      sum += Bible.getBookVerseCount(i);
    }

    const headStartVerseId = Bible.makeVerseId(endVerse.book, 1, 1);
    sum += Bible.countRangeVerses(headStartVerseId, endVerseId);
    return sum;
  }

  if (startVerse.chapter === endVerse.chapter) {
    return endVerse.verse - startVerse.verse + 1;
  }

  const { book } = startVerse;
  let verseCount = 0;
  for (let i = startVerse.chapter; i <= endVerse.chapter; i++) {
    const chapterVerseCount = Bible.getChapterVerseCount(book, i);
    if (i === startVerse.chapter) {
      verseCount += chapterVerseCount - (startVerse.verse - 1);
    } else if (i === endVerse.chapter) {
      verseCount += endVerse.verse;
    } else {
      verseCount += chapterVerseCount;
    }
  }
  return verseCount;
};

const getBookVerseCount = (bookIndex: number): number => {
  const bookChapterCount = Bible.getBookChapterCount(bookIndex);
  let totalVerses = 0;
  for (let c = 1; c <= bookChapterCount; c++) {
    totalVerses += Bible.getChapterVerseCount(bookIndex, c);
  }
  return totalVerses;
};

const getTotalVerseCount = (): number => {
  let totalVerses = 0;
  for (let b = 1; b <= bibleBooks.length; b++) {
    totalVerses += Bible.getBookVerseCount(b);
  }
  return totalVerses;
};

const getNextVerseId = (verseId: number, crossBooks = false): VerseId => {
  let { book, chapter, verse } = Bible.parseVerseId(verseId);
  const bookCount = Bible.getBookCount();
  const bookChapterCount = Bible.getBookChapterCount(book);
  const chapterVerseCount = Bible.getChapterVerseCount(book, chapter);
  if (verse < chapterVerseCount) {
    verse++;
  } else if (chapter < bookChapterCount) {
    chapter++;
    verse = 1;
  } else if (crossBooks && book < bookCount) {
    book++;
    chapter = 1;
    verse = 1;
  } else {
    return 0;
  }
  return Bible.makeVerseId(book, chapter, verse);
};

const getPreviousVerseId = (verseId: number, crossBooks = false): VerseId => {
  let { book, chapter, verse } = Bible.parseVerseId(verseId);
  if (verse > 1) {
    verse--;
  } else if (chapter > 1) {
    chapter--;
    verse = Bible.getChapterVerseCount(book, chapter);
  } else if (crossBooks && book > 1) {
    book--;
    chapter = Bible.getBookChapterCount(book);
    verse = Bible.getChapterVerseCount(book, chapter);
  } else {
    return 0;
  }
  return Bible.makeVerseId(book, chapter, verse);
};

const getFirstBookChapterVerseId = (
  bookIndex: number,
  chapterIndex: number
): VerseId => {
  return Bible.makeVerseId(bookIndex, chapterIndex, 1);
};

const getFirstBookVerseId = (bookIndex: number): VerseId => {
  return Bible.makeVerseId(bookIndex, 1, 1);
};

const getLastBookChapterVerseId = (
  bookIndex: number,
  chapterIndex: number
): VerseId => {
  const lastChapterVerseCount = Bible.getChapterVerseCount(
    bookIndex,
    chapterIndex
  );
  return Bible.makeVerseId(bookIndex, chapterIndex, lastChapterVerseCount);
};

const getLastBookVerseId = (bookIndex: number): VerseId => {
  const chapterIndex = Bible.getBookChapterCount(bookIndex);
  return Bible.getLastBookChapterVerseId(bookIndex, chapterIndex);
};

const compareRanges = (range1: VerseRange, range2: VerseRange): number => {
  const startVerse1 = Bible.parseVerseId(range1.startVerseId);
  const startVerse2 = Bible.parseVerseId(range2.startVerseId);
  if (startVerse1.book < startVerse2.book) return -1;
  if (startVerse1.book > startVerse2.book) return 1;
  if (startVerse1.chapter < startVerse2.chapter) return -1;
  if (startVerse1.chapter > startVerse2.chapter) return 1;
  if (startVerse1.verse < startVerse2.verse) return -1;
  if (startVerse1.verse > startVerse2.verse) return 1;
  return 0;
};

const countUniqueRangeVerses = (
  ranges: ReadonlyArray<Readonly<VerseRange>>
): number => {
  const sortedIndices = createSortedIndices(ranges, Bible.compareRanges);
  let totalVerses = 0;
  let lastRange: Readonly<VerseRange> | null = null;
  for (const index of sortedIndices) {
    const range = ranges[index];
    if (!lastRange) {
      lastRange = range;
    } else if (range.startVerseId <= lastRange.endVerseId) {
      if (range.endVerseId > lastRange.endVerseId) {
        lastRange = { startVerseId: lastRange.startVerseId, endVerseId: range.endVerseId };
      }
    } else {
      totalVerses += Bible.countRangeVerses(
        lastRange.startVerseId,
        lastRange.endVerseId
      );
      lastRange = range;
    }
  }
  if (lastRange) {
    totalVerses += Bible.countRangeVerses(
      lastRange.startVerseId,
      lastRange.endVerseId
    );
  }
  return totalVerses;
};

const countUniqueBookRangeVerses = (
  bookIndex: number,
  ranges: ReadonlyArray<Readonly<VerseRange>>
): number => {
  const filtered = Bible.filterRangesByBook(bookIndex, ranges);
  return Bible.countUniqueRangeVerses(filtered);
};

const filterRangesByBook = (
  bookIndex: number,
  ranges: ReadonlyArray<Readonly<VerseRange>>
): VerseRange[] => {
  return ranges.filter((r) => {
    const startVerse = Bible.parseVerseId(r.startVerseId);
    return startVerse.book === bookIndex;
  });
};

const filterRangesByBookChapter = (
  bookIndex: number,
  chapterIndex: number,
  ranges: ReadonlyArray<Readonly<VerseRange>>
): VerseRange[] => {
  return ranges.filter((r) => {
    const startVerse = Bible.parseVerseId(r.startVerseId);
    const endVerse = Bible.parseVerseId(r.endVerseId);
    return (
      startVerse.book === bookIndex &&
      startVerse.chapter <= chapterIndex &&
      endVerse.chapter >= chapterIndex
    );
  });
};

const cropRangeToBookChapter = (
  bookIndex: number,
  chapterIndex: number,
  range: Readonly<VerseRange>
): VerseRange => {
  const startVerse = Bible.parseVerseId(range.startVerseId);
  const endVerse = Bible.parseVerseId(range.endVerseId);
  if (startVerse.chapter < chapterIndex) {
    startVerse.chapter = chapterIndex;
    startVerse.verse = 1;
  }
  if (endVerse.chapter > chapterIndex) {
    endVerse.chapter = chapterIndex;
    endVerse.verse = Bible.getChapterVerseCount(bookIndex, chapterIndex);
  }
  const startVerseId = Bible.makeVerseId(
    startVerse.book,
    startVerse.chapter,
    startVerse.verse
  );
  const endVerseId = Bible.makeVerseId(
    endVerse.book,
    endVerse.chapter,
    endVerse.verse
  );
  return { ...range, startVerseId, endVerseId };
};

const countUniqueBookChapterRangeVerses = (
  bookIndex: number,
  chapterIndex: number,
  ranges: ReadonlyArray<Readonly<VerseRange>>
): number => {
  const filteredRanges = Bible.filterRangesByBookChapter(
    bookIndex,
    chapterIndex,
    ranges
  );
  const croppedRanges = filteredRanges.map((range) =>
    Bible.cropRangeToBookChapter(bookIndex, chapterIndex, range)
  );
  return Bible.countUniqueRangeVerses(croppedRanges);
};

const consolidateRanges = (
  ranges: ReadonlyArray<Readonly<VerseRange>>
): VerseRange[] => {
  const sortedIndices = createSortedIndices(ranges, Bible.compareRanges);
  const result: VerseRange[] = [];

  const allBookRanges: { [index: number]: VerseRange[] } = {};
  for (let i = 1, l = Bible.getBookCount(); i <= l; i++) {
    allBookRanges[i] = [];
  }
  for (const index of sortedIndices) {
    const range = ranges[index];
    const { book } = Bible.parseVerseId(range.startVerseId);
    allBookRanges[book].push({ ...range });
  }
  for (
    let bookIndex = 1, l = Bible.getBookCount();
    bookIndex <= l;
    bookIndex++
  ) {
    const bookRanges = allBookRanges[bookIndex];
    const consolidatedBookRanges: VerseRange[] = [];
    let holdingRange: VerseRange | null = null;
    for (const range of bookRanges) {
      if (!holdingRange) {
        holdingRange = range;
        continue;
      }
      const nextVerseId = Bible.getNextVerseId(holdingRange.endVerseId);
      if (!nextVerseId) break;
      if (range.startVerseId <= nextVerseId) {
        if (range.endVerseId > holdingRange.endVerseId) {
          holdingRange.endVerseId = range.endVerseId;
        }
      } else {
        consolidatedBookRanges.push(holdingRange);
        holdingRange = range;
      }
    }
    if (holdingRange) {
      consolidatedBookRanges.push(holdingRange);
    }
    result.push(...consolidatedBookRanges);
  }
  return result;
};

const getRangesBetweenVerseIds = (
  startVerseId: VerseId,
  endVerseId: VerseId
): VerseRange[] => {
  if (startVerseId > endVerseId) {
    throw new Error("startVerseId must be before endVerseId");
  }
  if (Bible.getNextVerseId(startVerseId) === endVerseId) return [];

  startVerseId = Bible.getNextVerseId(startVerseId);
  endVerseId = Bible.getPreviousVerseId(endVerseId);

  const { book: startBook } = Bible.parseVerseId(startVerseId);
  const { book: endBook } = Bible.parseVerseId(endVerseId);

  if (startBook === endBook) {
    return [{ startVerseId, endVerseId }];
  }

  const ranges: VerseRange[] = [];
  ranges.push({
    startVerseId,
    endVerseId: Bible.getLastBookVerseId(startBook),
  });
  for (let bookIndex = startBook + 1; bookIndex < endBook; bookIndex++) {
    ranges.push({
      startVerseId: Bible.getFirstBookVerseId(bookIndex),
      endVerseId: Bible.getLastBookVerseId(bookIndex),
    });
  }
  ranges.push({
    startVerseId: Bible.getFirstBookVerseId(endBook),
    endVerseId,
  });
  return ranges;
};

const generateSegments = (
  firstVerseId: VerseId,
  finalVerseId: VerseId,
  ranges: ReadonlyArray<Readonly<VerseRange>>
): Segment[] => {
  if (firstVerseId > finalVerseId) {
    throw new Error("firstVerseId must be before finalVerseId");
  }

  const segments: Segment[] = [];

  if (!ranges.length) {
    return [
      {
        startVerseId: firstVerseId,
        endVerseId: finalVerseId,
        read: false,
        verseCount: Bible.countRangeVerses(firstVerseId, finalVerseId),
      },
    ];
  }

  const filtered = ranges.filter(
    (range) =>
      range.endVerseId >= firstVerseId && range.startVerseId <= finalVerseId
  );
  const consolidatedRanges = Bible.consolidateRanges(filtered);

  for (const range of consolidatedRanges) {
    if (range.startVerseId < firstVerseId) range.startVerseId = firstVerseId;
    if (range.endVerseId > finalVerseId) range.endVerseId = finalVerseId;
  }

  let lastReadVerseId: VerseId | undefined;
  for (
    let rangeIndex = 0, rangeCount = consolidatedRanges.length;
    rangeIndex < rangeCount;
    rangeIndex++
  ) {
    const range = consolidatedRanges[rangeIndex];

    if (rangeIndex === 0) {
      if (firstVerseId !== range.startVerseId) {
        const unreadEndVerseId = Bible.getPreviousVerseId(range.startVerseId);
        segments.push({
          startVerseId: firstVerseId,
          endVerseId: unreadEndVerseId,
          read: false,
          verseCount: Bible.countRangeVerses(firstVerseId, unreadEndVerseId),
        });
      }
    } else {
      if (!lastReadVerseId) throw new Error("lastReadVerseId is undefined");
      const unreadStartVerseId = Bible.getNextVerseId(lastReadVerseId, true);
      if (range.startVerseId !== unreadStartVerseId) {
        const unreadRanges = Bible.getRangesBetweenVerseIds(
          lastReadVerseId,
          range.startVerseId
        );
        const unreadSegments = unreadRanges.map((r) => ({
          startVerseId: r.startVerseId,
          endVerseId: r.endVerseId,
          read: false,
          verseCount: Bible.countRangeVerses(r.startVerseId, r.endVerseId),
        }));
        segments.push(...unreadSegments);
      }
    }

    segments.push({
      startVerseId: range.startVerseId,
      endVerseId: range.endVerseId,
      read: true,
      verseCount: Bible.countRangeVerses(range.startVerseId, range.endVerseId),
    });
    lastReadVerseId = range.endVerseId;

    if (rangeIndex === rangeCount - 1) {
      if (range.endVerseId !== finalVerseId) {
        const startId = Bible.getNextVerseId(lastReadVerseId);
        segments.push({
          startVerseId: startId,
          endVerseId: finalVerseId,
          read: false,
          verseCount: Bible.countRangeVerses(startId, finalVerseId),
        });
      }
    }
  }
  return segments;
};

const generateBibleSegments = (
  ranges: ReadonlyArray<Readonly<VerseRange>>
): Segment[] => {
  const segments: Segment[] = [];
  const bookCount = Bible.getBookCount();
  const consolidatedRanges = Bible.consolidateRanges(ranges);
  let rangeIndex = 0;
  for (let bookIndex = 1; bookIndex <= bookCount; bookIndex++) {
    const lastChapterIndex = Bible.getBookChapterCount(bookIndex);
    const lastChapterVerseCount = Bible.getChapterVerseCount(
      bookIndex,
      lastChapterIndex
    );
    const firstVerseId = Bible.makeVerseId(bookIndex, 1, 1);
    const finalVerseId = Bible.makeVerseId(
      bookIndex,
      lastChapterIndex,
      lastChapterVerseCount
    );
    const bookRanges: VerseRange[] = [];
    while (
      rangeIndex < consolidatedRanges.length &&
      Bible.parseVerseId(consolidatedRanges[rangeIndex].startVerseId).book ===
        bookIndex
    ) {
      bookRanges.push(consolidatedRanges[rangeIndex]);
      rangeIndex++;
    }
    segments.push(
      ...Bible.generateSegments(firstVerseId, finalVerseId, bookRanges)
    );
  }
  return segments;
};

const generateBookSegments = (
  bookIndex: number,
  ranges: ReadonlyArray<Readonly<VerseRange>>
): Segment[] => {
  const lastChapterIndex = Bible.getBookChapterCount(bookIndex);
  const lastChapterVerseCount = Bible.getChapterVerseCount(
    bookIndex,
    lastChapterIndex
  );
  const firstVerseId = Bible.makeVerseId(bookIndex, 1, 1);
  const finalVerseId = Bible.makeVerseId(
    bookIndex,
    lastChapterIndex,
    lastChapterVerseCount
  );
  const filteredRanges = Bible.filterRangesByBook(bookIndex, ranges);
  return Bible.generateSegments(firstVerseId, finalVerseId, filteredRanges);
};

const generateBookChapterSegments = (
  bookIndex: number,
  chapterIndex: number,
  ranges: ReadonlyArray<Readonly<VerseRange>>
): Segment[] => {
  const chapterVerseCount = Bible.getChapterVerseCount(
    bookIndex,
    chapterIndex
  );
  const firstVerseId = Bible.makeVerseId(bookIndex, chapterIndex, 1);
  const finalVerseId = Bible.makeVerseId(
    bookIndex,
    chapterIndex,
    chapterVerseCount
  );
  const filteredRanges = Bible.filterRangesByBookChapter(
    bookIndex,
    chapterIndex,
    ranges
  );
  const croppedRanges = filteredRanges.map((range) =>
    Bible.cropRangeToBookChapter(bookIndex, chapterIndex, range)
  );
  return Bible.generateSegments(firstVerseId, finalVerseId, croppedRanges);
};

const displayVerseRange = (
  startVerseId: number,
  endVerseId: number
): string => {
  const start = Bible.parseVerseId(startVerseId);
  const end = Bible.parseVerseId(endVerseId);
  let range = "";
  if (!start.book) return range;

  const bookName = Bible.getBookName(start.book);
  range += bookName;
  if (!start.chapter) return range;
  const chapterCount = Bible.getBookChapterCount(start.book);

  if (start.chapter === 1 && start.verse && start.verse === 1) {
    if (end.chapter && end.chapter === chapterCount) {
      const endChapterVerseCount = Bible.getChapterVerseCount(
        start.book,
        end.chapter
      );
      if (end.verse === endChapterVerseCount) return range;
    }
  }

  range += " ";
  if (start.chapter === end.chapter) {
    const startChapterVerseCount = Bible.getChapterVerseCount(
      start.book,
      start.chapter
    );
    if (start.verse === 1 && end.verse === startChapterVerseCount) {
      range += start.chapter;
      return range;
    } else {
      range += start.chapter + ":";
      range += start.verse;
      if (start.verse !== end.verse) {
        range += "-" + end.verse;
      }
      return range;
    }
  } else {
    const endChapterVerseCount = Bible.getChapterVerseCount(
      end.book,
      end.chapter
    );
    if (start.verse === 1 && end.verse === endChapterVerseCount) {
      range += start.chapter + "-" + end.chapter;
      return range;
    } else {
      range += start.chapter + ":" + start.verse + "-";
      range += end.chapter + ":" + end.verse;
      return range;
    }
  }
};

const RegEx = {
  BookChapterVerseToChapterVerse:
    /((?:\d+\s*)?[\p{L}\p{M}\p{N}\s'-]+)\.?\s+(\d+)\s*:\s*(\d+)\s*[-–—]+\s*(\d+)\s*:\s*(\d+)/iu,
  BookChapterVerseToVerse:
    /((?:\d+\s*)?[\p{L}\p{M}\p{N}\s'-]+)\.?\s+(\d+)\s*:\s*(\d+)\s*[-–—]+\s*(\d+)/iu,
  BookChapterToChapter:
    /((?:\d+\s*)?[\p{L}\p{M}\p{N}\s'-]+)\.?\s+(\d+)\s*[-–—]+\s*(\d+)/iu,
  BookChapterVerse:
    /((?:\d+\s*)?[\p{L}\p{M}\p{N}\s'-]+)\.?\s+(\d+)\s*:\s*(\d+)/iu,
  BookChapter: /((?:\d+\s*)?[\p{L}\p{M}\p{N}\s'-]+)\.?\s+(\d+)/iu,
  Book: /((?:\d+\s*)?[\p{L}\p{M}\p{N}\s'-]+)/iu,
};

const parseVerseRange = (verseRangeString: string): VerseRange | null => {
  const start: {
    book?: string | number;
    chapter?: string | number;
    verse?: string | number;
  } = {};
  const end: {
    book?: string | number;
    chapter?: string | number;
    verse?: string | number;
  } = {};

  let match;
  if (
    ((match = RegEx.BookChapterVerseToChapterVerse.exec(verseRangeString)),
    match)
  ) {
    [, start.book, start.chapter, start.verse, end.chapter, end.verse] = match;
  } else if (
    ((match = RegEx.BookChapterVerseToVerse.exec(verseRangeString)), match)
  ) {
    [, start.book, start.chapter, start.verse, end.verse] = match;
    end.chapter = start.chapter;
  } else if (
    ((match = RegEx.BookChapterToChapter.exec(verseRangeString)), match)
  ) {
    [, start.book, start.chapter, end.chapter] = match;
    start.verse = 1;
    end.verse = Bible.getChapterVerseCount(
      Bible.getBookIndex(String(start.book)),
      +end.chapter
    );
  } else if (
    ((match = RegEx.BookChapterVerse.exec(verseRangeString)), match)
  ) {
    [, start.book, start.chapter, start.verse] = match;
    end.chapter = start.chapter;
    end.verse = start.verse;
  } else if (((match = RegEx.BookChapter.exec(verseRangeString)), match)) {
    [, start.book, start.chapter] = match;
    start.verse = 1;
    end.chapter = start.chapter;
    end.verse = Bible.getChapterVerseCount(
      Bible.getBookIndex(String(start.book)),
      +start.chapter
    );
  } else if (((match = RegEx.Book.exec(verseRangeString)), match)) {
    [, start.book] = match;
    start.chapter = 1;
    start.verse = 1;
    end.chapter = Bible.getBookChapterCount(
      Bible.getBookIndex(String(start.book))
    );
    end.verse = Bible.getChapterVerseCount(
      Bible.getBookIndex(String(start.book)),
      +end.chapter
    );
  } else {
    return null;
  }

  start.book = Bible.getBookIndex(String(start.book));
  if (start.book === -1) throw new Error("Invalid book name");
  end.book = start.book;

  const startVerseId = Bible.makeVerseId(
    start.book,
    +start.chapter!,
    +start.verse!
  );
  const endVerseId = Bible.makeVerseId(end.book, +end.chapter!, +end.verse!);

  if (!Bible.validateRange(startVerseId, endVerseId)) {
    throw new Error("Invalid verse range");
  }

  return { startVerseId, endVerseId };
};

const Bible = {
  makeVerseId,
  parseVerseId,
  getBooks,
  getChapterVerses,
  getBookCount,
  getBookChapterCount,
  getChapterVerseCount,
  getBookName,
  getBookIndex,
  verseExists,
  validateRange,
  countRangeVerses,
  getBookVerseCount,
  getTotalVerseCount,
  getNextVerseId,
  getPreviousVerseId,
  getFirstBookChapterVerseId,
  getFirstBookVerseId,
  getLastBookChapterVerseId,
  getLastBookVerseId,
  compareRanges,
  countUniqueRangeVerses,
  countUniqueBookRangeVerses,
  filterRangesByBook,
  filterRangesByBookChapter,
  cropRangeToBookChapter,
  countUniqueBookChapterRangeVerses,
  consolidateRanges,
  getRangesBetweenVerseIds,
  generateSegments,
  generateBibleSegments,
  generateBookSegments,
  generateBookChapterSegments,
  displayVerseRange,
  parseVerseRange,
};

export default Bible;
