"use client";

import { useState, useRef } from "react";
import { ArrowLeft, Upload, FileText, AlertCircle, CheckCircle2, MinusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useLogEntries, useBulkCreateLogEntries } from "@/hooks/use-log-entries";
import Bible from "@/lib/bible/bible";
import Link from "next/link";
import { toast } from "sonner";

type ParsedRow = {
  line: number;
  raw: string;
  date: string | null;
  rangeString: string | null;
  startVerseId: number | null;
  endVerseId: number | null;
  status: "valid" | "duplicate" | "invalid";
  error?: string;
};

function parseCSV(text: string): { date: string; rangeString: string }[] {
  return text
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .map((line) => {
      // Split on first comma only — verse range may contain commas
      const firstComma = line.indexOf(",");
      if (firstComma === -1) return { date: line.trim(), rangeString: "" };
      return {
        date: line.substring(0, firstComma).trim(),
        rangeString: line.substring(firstComma + 1).trim(),
      };
    });
}

function isValidDate(dateStr: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateStr) && !isNaN(Date.parse(dateStr));
}

export default function ImportPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    imported: number;
    skipped: number;
    invalid: number;
  } | null>(null);

  const { data: existingEntries = [] } = useLogEntries();
  const bulkCreate = useBulkCreateLogEntries();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const csvRows = parseCSV(text);

      // Build a set of existing entries for duplicate detection
      const existingSet = new Set(
        existingEntries.map(
          (e) => `${e.date}|${e.start_verse_id}|${e.end_verse_id}`
        )
      );

      const rows: ParsedRow[] = csvRows.map((row, i) => {
        if (!row.rangeString) {
          return {
            line: i + 1,
            raw: `${row.date}`,
            date: null,
            rangeString: null,
            startVerseId: null,
            endVerseId: null,
            status: "invalid",
            error: "Missing verse range",
          };
        }

        if (!isValidDate(row.date)) {
          return {
            line: i + 1,
            raw: `${row.date},${row.rangeString}`,
            date: null,
            rangeString: row.rangeString,
            startVerseId: null,
            endVerseId: null,
            status: "invalid",
            error: "Invalid date format",
          };
        }

        try {
          const range = Bible.parseVerseRange(row.rangeString);
          if (!range) {
            return {
              line: i + 1,
              raw: `${row.date},${row.rangeString}`,
              date: row.date,
              rangeString: row.rangeString,
              startVerseId: null,
              endVerseId: null,
              status: "invalid",
              error: "Could not parse verse range",
            };
          }

          const key = `${row.date}|${range.startVerseId}|${range.endVerseId}`;
          const isDuplicate = existingSet.has(key);

          return {
            line: i + 1,
            raw: `${row.date},${row.rangeString}`,
            date: row.date,
            rangeString: row.rangeString,
            startVerseId: range.startVerseId,
            endVerseId: range.endVerseId,
            status: isDuplicate ? "duplicate" : "valid",
          };
        } catch (err) {
          return {
            line: i + 1,
            raw: `${row.date},${row.rangeString}`,
            date: row.date,
            rangeString: row.rangeString,
            startVerseId: null,
            endVerseId: null,
            status: "invalid",
            error: err instanceof Error ? err.message : "Parse error",
          };
        }
      });

      setParsedRows(rows);
    };
    reader.readAsText(file);
  };

  const validRows = parsedRows.filter((r) => r.status === "valid");
  const duplicateRows = parsedRows.filter((r) => r.status === "duplicate");
  const invalidRows = parsedRows.filter((r) => r.status === "invalid");

  const handleImport = async () => {
    if (validRows.length === 0) return;
    setImporting(true);
    try {
      const entries = validRows.map((r) => ({
        date: r.date!,
        start_verse_id: r.startVerseId!,
        end_verse_id: r.endVerseId!,
      }));
      const inserted = await bulkCreate.mutateAsync(entries);
      setImportResult({
        imported: inserted,
        skipped: duplicateRows.length,
        invalid: invalidRows.length,
      });
      toast.success(`${inserted} entries imported`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Import failed"
      );
    } finally {
      setImporting(false);
    }
  };

  const handleReset = () => {
    setParsedRows([]);
    setFileName(null);
    setImportResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/settings">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Import Reading History</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Upload CSV</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Import a CSV file exported from the old mybiblelog app. The file
            should have two columns: <code>date,verse range</code> (e.g.,{" "}
            <code>2024-01-15,Genesis 1:1-5</code>).
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.txt"
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="mr-2 h-4 w-4" />
            {fileName ? fileName : "Choose File"}
          </Button>
        </CardContent>
      </Card>

      {parsedRows.length > 0 && !importResult && (
        <>
          {/* Summary */}
          <div className="flex gap-3 flex-wrap">
            <Badge variant="secondary" className="gap-1">
              <FileText className="h-3 w-3" />
              {parsedRows.length} total rows
            </Badge>
            <Badge variant="secondary" className="gap-1 text-green-700 dark:text-green-400">
              <CheckCircle2 className="h-3 w-3" />
              {validRows.length} to import
            </Badge>
            {duplicateRows.length > 0 && (
              <Badge variant="secondary" className="gap-1 text-yellow-700 dark:text-yellow-400">
                <MinusCircle className="h-3 w-3" />
                {duplicateRows.length} duplicates
              </Badge>
            )}
            {invalidRows.length > 0 && (
              <Badge variant="secondary" className="gap-1 text-red-700 dark:text-red-400">
                <AlertCircle className="h-3 w-3" />
                {invalidRows.length} invalid
              </Badge>
            )}
          </div>

          {/* Preview table */}
          <Card>
            <CardContent className="p-0">
              <div className="max-h-80 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-background border-b">
                    <tr>
                      <th className="text-left p-3 font-medium">Line</th>
                      <th className="text-left p-3 font-medium">Date</th>
                      <th className="text-left p-3 font-medium">Passage</th>
                      <th className="text-left p-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedRows.map((row) => (
                      <tr key={row.line} className="border-b last:border-0">
                        <td className="p-3 text-muted-foreground">
                          {row.line}
                        </td>
                        <td className="p-3">{row.date ?? "—"}</td>
                        <td className="p-3">
                          {row.startVerseId && row.endVerseId
                            ? Bible.displayVerseRange(
                                row.startVerseId,
                                row.endVerseId
                              )
                            : row.rangeString ?? "—"}
                        </td>
                        <td className="p-3">
                          {row.status === "valid" && (
                            <span className="text-green-700 dark:text-green-400">
                              Ready
                            </span>
                          )}
                          {row.status === "duplicate" && (
                            <span className="text-yellow-700 dark:text-yellow-400">
                              Duplicate
                            </span>
                          )}
                          {row.status === "invalid" && (
                            <span className="text-red-700 dark:text-red-400" title={row.error}>
                              {row.error}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Import button */}
          <div className="flex gap-3">
            <Button
              onClick={handleImport}
              disabled={validRows.length === 0 || importing}
            >
              {importing ? "Importing..." : `Import ${validRows.length} Entries`}
            </Button>
            <Button variant="outline" onClick={handleReset}>
              Cancel
            </Button>
          </div>

          {importing && (
            <Progress value={undefined} className="animate-pulse" />
          )}
        </>
      )}

      {importResult && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Import Complete</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm">
              <span className="font-medium text-green-700 dark:text-green-400">
                {importResult.imported}
              </span>{" "}
              entries imported
            </p>
            {importResult.skipped > 0 && (
              <p className="text-sm">
                <span className="font-medium text-yellow-700 dark:text-yellow-400">
                  {importResult.skipped}
                </span>{" "}
                duplicates skipped
              </p>
            )}
            {importResult.invalid > 0 && (
              <p className="text-sm">
                <span className="font-medium text-red-700 dark:text-red-400">
                  {importResult.invalid}
                </span>{" "}
                invalid rows skipped
              </p>
            )}
            <div className="pt-2">
              <Button variant="outline" onClick={handleReset}>
                Import Another File
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
