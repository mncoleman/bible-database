"use client";

import { MoreHorizontal, Pencil, Trash2, ExternalLink, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Bible from "@/lib/bible/bible";
import type { LogEntry } from "@/lib/supabase/types";
import { getAppReadingUrl, type BibleApp, type BibleVersion } from "@/lib/bible/bible-apps";

type Props = {
  entry: LogEntry;
  onEdit: (entry: LogEntry) => void;
  onDelete: (id: string) => void;
  bibleApp?: BibleApp;
  bibleVersion?: BibleVersion;
};

export function LogEntryCard({
  entry,
  onEdit,
  onDelete,
  bibleApp = "BIBLEGATEWAY",
  bibleVersion = "NASB2020",
}: Props) {
  const rangeDisplay = Bible.displayVerseRange(
    entry.start_verse_id,
    entry.end_verse_id
  );
  const verseCount = Bible.countRangeVerses(
    entry.start_verse_id,
    entry.end_verse_id
  );
  const startParsed = Bible.parseVerseId(entry.start_verse_id);

  const openInBibleApp = () => {
    const url = getAppReadingUrl(
      bibleApp,
      bibleVersion,
      startParsed.book,
      startParsed.chapter
    );
    window.open(url, "_blank");
  };

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{rangeDisplay}</p>
          <p className="text-sm text-muted-foreground">
            {verseCount} verse{verseCount !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button variant="ghost" size="icon" onClick={openInBibleApp} title="Open in Bible app">
            <ExternalLink className="h-4 w-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(entry)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(entry.id)}
                className="text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </Card>
  );
}
