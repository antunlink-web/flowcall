import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GripVertical, Settings2, Trash2, Plus, Info } from "lucide-react";
import { ListField } from "@/hooks/useLists";

interface FieldsEditorProps {
  fields: ListField[];
  onFieldsChange: (fields: ListField[]) => void;
  onSave: () => void;
}

export function FieldsEditor({ fields, onFieldsChange, onSave }: FieldsEditorProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const updateField = (index: number, updates: Partial<ListField>) => {
    const newFields = fields.map((f, i) =>
      i === index ? { ...f, ...updates } : f
    );
    onFieldsChange(newFields);
  };

  const deleteField = (index: number) => {
    onFieldsChange(fields.filter((_, i) => i !== index));
  };

  const addField = () => {
    onFieldsChange([
      ...fields,
      {
        id: `field_${Date.now()}`,
        name: "New Field",
        type: "String (standard)",
        show: true,
      },
    ]);
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newFields = [...fields];
    const draggedItem = newFields[draggedIndex];
    newFields.splice(draggedIndex, 1);
    newFields.splice(index, 0, draggedItem);
    onFieldsChange(newFields);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded p-4 text-sm flex items-start gap-2">
        <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
        <div>
          <span className="font-medium text-blue-800">Hint:</span>
          <span className="text-blue-700"> Grab the handle and drag to arrange the order in which lead information is shown</span>
        </div>
      </div>

      <div className="space-y-2">
        <div className="grid grid-cols-[40px_1fr_150px_40px_60px_40px] gap-2 px-2 py-1 text-sm font-medium text-muted-foreground">
          <div></div>
          <div>Field Name</div>
          <div>Type</div>
          <div></div>
          <div className="text-center">Show</div>
          <div></div>
        </div>

        {fields.map((field, index) => (
          <div
            key={field.id}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnd={handleDragEnd}
            className={`grid grid-cols-[40px_1fr_150px_40px_60px_40px] gap-2 items-center bg-background border border-border rounded p-2 ${
              draggedIndex === index ? "opacity-50" : ""
            }`}
          >
            <div className="flex items-center justify-center cursor-move">
              <GripVertical className="h-5 w-5 text-muted-foreground" />
            </div>
            <Input
              value={field.name}
              onChange={(e) => updateField(index, { name: e.target.value })}
              className="h-9"
            />
            <Select
              value={field.type}
              onValueChange={(value) =>
                updateField(index, { type: value as ListField["type"] })
              }
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-background border shadow-lg z-50">
                <SelectItem value="String (standard)">String (standard)</SelectItem>
                <SelectItem value="Phone">Phone</SelectItem>
                <SelectItem value="E-mail">E-mail</SelectItem>
                <SelectItem value="www">www</SelectItem>
                <SelectItem value="Number">Number</SelectItem>
                <SelectItem value="Date">Date</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <Settings2 className="h-4 w-4" />
            </Button>
            <div className="flex items-center justify-center">
              <Checkbox
                checked={field.show}
                onCheckedChange={(checked) =>
                  updateField(index, { show: !!checked })
                }
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-muted-foreground hover:text-destructive"
              onClick={() => deleteField(index)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}

        <div className="flex items-center gap-4 pt-2">
          <Button variant="ghost" className="text-primary" onClick={addField}>
            <Plus className="h-4 w-4 mr-2" />
            Add field
          </Button>
          <Button onClick={onSave} className="bg-destructive hover:bg-destructive/90">
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}
