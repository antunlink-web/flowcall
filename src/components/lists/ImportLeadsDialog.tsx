import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, FileText, AlertCircle, FileSpreadsheet } from "lucide-react";
import { ListField } from "@/hooks/useLists";
import * as XLSX from "xlsx";

interface ImportLeadsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listName: string;
  listFields: ListField[];
  onImport: (data: { headers: string[]; rows: Record<string, string>[] }) => void;
}

export function ImportLeadsDialog({
  open,
  onOpenChange,
  listName,
  listFields,
  onImport,
}: ImportLeadsDialogProps) {
  const [parsedData, setParsedData] = useState<{ headers: string[]; rows: Record<string, string>[] } | null>(null);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError("");
    setFileName(file.name);
    setIsLoading(true);
    setParsedData(null);

    const isExcel = file.name.endsWith(".xlsx") || file.name.endsWith(".xls");

    try {
      if (isExcel) {
        // Handle Excel files directly using arrayBuffer (more reliable for large files)
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert to array of arrays (more reliable than CSV)
        const jsonData: unknown[][] = XLSX.utils.sheet_to_json(worksheet, { 
          header: 1,
          defval: ""
        });
        
        if (jsonData.length === 0) {
          setError("Excel file is empty");
          setIsLoading(false);
          return;
        }
        
        // First row is headers
        const headers = (jsonData[0] as unknown[]).map(h => String(h || "").trim()).filter(h => h.length > 0);
        
        if (headers.length === 0) {
          setError("No valid headers found in Excel file");
          setIsLoading(false);
          return;
        }
        
        // Convert remaining rows to objects
        const rows: Record<string, string>[] = [];
        for (let i = 1; i < jsonData.length; i++) {
          const rowData = jsonData[i] as unknown[];
          if (!rowData || rowData.every(cell => cell === "" || cell === null || cell === undefined)) continue;
          
          const row: Record<string, string> = {};
          headers.forEach((header, index) => {
            row[header] = String(rowData[index] ?? "");
          });
          rows.push(row);
        }
        
        console.log(`Excel parsed: ${headers.length} headers, ${rows.length} rows`);
        setParsedData({ headers, rows });
        setIsLoading(false);
      } else {
        // Handle CSV files - use arrayBuffer for large file support
        const arrayBuffer = await file.arrayBuffer();
        const decoder = new TextDecoder('utf-8');
        const content = decoder.decode(arrayBuffer);
        
        console.log(`CSV file size: ${(file.size / 1024 / 1024).toFixed(2)} MB`);
        
        const { headers, rows } = parseCSVContent(content);
        
        if (headers.length === 0) {
          setError("No valid headers found in CSV file");
          setIsLoading(false);
          return;
        }
        
        console.log(`CSV parsed: ${headers.length} headers, ${rows.length} rows`);
        setParsedData({ headers, rows });
        setIsLoading(false);
      }
    } catch (err) {
      setError("Failed to read file. Please try again.");
      console.error("File read error:", err);
      setIsLoading(false);
    }
  };

  // Detect CSV delimiter
  const detectDelimiter = (line: string): string => {
    const tabCount = (line.match(/\t/g) || []).length;
    const commaCount = (line.match(/,/g) || []).length;
    const semicolonCount = (line.match(/;/g) || []).length;
    
    // Prioritize tab if present
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
        result.push(current.replace(/^"|"$/g, "").trim());
        current = "";
      } else {
        current += char;
      }
    }
    
    result.push(current.replace(/^"|"$/g, "").trim());
    return result;
  };

  // Parse entire CSV content
  const parseCSVContent = (content: string): { headers: string[]; rows: Record<string, string>[] } => {
    const normalizedContent = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    const lines = normalizedContent.trim().split("\n");
    
    if (lines.length === 0 || !lines[0]) {
      return { headers: [], rows: [] };
    }
    
    const delimiter = detectDelimiter(lines[0]);
    const headers = parseCSVLine(lines[0], delimiter).filter(h => h.length > 0);
    
    if (headers.length === 0) {
      return { headers: [], rows: [] };
    }
    
    const rows: Record<string, string>[] = [];
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      const values = parseCSVLine(lines[i], delimiter);
      const row: Record<string, string> = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || "";
      });
      rows.push(row);
    }
    
    return { headers, rows };
  };

  const handleSubmit = () => {
    if (!parsedData || parsedData.rows.length === 0) {
      setError("Please select a valid file with data");
      return;
    }
    onImport(parsedData);
    resetForm();
    onOpenChange(false);
  };

  const resetForm = () => {
    setParsedData(null);
    setFileName("");
    setError("");
    setIsLoading(false);
  };

  const headers = parsedData?.headers || [];
  const rowCount = parsedData?.rows.length || 0;

  const matchedFields = headers.filter((h) =>
    listFields.some((f) => f.name.toLowerCase() === h.toLowerCase())
  );

  const unmatchedFields = headers.filter(
    (h) => !listFields.some((f) => f.name.toLowerCase() === h.toLowerCase())
  );

  const isExcelFile = fileName.endsWith(".xlsx") || fileName.endsWith(".xls");

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
              {isExcelFile ? (
                <FileSpreadsheet className="h-4 w-4" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
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

          {parsedData && headers.length > 0 && (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-md">
                <p className="text-sm font-medium">
                  Found {rowCount.toLocaleString()} leads with {headers.length} fields
                </p>
              </div>

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
          <Button onClick={handleSubmit} disabled={!parsedData || parsedData.rows.length === 0 || isLoading}>
            Import {rowCount > 0 ? `${rowCount.toLocaleString()} ` : ""}Leads
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}