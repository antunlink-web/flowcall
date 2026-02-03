import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, UserPlus } from "lucide-react";
import { ListField } from "@/hooks/useLists";

interface AddContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fields: ListField[];
  onSubmit: (data: Record<string, string>) => Promise<void>;
}

export function AddContactDialog({
  open,
  onOpenChange,
  fields,
  onSubmit,
}: AddContactDialogProps) {
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSubmit(formData);
      setFormData({});
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setFormData({});
    onOpenChange(false);
  };

  const getInputType = (fieldType: ListField["type"]): string => {
    switch (fieldType) {
      case "Phone":
        return "tel";
      case "E-mail":
        return "email";
      case "www":
        return "url";
      case "Number":
        return "number";
      case "Date":
        return "date";
      default:
        return "text";
    }
  };

  const getPlaceholder = (field: ListField): string => {
    switch (field.type) {
      case "Phone":
        return "+1 234 567 890";
      case "E-mail":
        return "email@example.com";
      case "www":
        return "https://example.com";
      case "Number":
        return "0";
      case "Date":
        return "";
      default:
        return `Enter ${field.name.toLowerCase()}`;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Add Contact
          </DialogTitle>
          <DialogDescription>
            Fill in the contact details below. All fields are optional.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {fields.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No fields configured for this list. Add fields first.
            </p>
          ) : (
            fields.map((field) => (
              <div key={field.id} className="space-y-2">
                <Label htmlFor={field.id}>{field.name}</Label>
                <Input
                  id={field.id}
                  type={getInputType(field.type)}
                  placeholder={getPlaceholder(field)}
                  value={formData[field.name] || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      [field.name]: e.target.value,
                    }))
                  }
                />
              </div>
            ))
          )}

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || fields.length === 0}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Contact
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
