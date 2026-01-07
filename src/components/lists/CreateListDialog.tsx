import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Upload, FileText, FileSpreadsheet } from "lucide-react";
import { ListField } from "@/hooks/useLists";
import * as XLSX from "xlsx";

interface CreateListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateList: (
    name: string,
    fields: ListField[],
    description: string,
    data: { headers: string[]; rows: Record<string, string>[] }
  ) => void;
}

export function CreateListDialog({
  open,
  onOpenChange,
  onCreateList,
}: CreateListDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [parsedData, setParsedData] = useState<{ headers: string[]; rows: Record<string, string>[] } | null>(null);
  const [fileName, setFileName] = useState("");
  const [extractedFields, setExtractedFields] = useState<ListField[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        result.push(current.replace(/^"|"$/g, "").trim());
        current = "";
      } else {
        current += char;
      }
    }
    
    result.push(current.replace(/^"|"$/g, "").trim());
    return result;
  };

  const extractFieldsFromHeaders = (headers: string[]): ListField[] => {
    return headers.map((header, index) => {
      const lowerHeader = header.toLowerCase();
      let type: ListField["type"] = "String (standard)";

      if (lowerHeader.includes("phone") || lowerHeader.includes("tel") || lowerHeader.includes("mobile") || lowerHeader.includes("telefon")) {
        type = "Phone";
      } else if (lowerHeader.includes("email") || lowerHeader.includes("e-mail") || lowerHeader.includes("mail")) {
        type = "E-mail";
      } else if (lowerHeader.includes("url") || lowerHeader.includes("www") || lowerHeader.includes("website") || lowerHeader.includes("link")) {
        type = "www";
      } else if (lowerHeader.includes("date") || lowerHeader.includes("data")) {
        type = "Date";
      }

      return {
        id: `field_${index}`,
        name: header,
        type,
        show: true,
      };
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsLoading(true);
    setParsedData(null);
    setExtractedFields([]);

    const isExcel = file.name.endsWith(".xlsx") || file.name.endsWith(".xls");

    try {
      if (isExcel) {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        const jsonData: unknown[][] = XLSX.utils.sheet_to_json(worksheet, { 
          header: 1,
          defval: ""
        });
        
        if (jsonData.length === 0) {
          setIsLoading(false);
          return;
        }
        
        const headers = (jsonData[0] as unknown[]).map(h => String(h || "").trim()).filter(h => h.length > 0);
        
        if (headers.length === 0) {
          setIsLoading(false);
          return;
        }
        
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
        
        setParsedData({ headers, rows });
        setExtractedFields(extractFieldsFromHeaders(headers));
      } else {
        const reader = new FileReader();
        reader.onload = (event) => {
          const content = event.target?.result as string;
          const normalizedContent = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
          const lines = normalizedContent.trim().split("\n");
          
          if (lines.length === 0 || !lines[0]) {
            setIsLoading(false);
            return;
          }
          
          const delimiter = detectDelimiter(lines[0]);
          const headers = parseCSVLine(lines[0], delimiter).filter(h => h.length > 0);
          
          if (headers.length === 0) {
            setIsLoading(false);
            return;
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
          
          setParsedData({ headers, rows });
          setExtractedFields(extractFieldsFromHeaders(headers));
          setIsLoading(false);
        };
        reader.readAsText(file);
        return;
      }
    } catch (err) {
      console.error("File read error:", err);
    }
    setIsLoading(false);
  };

  const handleSubmit = () => {
    if (!name.trim() || extractedFields.length === 0 || !parsedData) return;
    onCreateList(name, extractedFields, description, parsedData);
    resetForm();
  };

  const resetForm = () => {
    setName("");
    setDescription("");
    setParsedData(null);
    setFileName("");
    setExtractedFields([]);
    setIsLoading(false);
  };

  const isExcelFile = fileName.endsWith(".xlsx") || fileName.endsWith(".xls");
  const rowCount = parsedData?.rows.length || 0;

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) resetForm(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create New List</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="list-name">List Name *</Label>
            <Input
              id="list-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter list name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="list-description">Description</Label>
            <Textarea
              id="list-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Upload CSV or Excel File *</Label>
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

          {parsedData && extractedFields.length > 0 && (
            <div className="space-y-2">
              <div className="p-3 bg-muted rounded-md">
                <p className="text-sm font-medium">
                  Found {rowCount.toLocaleString()} leads with {extractedFields.length} fields
                </p>
              </div>
              <Label>Detected Fields ({extractedFields.length})</Label>
              <div className="border rounded p-3 max-h-40 overflow-y-auto bg-muted/30">
                <div className="flex flex-wrap gap-2">
                  {extractedFields.map((field) => (
                    <span
                      key={field.id}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded bg-background border text-sm"
                    >
                      <FileText className="h-3 w-3" />
                      {field.name}
                      <span className="text-xs text-muted-foreground">({field.type})</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!name.trim() || extractedFields.length === 0 || !parsedData || isLoading}
          >
            Create List & Import {rowCount > 0 ? `${rowCount.toLocaleString()} ` : ""}Leads
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}