import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, FileText, AlertCircle } from "lucide-react";
import { ListField } from "@/hooks/useLists";

interface ImportLeadsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listName: string;
  listFields: ListField[];
  onImport: (csvContent: string) => void;
}

export function ImportLeadsDialog({
  open,
  onOpenChange,
  listName,
  listFields,
  onImport,
}: ImportLeadsDialogProps) {
  const [csvContent, setCsvContent] = useState("");
  const [csvFileName, setCsvFileName] = useState("");
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError("");
    setCsvFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setCsvContent(content);

      // Extract headers
      const lines = content.trim().split("\n");
      if (lines.length > 0) {
        const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
        setCsvHeaders(headers);
      }
    };
    reader.readAsText(file);
  };

  const handleSubmit = () => {
    if (!csvContent) {
      setError("Please select a CSV file");
      return;
    }
    onImport(csvContent);
    resetForm();
    onOpenChange(false);
  };

  const resetForm = () => {
    setCsvContent("");
    setCsvFileName("");
    setCsvHeaders([]);
    setError("");
  };

  const matchedFields = csvHeaders.filter((h) =>
    listFields.some((f) => f.name.toLowerCase() === h.toLowerCase())
  );

  const unmatchedFields = csvHeaders.filter(
    (h) => !listFields.some((f) => f.name.toLowerCase() === h.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) resetForm(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Import Leads to {listName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <input
              type="file"
              ref={fileInputRef}
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="w-full justify-start gap-2"
            >
              <Upload className="h-4 w-4" />
              {csvFileName || "Choose CSV file"}
            </Button>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-destructive text-sm">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          {csvHeaders.length > 0 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-medium text-green-600">
                  Matched Fields ({matchedFields.length})
                </p>
                <div className="flex flex-wrap gap-2">
                  {matchedFields.map((header) => (
                    <span
                      key={header}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded bg-green-50 border border-green-200 text-sm text-green-700"
                    >
                      <FileText className="h-3 w-3" />
                      {header}
                    </span>
                  ))}
                </div>
              </div>

              {unmatchedFields.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-orange-600">
                    New Fields ({unmatchedFields.length})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {unmatchedFields.map((header) => (
                      <span
                        key={header}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded bg-orange-50 border border-orange-200 text-sm text-orange-700"
                      >
                        <FileText className="h-3 w-3" />
                        {header}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    These fields will be stored in lead data but won't appear in list fields.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!csvContent}>
            Import Leads
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
