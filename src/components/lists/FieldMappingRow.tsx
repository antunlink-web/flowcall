import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRight, Check, AlertCircle } from "lucide-react";
import { ListField } from "@/hooks/useLists";

interface FieldMappingRowProps {
  csvHeader: string;
  listFields: ListField[];
  selectedFieldId: string | null;
  usedFieldIds: Set<string>;
  onSelect: (fieldId: string | null) => void;
}

export function FieldMappingRow({
  csvHeader,
  listFields,
  selectedFieldId,
  usedFieldIds,
  onSelect,
}: FieldMappingRowProps) {
  const selectedField = listFields.find((f) => f.id === selectedFieldId);
  const isMatched = !!selectedFieldId;

  return (
    <div className="flex items-center gap-2 py-2 border-b last:border-b-0">
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium truncate block">{csvHeader}</span>
      </div>
      
      <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      
      <div className="flex-1 min-w-0">
        <Select
          value={selectedFieldId || "unmapped"}
          onValueChange={(value) => onSelect(value === "unmapped" ? null : value)}
        >
          <SelectTrigger className={`h-8 text-sm ${isMatched ? "border-green-300 bg-green-50" : "border-orange-300 bg-orange-50"}`}>
            <SelectValue placeholder="Select field..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="unmapped">
              <span className="text-muted-foreground">Don't import</span>
            </SelectItem>
            {listFields.map((field) => {
              const isUsed = usedFieldIds.has(field.id) && field.id !== selectedFieldId;
              return (
                <SelectItem 
                  key={field.id} 
                  value={field.id}
                  disabled={isUsed}
                >
                  <span className={isUsed ? "text-muted-foreground" : ""}>
                    {field.name}
                    {isUsed && " (already mapped)"}
                  </span>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      <div className="w-5 flex-shrink-0">
        {isMatched ? (
          <Check className="h-4 w-4 text-green-600" />
        ) : (
          <AlertCircle className="h-4 w-4 text-orange-500" />
        )}
      </div>
    </div>
  );
}
