"use client";

import { useState, useEffect } from "react";
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
};

export function LogEntryForm({
  open,
  onOpenChange,
  onSubmit,
  initialValues,
  isLoading,
}: Props) {
  const [date, setDate] = useState(todayString());
  const [bookIndex, setBookIndex] = useState(0);
  const [startChapter, setStartChapter] = useState(0);
  const [startVerse, setStartVerse] = useState(0);
  const [endChapter, setEndChapter] = useState(0);
  const [endVerse, setEndVerse] = useState(0);

  useEffect(() => {
    if (initialValues) {
      setDate(initialValues.date);
      if (initialValues.start_verse_id && initialValues.end_verse_id) {
        const start = Bible.parseVerseId(initialValues.start_verse_id);
        const end = Bible.parseVerseId(initialValues.end_verse_id);
        setBookIndex(start.book);
        setStartChapter(start.chapter);
        setStartVerse(start.verse);
        setEndChapter(end.chapter);
        setEndVerse(end.verse);
      } else {
        setBookIndex(0);
        setStartChapter(0);
        setStartVerse(0);
        setEndChapter(0);
        setEndVerse(0);
      }
    } else {
      setDate(todayString());
      setBookIndex(0);
      setStartChapter(0);
      setStartVerse(0);
      setEndChapter(0);
      setEndVerse(0);
    }
  }, [initialValues, open]);

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {initialValues ? "Edit Reading" : "Log Reading"}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label>Book</Label>
            <Select
              value={bookIndex ? String(bookIndex) : ""}
              onValueChange={handleBookChange}
            >
              <SelectTrigger>
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
                  <Label>Start Chapter</Label>
                  <Select
                    value={startChapter ? String(startChapter) : ""}
                    onValueChange={handleStartChapterChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Ch." />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: chapterCount }, (_, i) => i + 1).map(
                        (ch) => (
                          <SelectItem key={ch} value={String(ch)}>
                            {ch}
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Start Verse</Label>
                  <Select
                    value={startVerse ? String(startVerse) : ""}
                    onValueChange={(v) => setStartVerse(parseInt(v))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Vs." />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from(
                        { length: startVerseCount },
                        (_, i) => i + 1
                      ).map((v) => (
                        <SelectItem key={v} value={String(v)}>
                          {v}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>End Chapter</Label>
                  <Select
                    value={endChapter ? String(endChapter) : ""}
                    onValueChange={handleEndChapterChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Ch." />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: chapterCount }, (_, i) => i + 1)
                        .filter((ch) => ch >= startChapter)
                        .map((ch) => (
                          <SelectItem key={ch} value={String(ch)}>
                            {ch}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>End Verse</Label>
                  <Select
                    value={endVerse ? String(endVerse) : ""}
                    onValueChange={(v) => setEndVerse(parseInt(v))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Vs." />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from(
                        { length: endVerseCount },
                        (_, i) => i + 1
                      ).map((v) => (
                        <SelectItem key={v} value={String(v)}>
                          {v}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
      </DialogContent>
    </Dialog>
  );
}
