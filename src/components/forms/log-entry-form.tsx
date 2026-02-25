"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import Bible from "@/lib/bible/bible";
import { todayString } from "@/lib/bible/date-helpers";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (entry: {
    date: string;
    start_verse_id: number;
    end_verse_id: number;
  }) => void;
  initialValues?: {
    date: string;
    start_verse_id: number;
    end_verse_id: number;
  };
  isLoading?: boolean;
  hideDate?: boolean;
};

function parseInitialValues(initialValues?: Props["initialValues"]) {
  if (initialValues?.start_verse_id && initialValues?.end_verse_id) {
    const start = Bible.parseVerseId(initialValues.start_verse_id);
    const end = Bible.parseVerseId(initialValues.end_verse_id);
    return {
      date: initialValues.date,
      bookIndex: start.book,
      startChapter: start.chapter,
      startVerse: start.verse,
      endChapter: end.chapter,
      endVerse: end.verse,
    };
  }
  return {
    date: initialValues?.date ?? todayString(),
    bookIndex: 0,
    startChapter: 0,
    startVerse: 0,
    endChapter: 0,
    endVerse: 0,
  };
}

// Inner form that derives initial state from props on mount
function LogEntryFormInner({
  onOpenChange,
  onSubmit,
  initialValues,
  isLoading,
  hideDate,
}: Omit<Props, "open">) {
  const init = parseInitialValues(initialValues);
  const [date, setDate] = useState(init.date);
  const [bookIndex, setBookIndex] = useState(init.bookIndex);
  const [startChapter, setStartChapter] = useState(init.startChapter);
  const [startVerse, setStartVerse] = useState(init.startVerse);
  const [endChapter, setEndChapter] = useState(init.endChapter);
  const [endVerse, setEndVerse] = useState(init.endVerse);

  const books = Bible.getBooks();
  const chapterCount = bookIndex ? Bible.getBookChapterCount(bookIndex) : 0;
  const startVerseCount =
    bookIndex && startChapter
      ? Bible.getChapterVerseCount(bookIndex, startChapter)
      : 0;
  const endVerseCount =
    bookIndex && endChapter
      ? Bible.getChapterVerseCount(bookIndex, endChapter)
      : 0;

  const handleBookChange = (value: string) => {
    const idx = parseInt(value);
    setBookIndex(idx);
    setStartChapter(1);
    setStartVerse(1);
    const chapters = Bible.getBookChapterCount(idx);
    setEndChapter(chapters > 0 ? 1 : 0);
    const verses = Bible.getChapterVerseCount(idx, 1);
    setEndVerse(verses);
  };

  const handleStartChapterChange = (value: string) => {
    const ch = parseInt(value);
    setStartChapter(ch);
    setStartVerse(1);
    if (ch > endChapter) {
      setEndChapter(ch);
      setEndVerse(Bible.getChapterVerseCount(bookIndex, ch));
    }
  };

  const handleEndChapterChange = (value: string) => {
    const ch = parseInt(value);
    setEndChapter(ch);
    setEndVerse(Bible.getChapterVerseCount(bookIndex, ch));
  };

  const canSubmit =
    bookIndex > 0 &&
    startChapter > 0 &&
    startVerse > 0 &&
    endChapter > 0 &&
    endVerse > 0 &&
    date;

  const handleSubmit = () => {
    if (!canSubmit) return;
    const start_verse_id = Bible.makeVerseId(
      bookIndex,
      startChapter,
      startVerse
    );
    const end_verse_id = Bible.makeVerseId(bookIndex, endChapter, endVerse);
    if (!Bible.validateRange(start_verse_id, end_verse_id)) return;
    onSubmit({ date, start_verse_id, end_verse_id });
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {initialValues ? "Edit Reading" : "Log Reading"}
        </DialogTitle>
      </DialogHeader>

      <div className="grid gap-4 py-4">
        {!hideDate && (
          <div className="grid gap-2">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        )}

        <div className="grid gap-2">
          <Label>Book</Label>
          <Select
            value={bookIndex ? String(bookIndex) : ""}
            onValueChange={handleBookChange}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select book" />
            </SelectTrigger>
            <SelectContent>
              {books.map((book) => (
                <SelectItem
                  key={book.bibleOrder}
                  value={String(book.bibleOrder)}
                >
                  {book.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {bookIndex > 0 && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="startChapter">Start Chapter</Label>
                <select
                  id="startChapter"
                  value={startChapter || ""}
                  onChange={(e) => handleStartChapterChange(e.target.value)}
                  className="border-input bg-transparent text-sm rounded-md border px-3 h-9 w-full appearance-none"
                >
                  <option value="" disabled>Ch.</option>
                  {Array.from({ length: chapterCount }, (_, i) => i + 1).map(
                    (ch) => (
                      <option key={ch} value={ch}>{ch}</option>
                    )
                  )}
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="startVerse">Start Verse</Label>
                <select
                  id="startVerse"
                  value={startVerse || ""}
                  onChange={(e) => setStartVerse(parseInt(e.target.value))}
                  className="border-input bg-transparent text-sm rounded-md border px-3 h-9 w-full appearance-none"
                >
                  <option value="" disabled>Vs.</option>
                  {Array.from(
                    { length: startVerseCount },
                    (_, i) => i + 1
                  ).map((v) => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="endChapter">End Chapter</Label>
                <select
                  id="endChapter"
                  value={endChapter || ""}
                  onChange={(e) => handleEndChapterChange(e.target.value)}
                  className="border-input bg-transparent text-sm rounded-md border px-3 h-9 w-full appearance-none"
                >
                  <option value="" disabled>Ch.</option>
                  {Array.from({ length: chapterCount }, (_, i) => i + 1)
                    .filter((ch) => ch >= startChapter)
                    .map((ch) => (
                      <option key={ch} value={ch}>{ch}</option>
                    ))}
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="endVerse">End Verse</Label>
                <select
                  id="endVerse"
                  value={endVerse || ""}
                  onChange={(e) => setEndVerse(parseInt(e.target.value))}
                  className="border-input bg-transparent text-sm rounded-md border px-3 h-9 w-full appearance-none"
                >
                  <option value="" disabled>Vs.</option>
                  {Array.from(
                    { length: endVerseCount },
                    (_, i) => i + 1
                  ).map((v) => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>
            </div>
          </>
        )}
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={!canSubmit || isLoading}>
          {isLoading ? "Saving..." : initialValues ? "Update" : "Log Reading"}
        </Button>
      </DialogFooter>
    </>
  );
}

// Outer wrapper: key forces remount when dialog opens or initialValues change
export function LogEntryForm({
  open,
  onOpenChange,
  onSubmit,
  initialValues,
  isLoading,
  hideDate,
}: Props) {
  const formKey = open
    ? `${initialValues?.start_verse_id ?? "new"}-${initialValues?.end_verse_id ?? "new"}`
    : "closed";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <LogEntryFormInner
          key={formKey}
          onOpenChange={onOpenChange}
          onSubmit={onSubmit}
          initialValues={initialValues}
          isLoading={isLoading}
          hideDate={hideDate}
        />
      </DialogContent>
    </Dialog>
  );
}
