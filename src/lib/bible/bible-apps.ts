import Bible from "./bible";

export const BibleVersions = {
  AMP: "AMP",
  KJV: "KJV",
  NKJV: "NKJV",
  NIV: "NIV",
  ESV: "ESV",
  NASB1995: "NASB1995",
  NASB2020: "NASB2020",
  NABRE: "NABRE",
  NLT: "NLT",
  TPT: "TPT",
  MSG: "MSG",
} as const;

export type BibleVersion = keyof typeof BibleVersions;

export const BibleApps = {
  YOUVERSIONAPP: "YOUVERSIONAPP",
  BIBLECOM: "BIBLECOM",
  BLUELETTERBIBLE: "BLUELETTERBIBLE",
  BIBLEGATEWAY: "BIBLEGATEWAY",
  OLIVETREE: "OLIVETREE",
} as const;

export type BibleApp = keyof typeof BibleApps;

const OSIS: Record<string, string> = {
  Judges: "JDG",
  "1 Samuel": "1SA",
  "2 Samuel": "2SA",
  "1 Kings": "1KI",
  "2 Kings": "2KI",
  "1 Chronicles": "1CH",
  "2 Chronicles": "2CH",
  "Song of Songs": "SNG",
  Ezekiel: "EZK",
  Joel: "JOL",
  Nahum: "NAM",
  Mark: "MRK",
  John: "JHN",
  "1 Corinthians": "1CO",
  "2 Corinthians": "2CO",
  "1 Thessalonians": "1TH",
  "2 Thessalonians": "2TH",
  "1 Timothy": "1TI",
  "2 Timothy": "2TI",
  Philippians: "PHP",
  Philemon: "PHM",
  James: "JAS",
  "1 Peter": "1PE",
  "2 Peter": "2PE",
  "1 John": "1JN",
  "2 John": "2JN",
  "3 John": "3JN",
};

const getOsisCode = (bookName: string) => {
  if (OSIS[bookName]) return OSIS[bookName];
  return bookName.substring(0, 3).toLocaleUpperCase();
};

const BibleComTranslationIds: Record<string, number> = {
  AMP: 1588,
  KJV: 1,
  NKJV: 114,
  NIV: 111,
  ESV: 59,
  NASB1995: 100,
  NASB2020: 2692,
  NABRE: 463,
  NLT: 116,
  TPT: 1849,
  MSG: 97,
};

const BlueLetterBibleVersionMap: Record<string, string> = {
  AMP: "amp",
  KJV: "kjv",
  NKJV: "nkjv",
  NIV: "niv",
  ESV: "esv",
  NASB1995: "nasb95",
  NASB2020: "nasb20",
  NABRE: "nasb20",
  NLT: "nlt",
  TPT: "nlt",
  MSG: "nlt",
};

const BibleGatewayVersionMap: Record<string, string> = {
  AMP: "AMP",
  KJV: "KJV",
  NKJV: "NKJV",
  NIV: "NIV",
  ESV: "ESV",
  NASB1995: "NASB1995",
  NASB2020: "NASB",
  NABRE: "NABRE",
  NLT: "NLT",
  TPT: "MSG",
  MSG: "MSG",
};

const BlueLetterBibleBookCodes = [
  undefined,
  "Gen", "Exo", "Lev", "Num", "Deu", "Jos", "Jdg", "Rth",
  "1Sa", "2Sa", "1Ki", "2Ki", "1Ch", "2Ch", "Ezr", "Neh",
  "Est", "Job", "Psa", "Pro", "Ecc", "Sng", "Isa", "Jer",
  "Lam", "Eze", "Dan", "Hos", "Joe", "Amo", "Oba", "Jon",
  "Mic", "Nah", "Hab", "Zep", "Hag", "Zec", "Mal",
  "Mat", "Mar", "Luk", "Jhn", "Act", "Rom", "1Co", "2Co",
  "Gal", "Eph", "Phl", "Col", "1Th", "2Th", "1Ti", "2Ti",
  "Tit", "Phm", "Heb", "Jas", "1Pe", "2Pe", "1Jo", "2Jo",
  "3Jo", "Jde", "Rev",
];

export const getAppReadingUrl = (
  app: BibleApp,
  version: BibleVersion,
  bookIndex: number,
  chapterIndex: number
): string => {
  const bookName = Bible.getBookName(bookIndex);
  const bookOsisCode = getOsisCode(bookName);

  switch (app) {
    case BibleApps.YOUVERSIONAPP: {
      return `youversion://bible?reference=${bookOsisCode}.${chapterIndex}.${version}`;
    }
    case BibleApps.BIBLECOM: {
      const langCode = BibleComTranslationIds[version] || 1;
      return `https://www.bible.com/bible/${langCode}/${bookOsisCode}.${chapterIndex}.${version}`;
    }
    case BibleApps.BLUELETTERBIBLE: {
      const blbVersion = BlueLetterBibleVersionMap[version] || "nasb20";
      const bookCode = BlueLetterBibleBookCodes[bookIndex];
      return `https://www.blueletterbible.org/${blbVersion}/${bookCode}/${chapterIndex}/1`;
    }
    case BibleApps.OLIVETREE: {
      return `olivetree://bible/${bookIndex}.${chapterIndex}.1`;
    }
    case BibleApps.BIBLEGATEWAY:
    default: {
      const bgVersion = BibleGatewayVersionMap[version] || "NASB";
      const chapterReference = `${bookName} ${chapterIndex}`;
      return encodeURI(
        `https://www.biblegateway.com/passage/?version=${bgVersion}&search=${chapterReference}`
      );
    }
  }
};

export const getDefaultBibleApp = (): BibleApp => {
  if (typeof window !== "undefined") {
    const ua = navigator.userAgent;
    if (/Android/i.test(ua)) return BibleApps.YOUVERSIONAPP;
  }
  return BibleApps.BIBLEGATEWAY;
};

export const getDefaultBibleVersion = (): BibleVersion => {
  return "NASB2020";
};

export const bibleVersionLabels: Record<BibleVersion, string> = {
  AMP: "Amplified Bible",
  KJV: "King James Version",
  NKJV: "New King James Version",
  NIV: "New International Version",
  ESV: "English Standard Version",
  NASB1995: "NASB 1995",
  NASB2020: "NASB 2020",
  NABRE: "New American Bible",
  NLT: "New Living Translation",
  TPT: "The Passion Translation",
  MSG: "The Message",
};

export const bibleAppLabels: Record<BibleApp, string> = {
  YOUVERSIONAPP: "YouVersion App",
  BIBLECOM: "Bible.com",
  BLUELETTERBIBLE: "Blue Letter Bible",
  BIBLEGATEWAY: "Bible Gateway",
  OLIVETREE: "Olive Tree",
};
