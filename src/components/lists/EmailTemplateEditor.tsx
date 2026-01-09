import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Link2,
  Quote,
  Code,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
} from "lucide-react";
import { ListField } from "@/hooks/useLists";

interface EmailTemplateEditorProps {
  templateName: string;
  templateSubject: string;
  templateBody: string;
  onNameChange: (value: string) => void;
  onSubjectChange: (value: string) => void;
  onBodyChange: (value: string) => void;
  fields: ListField[];
  onSave: () => void;
  onCancel: () => void;
  isEditing: boolean;
  previewData?: Record<string, string> | null;
}

// System merge tags that are always available
const systemMergeTags = [
  { fieldName: "IMONE", mergeTag: "{{ imone | default: '' }}" },
  { fieldName: "Telefonas", mergeTag: "{{ telefonas_1 | default: '' }}" },
  { fieldName: "Svetaine (www)", mergeTag: "{{ svetaine_2 | default: '' }}" },
  { fieldName: "Telefonas 1", mergeTag: "{{ telefonas_3 | default: '' }}" },
  { fieldName: "Facebook URL", mergeTag: "{{ facebook_url | default: '' }}" },
  { fieldName: "AOBJECTSADDR", mergeTag: "{{ aobjectsaddr | default: '' }}" },
  { fieldName: "Svetaine", mergeTag: "{{ svetaine | default: '' }}" },
  { fieldName: "Tinklapis", mergeTag: "{{ tinklapis | default: '' }}" },
  { fieldName: "El. paštas", mergeTag: "{{ el._pastas | default: '' }}" },
  { fieldName: "REMARK", mergeTag: "{{ remark | default: '' }}" },
  { fieldName: "ESAL", mergeTag: "{{ esal | default: '' }}" },
  { fieldName: "Agent first name", mergeTag: "{{ agent_first_name }}" },
  { fieldName: "Agent last name", mergeTag: "{{ agent_last_name }}" },
  { fieldName: "Agent full name", mergeTag: "{{ agent_full_name | default: '' }}" },
  { fieldName: "Agent E-mail", mergeTag: "{{ agent_email | default: '' }}" },
  { fieldName: "Agent Company name", mergeTag: "{{ agent_company_name }}" },
  { fieldName: "Agent title", mergeTag: "{{ agent_title - default: '' }}" },
  { fieldName: "Agent Phone", mergeTag: "{{ agent_phone | default: '' }}" },
  { fieldName: "Agent Mobile", mergeTag: "{{ agent_mobile | default: '' }}" },
  { fieldName: "Agent Web", mergeTag: "{{ agent_web }}" },
  { fieldName: "Agent Custom 1", mergeTag: "{{ agent_custom_1 | defa... }}" },
  { fieldName: "Agent Custom 2", mergeTag: "{{ agent_custom_2 | defa... }}" },
];

export function EmailTemplateEditor({
  templateName,
  templateSubject,
  templateBody,
  onNameChange,
  onSubjectChange,
  onBodyChange,
  fields,
  onSave,
  onCancel,
  isEditing,
  previewData,
}: EmailTemplateEditorProps) {
  const [selectedMergeTag, setSelectedMergeTag] = useState<string>("");
  const bodyTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Generate merge tags from fields
  const fieldMergeTags = fields.map((field) => ({
    fieldName: field.name,
    mergeTag: `{{ ${field.name.toLowerCase().replace(/\s+/g, "_")} | default: '' }}`,
  }));

  const allMergeTags = [...fieldMergeTags, ...systemMergeTags.filter(
    st => !fieldMergeTags.some(ft => ft.fieldName.toLowerCase() === st.fieldName.toLowerCase())
  )];

  const insertMergeTag = useCallback((tag: string) => {
    if (!bodyTextareaRef.current) return;
    
    const textarea = bodyTextareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newValue = templateBody.substring(0, start) + tag + templateBody.substring(end);
    onBodyChange(newValue);
    
    // Set cursor position after the inserted tag
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + tag.length, start + tag.length);
    }, 0);
  }, [templateBody, onBodyChange]);

  const handleMergeTagSelect = (value: string) => {
    if (value) {
      insertMergeTag(value);
      setSelectedMergeTag("");
    }
  };

  const applyFormatting = (format: string) => {
    if (!bodyTextareaRef.current) return;
    
    const textarea = bodyTextareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = templateBody.substring(start, end);
    
    let formattedText = "";
    switch (format) {
      case "bold":
        formattedText = `<strong>${selectedText}</strong>`;
        break;
      case "italic":
        formattedText = `<em>${selectedText}</em>`;
        break;
      case "underline":
        formattedText = `<u>${selectedText}</u>`;
        break;
      case "strikethrough":
        formattedText = `<s>${selectedText}</s>`;
        break;
      case "link":
        formattedText = `<a href="">${selectedText}</a>`;
        break;
      case "quote":
        formattedText = `<blockquote>${selectedText}</blockquote>`;
        break;
      case "code":
        formattedText = `<code>${selectedText}</code>`;
        break;
      case "ul":
        formattedText = `<ul>\n<li>${selectedText}</li>\n</ul>`;
        break;
      case "ol":
        formattedText = `<ol>\n<li>${selectedText}</li>\n</ol>`;
        break;
      default:
        formattedText = selectedText;
    }
    
    const newValue = templateBody.substring(0, start) + formattedText + templateBody.substring(end);
    onBodyChange(newValue);
    
    setTimeout(() => {
      textarea.focus();
    }, 0);
  };

  // Replace merge tags with preview data for preview
  const getPreviewContent = (content: string): string => {
    if (!previewData) return content;
    
    let previewContent = content;
    allMergeTags.forEach((tag) => {
      const fieldKey = tag.fieldName;
      const value = previewData[fieldKey] || "";
      const tagPattern = new RegExp(tag.mergeTag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      previewContent = previewContent.replace(tagPattern, value);
    });
    
    return previewContent;
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Configure {templateName || "Template"}</h2>
      
      {/* Template Name */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">
          * Template name
        </Label>
        <Input
          value={templateName}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="Template name"
          className="max-w-md"
        />
        <p className="text-xs text-muted-foreground">
          Use a descriptive name - will be visible to agents on lead screen
        </p>
      </div>

      {/* Email Subject */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">
          * Email subject
        </Label>
        <Input
          value={templateSubject}
          onChange={(e) => onSubjectChange(e.target.value)}
          placeholder="Subject line with merge tags"
          className="bg-amber-50 border-amber-200"
        />
      </div>

      {/* Email Body */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Email body</Label>
        
        {/* Toolbar */}
        <div className="flex items-center gap-1 border border-border rounded-t bg-muted/50 p-1.5 flex-wrap">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => applyFormatting("bold")}
          >
            <Bold className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => applyFormatting("italic")}
          >
            <Italic className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => applyFormatting("underline")}
          >
            <Underline className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => applyFormatting("strikethrough")}
          >
            <Strikethrough className="h-4 w-4" />
          </Button>
          
          <div className="w-px h-6 bg-border mx-1" />
          
          <Select defaultValue="normal">
            <SelectTrigger className="h-8 w-auto min-w-[100px] text-xs">
              <SelectValue placeholder="Normal" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="h1">Heading 1</SelectItem>
              <SelectItem value="h2">Heading 2</SelectItem>
              <SelectItem value="h3">Heading 3</SelectItem>
            </SelectContent>
          </Select>
          
          <div className="w-px h-6 bg-border mx-1" />
          
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => applyFormatting("link")}
          >
            <Link2 className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => applyFormatting("quote")}
          >
            <Quote className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => applyFormatting("code")}
          >
            <Code className="h-4 w-4" />
          </Button>
          
          <div className="w-px h-6 bg-border mx-1" />
          
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => applyFormatting("ul")}
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => applyFormatting("ol")}
          >
            <ListOrdered className="h-4 w-4" />
          </Button>
          
          <div className="w-px h-6 bg-border mx-1" />
          
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
          >
            <AlignLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
          >
            <AlignCenter className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
          >
            <AlignRight className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Textarea */}
        <Textarea
          ref={bodyTextareaRef}
          value={templateBody}
          onChange={(e) => onBodyChange(e.target.value)}
          placeholder="Write your email body here..."
          className="min-h-[400px] rounded-t-none border-t-0 font-mono text-sm"
        />
      </div>

      {/* Insert Merge Tag */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Insert merge tag</Label>
        <Select value={selectedMergeTag} onValueChange={handleMergeTagSelect}>
          <SelectTrigger className="max-w-md">
            <SelectValue placeholder="Select a field name to insert as merge tag in the template" />
          </SelectTrigger>
          <SelectContent>
            {allMergeTags.map((tag, index) => (
              <SelectItem key={index} value={tag.mergeTag}>
                {tag.fieldName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-3">
        <Button onClick={onSave} className="bg-destructive hover:bg-destructive/90">
          {isEditing ? "Update" : "Create"}
        </Button>
        <Button variant="link" onClick={onCancel} className="text-muted-foreground">
          Cancel
        </Button>
      </div>

      {/* Preview and Merge Tags Table */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-6 border-t">
        {/* Preview */}
        <div className="space-y-2">
          <h3 className="font-medium">Preview</h3>
          <p className="text-xs text-muted-foreground">Refresh page to see a different sample</p>
          
          <div className="border border-border rounded bg-muted/30 p-4 min-h-[200px]">
            <div className="mb-2">
              <span className="font-medium">Subject:</span>{" "}
              <span className="text-muted-foreground">{getPreviewContent(templateSubject) || "(no subject)"}</span>
            </div>
            <div 
              className="prose prose-sm max-w-none text-sm"
              dangerouslySetInnerHTML={{ __html: getPreviewContent(templateBody) || "<p class='text-muted-foreground'>(no content)</p>" }}
            />
          </div>
        </div>

        {/* Available Merge Tags */}
        <div className="space-y-2">
          <h3 className="font-medium">Available merge tags</h3>
          <p className="text-xs text-muted-foreground">
            Copy/paste text including an email field and you'll insert the value for the 
            field from the lead records to be personalized during sending, or use the dropdown 
            above.
          </p>
          
          <div className="border border-border rounded overflow-hidden max-h-[400px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-medium">Field Name</TableHead>
                  <TableHead className="font-medium">Merge Tag</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allMergeTags.map((tag, index) => (
                  <TableRow key={index}>
                    <TableCell className="py-2">{tag.fieldName}</TableCell>
                    <TableCell className="py-2">
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                        {tag.mergeTag}
                      </code>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
}
