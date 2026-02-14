"use client";

import { useMemo } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Bible, { type VerseRange } from "@/lib/bible/bible";
import type { LogEntry } from "@/lib/supabase/types";
import {
  getPickUpWhereYouLeftOff,
  type Recommendation,
} from "@/lib/bible/recommendations";
import {
  getAppReadingUrl,
  type BibleApp,
  type BibleVersion,
} from "@/lib/bible/bible-apps";

type Props = {
  entries: LogEntry[];
  bibleApp: BibleApp;
  bibleVersion: BibleVersion;
  onLog: (startVerseId: number, endVerseId: number) => void;
};

function SuggestionRow({
  rec,
  bibleApp,
  bibleVersion,
  onLog,
}: {
  rec: Recommendation;
  bibleApp: BibleApp;
  bibleVersion: BibleVersion;
  onLog: (startVerseId: number, endVerseId: number) => void;
}) {
  const startParsed = Bible.parseVerseId(rec.startVerseId);

  const handleRead = () => {
    const url = getAppReadingUrl(
      bibleApp,
      bibleVersion,
      startParsed.book,
      startParsed.chapter
    );
    window.open(url, "_blank");
  };

  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{rec.label}</p>
        <p className="text-xs text-muted-foreground truncate">
          {rec.description}
        </p>
      </div>
      <div className="flex gap-1.5 shrink-0">
        <Button variant="outline" size="sm" onClick={handleRead}>
          Read
        </Button>
        <Button
          size="sm"
          onClick={() => onLog(rec.startVerseId, rec.endVerseId)}
        >
          Log
        </Button>
      </div>
    </div>
  );
}

export function ReadingSuggestions({
  entries,
  bibleApp,
  bibleVersion,
  onLog,
}: Props) {
  const readRanges: VerseRange[] = useMemo(
    () =>
      entries.map((e) => ({
        startVerseId: e.start_verse_id,
        endVerseId: e.end_verse_id,
      })),
    [entries]
  );

  const continueReading = useMemo(
    () => getPickUpWhereYouLeftOff(entries, readRanges),
    [entries, readRanges]
  );

  if (!continueReading) return null;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Suggested Reading</h2>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <ArrowRight className="h-4 w-4" />
            Continue Reading
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <SuggestionRow
            rec={continueReading}
            bibleApp={bibleApp}
            bibleVersion={bibleVersion}
            onLog={onLog}
          />
        </CardContent>
      </Card>
    </div>
  );
}
