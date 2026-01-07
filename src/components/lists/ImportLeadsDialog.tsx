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
import * as XLSX from "xlsx";

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
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError("");
    setFileName(file.name);
    setIsLoading(true);

    const isExcel = file.name.endsWith(".xlsx") || file.name.endsWith(".xls");

    try {
      if (isExcel) {
        // Handle Excel files
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert to CSV with tab delimiter to avoid comma issues
        const csvOutput = XLSX.utils.sheet_to_csv(worksheet, { FS: "\t" });
        setCsvContent(csvOutput);
        
        // Extract headers
        const lines = csvOutput.trim().split("\n");
        if (lines.length > 0) {
          const extractedHeaders = lines[0].split("\t").map((h) => h.trim());
          setHeaders(extractedHeaders);
        }
      } else {
        // Handle CSV files
        const reader = new FileReader();
        reader.onload = (event) => {
          const content = event.target?.result as string;
          setCsvContent(content);

          // Extract headers - detect delimiter
          const lines = content.trim().split("\n");
          if (lines.length > 0) {
            const firstLine = lines[0];
            const delimiter = detectDelimiter(firstLine);
            const extractedHeaders = parseCSVLine(firstLine, delimiter).map((h) => h.trim());
            setHeaders(extractedHeaders);
          }
        };
        reader.readAsText(file);
      }
    } catch (err) {
      setError("Failed to read file. Please try again.");
      console.error("File read error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Detect CSV delimiter
  const detectDelimiter = (line: string): string => {
    const tabCount = (line.match(/\t/g) || []).length;
    const commaCount = (line.match(/,/g) || []).length;
    const semicolonCount = (line.match(/;/g) || []).length;
    
    if (tabCount >= commaCount && tabCount >= semicolonCount && tabCount > 0) {
      return "\t";
    }
    return semicolonCount > commaCount ? ";" : ",";
  };

  // Parse a CSV line handling quoted fields
  const parseCSVLine = (line: string, delimiter: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        result.push(current.replace(/^"|"$/g, ""));
        current = "";
      } else {
        current += char;
      }
    }
    
    result.push(current.replace(/^"|"$/g, ""));
    return result;
  };

  const handleSubmit = () => {
    if (!csvContent) {
      setError("Please select a file");
      return;
    }
    onImport(csvContent);
    resetForm();
    onOpenChange(false);
  };

  const resetForm = () => {
    setCsvContent("");
    setFileName("");
    setHeaders([]);
    setError("");
    setIsLoading(false);
  };

  const matchedFields = headers.filter((h) =>
    listFields.some((f) => f.name.toLowerCase() === h.toLowerCase())
  );

  const unmatchedFields = headers.filter(
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
              accept=".csv,.xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="w-full justify-start gap-2"
              disabled={isLoading}
            >
              <Upload className="h-4 w-4" />
              {isLoading ? "Reading file..." : fileName || "Choose CSV or Excel file"}
            </Button>
            <p className="text-xs text-muted-foreground">
              Supports .csv, .xlsx, and .xls files
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-destructive text-sm">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          {headers.length > 0 && (
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
          <Button onClick={handleSubmit} disabled={!csvContent || isLoading}>
            Import Leads
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
