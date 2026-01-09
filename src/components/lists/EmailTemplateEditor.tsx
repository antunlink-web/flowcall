import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Link2,
  Quote,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Image,
  Heading1,
  Heading2,
  Heading3,
  Undo,
  Redo,
  Type,
  Palette,
} from "lucide-react";
import { ListField } from "@/hooks/useLists";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import ImageExtension from "@tiptap/extension-image";
import LinkExtension from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import UnderlineExtension from "@tiptap/extension-underline";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Placeholder from "@tiptap/extension-placeholder";

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

const TEXT_COLORS = [
  { name: "Default", value: "" },
  { name: "Black", value: "#000000" },
  { name: "Dark Gray", value: "#4a4a4a" },
  { name: "Gray", value: "#9b9b9b" },
  { name: "Red", value: "#e74c3c" },
  { name: "Orange", value: "#e67e22" },
  { name: "Yellow", value: "#f1c40f" },
  { name: "Green", value: "#27ae60" },
  { name: "Blue", value: "#3498db" },
  { name: "Purple", value: "#9b59b6" },
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
  const [linkUrl, setLinkUrl] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      UnderlineExtension,
      ImageExtension.configure({
        allowBase64: true,
        HTMLAttributes: {
          class: "max-w-full h-auto",
        },
      }),
      LinkExtension.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-primary underline",
        },
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      TextStyle,
      Color,
      Placeholder.configure({
        placeholder: "Write your professional email here...",
      }),
    ],
    content: templateBody || "",
    onUpdate: ({ editor }) => {
      onBodyChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none min-h-[400px] p-4 focus:outline-none",
      },
    },
  });

  // Update editor content when templateBody prop changes externally
  useEffect(() => {
    if (editor && templateBody !== editor.getHTML()) {
      editor.commands.setContent(templateBody || "");
    }
  }, [templateBody, editor]);

  // Generate merge tags from fields
  const fieldMergeTags = fields.map((field) => ({
    fieldName: field.name,
    mergeTag: `{{ ${field.name.toLowerCase().replace(/\s+/g, "_")} | default: '' }}`,
  }));

  const allMergeTags = [...fieldMergeTags, ...systemMergeTags.filter(
    st => !fieldMergeTags.some(ft => ft.fieldName.toLowerCase() === st.fieldName.toLowerCase())
  )];

  const insertMergeTag = useCallback((tag: string) => {
    if (editor) {
      editor.chain().focus().insertContent(tag).run();
    }
  }, [editor]);

  const handleMergeTagSelect = (value: string) => {
    if (value) {
      insertMergeTag(value);
      setSelectedMergeTag("");
    }
  };

  const addLink = useCallback(() => {
    if (linkUrl && editor) {
      editor.chain().focus().extendMarkRange("link").setLink({ href: linkUrl }).run();
      setLinkUrl("");
    }
  }, [editor, linkUrl]);

  const addImage = useCallback(() => {
    if (imageUrl && editor) {
      editor.chain().focus().setImage({ src: imageUrl }).run();
      setImageUrl("");
    }
  }, [editor, imageUrl]);

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && editor) {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        editor.chain().focus().setImage({ src: base64 }).run();
      };
      reader.readAsDataURL(file);
    }
  }, [editor]);

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

  if (!editor) {
    return null;
  }

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

      {/* Email Body with TipTap Editor */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Email body</Label>
        
        {/* Toolbar */}
        <div className="flex items-center gap-1 border border-border rounded-t bg-muted/50 p-1.5 flex-wrap">
          {/* Undo/Redo */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
          >
            <Undo className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
          >
            <Redo className="h-4 w-4" />
          </Button>

          <div className="w-px h-6 bg-border mx-1" />

          {/* Text formatting */}
          <Button
            type="button"
            variant={editor.isActive("bold") ? "secondary" : "ghost"}
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            <Bold className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant={editor.isActive("italic") ? "secondary" : "ghost"}
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            <Italic className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant={editor.isActive("underline") ? "secondary" : "ghost"}
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => editor.chain().focus().toggleUnderline().run()}
          >
            <Underline className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant={editor.isActive("strike") ? "secondary" : "ghost"}
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => editor.chain().focus().toggleStrike().run()}
          >
            <Strikethrough className="h-4 w-4" />
          </Button>
          
          <div className="w-px h-6 bg-border mx-1" />

          {/* Headings */}
          <Button
            type="button"
            variant={editor.isActive("heading", { level: 1 }) ? "secondary" : "ghost"}
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          >
            <Heading1 className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant={editor.isActive("heading", { level: 2 }) ? "secondary" : "ghost"}
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          >
            <Heading2 className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant={editor.isActive("heading", { level: 3 }) ? "secondary" : "ghost"}
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          >
            <Heading3 className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant={editor.isActive("paragraph") ? "secondary" : "ghost"}
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => editor.chain().focus().setParagraph().run()}
          >
            <Type className="h-4 w-4" />
          </Button>
          
          <div className="w-px h-6 bg-border mx-1" />

          {/* Color picker */}
          <Popover>
            <PopoverTrigger asChild>
              <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0">
                <Palette className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2">
              <div className="grid grid-cols-5 gap-1">
                {TEXT_COLORS.map((color) => (
                  <button
                    key={color.name}
                    className="w-6 h-6 rounded border border-border hover:scale-110 transition-transform"
                    style={{ backgroundColor: color.value || "#ffffff" }}
                    onClick={() => {
                      if (color.value) {
                        editor.chain().focus().setColor(color.value).run();
                      } else {
                        editor.chain().focus().unsetColor().run();
                      }
                    }}
                    title={color.name}
                  />
                ))}
              </div>
            </PopoverContent>
          </Popover>
          
          <div className="w-px h-6 bg-border mx-1" />

          {/* Lists */}
          <Button
            type="button"
            variant={editor.isActive("bulletList") ? "secondary" : "ghost"}
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant={editor.isActive("orderedList") ? "secondary" : "ghost"}
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          >
            <ListOrdered className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant={editor.isActive("blockquote") ? "secondary" : "ghost"}
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
          >
            <Quote className="h-4 w-4" />
          </Button>
          
          <div className="w-px h-6 bg-border mx-1" />
          
          {/* Alignment */}
          <Button
            type="button"
            variant={editor.isActive({ textAlign: "left" }) ? "secondary" : "ghost"}
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => editor.chain().focus().setTextAlign("left").run()}
          >
            <AlignLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant={editor.isActive({ textAlign: "center" }) ? "secondary" : "ghost"}
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => editor.chain().focus().setTextAlign("center").run()}
          >
            <AlignCenter className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant={editor.isActive({ textAlign: "right" }) ? "secondary" : "ghost"}
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => editor.chain().focus().setTextAlign("right").run()}
          >
            <AlignRight className="h-4 w-4" />
          </Button>
          
          <div className="w-px h-6 bg-border mx-1" />

          {/* Link */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant={editor.isActive("link") ? "secondary" : "ghost"}
                size="sm"
                className="h-8 w-8 p-0"
              >
                <Link2 className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="space-y-3">
                <Label className="text-sm font-medium">Insert Link</Label>
                <Input
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://example.com"
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={addLink}>
                    Add Link
                  </Button>
                  {editor.isActive("link") && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => editor.chain().focus().unsetLink().run()}
                    >
                      Remove Link
                    </Button>
                  )}
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* Image */}
          <Popover>
            <PopoverTrigger asChild>
              <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0">
                <Image className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="space-y-3">
                <Label className="text-sm font-medium">Insert Image</Label>
                <div className="space-y-2">
                  <Input
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://example.com/image.jpg"
                  />
                  <Button size="sm" onClick={addImage} className="w-full">
                    Add from URL
                  </Button>
                </div>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-popover px-2 text-muted-foreground">Or</span>
                  </div>
                </div>
                <div>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="cursor-pointer"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Upload from your computer
                  </p>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
        
        {/* TipTap Editor */}
        <div className="border border-t-0 border-border rounded-b bg-background">
          <EditorContent editor={editor} />
        </div>
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
          
          <div className="border border-border rounded bg-white p-4 min-h-[200px]">
            <div className="mb-2 pb-2 border-b">
              <span className="font-medium">Subject:</span>{" "}
              <span className="text-muted-foreground">{getPreviewContent(templateSubject) || "(no subject)"}</span>
            </div>
            <div 
              className="prose prose-sm max-w-none text-sm"
              dangerouslySetInnerHTML={{ __html: getPreviewContent(editor.getHTML()) || "<p class='text-muted-foreground'>(no content)</p>" }}
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
