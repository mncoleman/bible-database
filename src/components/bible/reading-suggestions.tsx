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
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="flex flex-col justify-center py-2 overflow-hidden">
      <div className="min-w-0 flex-1 flex flex-col justify-center">
        <p className="text-sm font-medium truncate">{rec.label}</p>
        <p className="text-xs text-muted-foreground truncate">
          {rec.description}
        </p>
      </div>
      <div className="flex gap-2 mt-4">
        <Button variant="outline" size="lg" className="flex-1 min-w-0 text-base" onClick={handleRead}>
          Read
        </Button>
        <Button
          size="lg"
          className="flex-1 min-w-0 text-base"
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
        <CardHeader className="pt-3 pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <ArrowRight className="h-4 w-4" />
            Continue Reading
          </CardTitle>
        </CardHeader>
        <CardContent className="-mt-3 pt-0 pb-3">
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
