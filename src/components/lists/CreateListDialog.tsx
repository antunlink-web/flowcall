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
import { Upload, FileText } from "lucide-react";
import { ListField, extractFieldsFromCsv } from "@/hooks/useLists";

interface CreateListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateList: (
    name: string,
    fields: ListField[],
    description: string,
    csvContent: string
  ) => void;
}

export function CreateListDialog({
  open,
  onOpenChange,
  onCreateList,
}: CreateListDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [csvContent, setCsvContent] = useState("");
  const [csvFileName, setCsvFileName] = useState("");
  const [extractedFields, setExtractedFields] = useState<ListField[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setCsvContent(content);
      const fields = extractFieldsFromCsv(content);
      setExtractedFields(fields);
    };
    reader.readAsText(file);
  };

  const handleSubmit = () => {
    if (!name.trim() || extractedFields.length === 0) return;
    onCreateList(name, extractedFields, description, csvContent);
    resetForm();
  };

  const resetForm = () => {
    setName("");
    setDescription("");
    setCsvContent("");
    setCsvFileName("");
    setExtractedFields([]);
  };

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
            <Label>Upload CSV File *</Label>
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

          {extractedFields.length > 0 && (
            <div className="space-y-2">
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
            disabled={!name.trim() || extractedFields.length === 0}
          >
            Create List & Import Leads
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
