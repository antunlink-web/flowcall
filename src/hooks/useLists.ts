import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ListField {
  id: string;
  name: string;
  type: "String (standard)" | "Phone" | "E-mail" | "www" | "Number" | "Date";
  show: boolean;
}

export interface ListSettings {
  prependPhone?: string;
  inlineIdentifiers?: boolean;
  lockOnDefaults?: boolean;
  internalColleaguesOnly?: boolean;
  isBlocklist?: boolean;
  ccEmail?: string;
  prioritiseNewLeads?: boolean;
  script?: string;
  // Category settings
  callbackCategories?: string;
  winnerCategories?: string;
  loserCategories?: string;
  archiveCategories?: string;
}

export interface List {
  id: string;
  name: string;
  description: string | null;
  fields: ListField[];
  settings: ListSettings;
  status: "active" | "archived" | "blocklist";
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Computed stats
  total?: number;
  new?: number;
  callback?: number;
  won?: number;
  lost?: number;
}

export function useLists() {
  const [lists, setLists] = useState<List[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadProgress, setUploadProgress] = useState({
    isUploading: false,
    progress: 0,
    message: "",
  });
  const fetchLists = async () => {
    setLoading(true);
    try {
      // Fetch lists
      const { data: listsData, error: listsError } = await supabase
        .from("lists")
        .select("*")
        .order("created_at", { ascending: false });

      if (listsError) throw listsError;

      // Fetch lead counts per list - use pagination to get all leads (bypass 1000 limit)
      let allLeadCounts: { list_id: string | null; status: string }[] = [];
      let from = 0;
      const pageSize = 1000;
      
      while (true) {
        const { data: leadCounts, error: countsError } = await supabase
          .from("leads")
          .select("list_id, status")
          .range(from, from + pageSize - 1);

        if (countsError) throw countsError;
        
        if (!leadCounts || leadCounts.length === 0) break;
        
        allLeadCounts = [...allLeadCounts, ...leadCounts];
        
        if (leadCounts.length < pageSize) break;
        from += pageSize;
      }

      // Calculate stats for each list
      const listsWithStats = (listsData || []).map((list) => {
        const listLeads = allLeadCounts?.filter((l) => l.list_id === list.id) || [];
        return {
          ...list,
          fields: (list.fields as unknown as ListField[]) || [],
          settings: (list.settings as unknown as ListSettings) || {},
          total: listLeads.length,
          new: listLeads.filter((l) => l.status === "new").length,
          callback: listLeads.filter((l) => l.status === "callback").length,
          won: listLeads.filter((l) => l.status === "won").length,
          lost: listLeads.filter((l) => l.status === "lost").length,
        } as List;
      });

      setLists(listsWithStats);
    } catch (error: unknown) {
      console.error("Error fetching lists:", error);
      toast.error("Failed to fetch lists");
    } finally {
      setLoading(false);
    }
  };

  const createList = async (
    name: string,
    fields: ListField[],
    description?: string
  ): Promise<List | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from("lists")
        .insert([{
          name,
          description,
          fields: JSON.parse(JSON.stringify(fields)),
          created_by: user?.id,
        }])
        .select()
        .single();

      if (error) throw error;

      const newList = {
        ...data,
        fields: data.fields as unknown as ListField[],
        settings: data.settings as unknown as ListSettings,
        total: 0,
        new: 0,
        callback: 0,
        won: 0,
        lost: 0,
      } as List;

      setLists((prev) => [newList, ...prev]);
      toast.success("List created successfully");
      return newList;
    } catch (error: unknown) {
      console.error("Error creating list:", error);
      toast.error("Failed to create list");
      return null;
    }
  };

  const updateList = async (
    id: string,
    updates: Partial<Pick<List, "name" | "description" | "fields" | "settings" | "status">>
  ): Promise<boolean> => {
    try {
      const updateData: Record<string, unknown> = {};
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.fields !== undefined) updateData.fields = updates.fields;
      if (updates.settings !== undefined) updateData.settings = updates.settings;
      if (updates.status !== undefined) updateData.status = updates.status;

      const { error } = await supabase
        .from("lists")
        .update(updateData)
        .eq("id", id);

      if (error) throw error;

      setLists((prev) =>
        prev.map((list) =>
          list.id === id ? { ...list, ...updates } : list
        )
      );
      toast.success("List updated successfully");
      return true;
    } catch (error: unknown) {
      console.error("Error updating list:", error);
      toast.error("Failed to update list");
      return false;
    }
  };

  const deleteList = async (id: string): Promise<boolean> => {
    try {
      // First delete all leads associated with this list
      const { error: leadsError } = await supabase
        .from("leads")
        .delete()
        .eq("list_id", id);

      if (leadsError) {
        console.error("Error deleting leads:", leadsError);
        // Continue anyway to try deleting the list
      }

      // Now delete the list
      const { error } = await supabase.from("lists").delete().eq("id", id);

      if (error) throw error;

      setLists((prev) => prev.filter((list) => list.id !== id));
      toast.success("List and all its leads deleted successfully");
      return true;
    } catch (error: unknown) {
      console.error("Error deleting list:", error);
      toast.error("Failed to delete list");
      return false;
    }
  };

  const importLeadsFromData = async (
    listId: string,
    rows: Record<string, string>[]
  ): Promise<number> => {
    try {
      setUploadProgress({ isUploading: true, progress: 0, message: "Preparing import..." });
      
      if (rows.length === 0) {
        toast.error("No data rows to import");
        setUploadProgress({ isUploading: false, progress: 0, message: "" });
        return 0;
      }

      const leads = rows.map((data) => ({
        list_id: listId,
        data,
        status: "new",
      }));

      // Use smaller batch size for reliability with large datasets
      const batchSize = 100;
      let inserted = 0;
      let failed = 0;
      const totalLeads = leads.length;

      for (let i = 0; i < leads.length; i += batchSize) {
        const batch = leads.slice(i, i + batchSize);
        const progress = Math.min(((i + batch.length) / totalLeads) * 100, 99);
        
        setUploadProgress({ 
          isUploading: true, 
          progress, 
          message: `Importing leads... (${Math.min(i + batch.length, totalLeads).toLocaleString()} of ${totalLeads.toLocaleString()})` 
        });
        
        const { error, data } = await supabase.from("leads").insert(batch).select("id");
        if (error) {
          console.error("Batch insert error at batch starting", i, ":", error);
          failed += batch.length;
          // Continue with next batch instead of failing completely
          continue;
        }
        inserted += data?.length || batch.length;
      }

      setUploadProgress({ isUploading: true, progress: 100, message: "Finalizing import..." });
      
      if (failed > 0) {
        toast.warning(`Imported ${inserted.toLocaleString()} leads. ${failed.toLocaleString()} failed.`);
      } else {
        toast.success(`Imported ${inserted.toLocaleString()} leads successfully`);
      }
      
      fetchLists(); // Refresh stats
      
      // Small delay to show completion
      setTimeout(() => {
        setUploadProgress({ isUploading: false, progress: 0, message: "" });
      }, 1500);
      
      return inserted;
    } catch (error: unknown) {
      console.error("Error importing leads:", error);
      toast.error("Failed to import leads");
      setUploadProgress({ isUploading: false, progress: 0, message: "" });
      return 0;
    }
  };

  useEffect(() => {
    fetchLists();
  }, []);

  return {
    lists,
    loading,
    uploadProgress,
    fetchLists,
    createList,
    updateList,
    deleteList,
    importLeadsFromData,
  };
}

// Detect CSV delimiter (comma, semicolon, or tab)
function detectDelimiter(line: string): string {
  const tabCount = (line.match(/\t/g) || []).length;
  const commaCount = (line.match(/,/g) || []).length;
  const semicolonCount = (line.match(/;/g) || []).length;
  
  // Prioritize tab if present (Excel exports often use tabs)
  if (tabCount >= commaCount && tabCount >= semicolonCount && tabCount > 0) {
    return "\t";
  }
  return semicolonCount > commaCount ? ";" : ",";
}

// Helper to parse CSV line handling quoted values
function parseCsvLine(line: string, delimiter: string = ","): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim().replace(/^"|"$/g, ""));
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim().replace(/^"|"$/g, ""));
  return result.filter(h => h.length > 0 || result.length === 1);
}

// Helper to extract field definitions from CSV headers
export function extractFieldsFromCsv(csvContent: string): ListField[] {
  if (!csvContent || csvContent.trim().length === 0) return [];
  
  // Normalize line endings
  const normalizedContent = csvContent.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = normalizedContent.trim().split("\n");
  if (lines.length === 0 || !lines[0]) return [];

  const delimiter = detectDelimiter(lines[0]);
  console.log("CSV delimiter detected:", delimiter);
  console.log("First line:", lines[0]);
  
  const headers = parseCsvLine(lines[0], delimiter);
  console.log("Parsed headers:", headers);
  
  if (headers.length === 0) return [];
  
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
}

// Export delimiter detection for use in import
export function parseCsvContent(csvContent: string): { headers: string[]; rows: Record<string, string>[]; delimiter: string } {
  if (!csvContent || csvContent.trim().length === 0) {
    return { headers: [], rows: [], delimiter: "," };
  }
  
  const normalizedContent = csvContent.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = normalizedContent.trim().split("\n");
  if (lines.length === 0) {
    return { headers: [], rows: [], delimiter: "," };
  }

  const delimiter = detectDelimiter(lines[0]);
  const headers = parseCsvLine(lines[0], delimiter);
  
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const values = parseCsvLine(lines[i], delimiter);
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || "";
    });
    rows.push(row);
  }
  
  return { headers, rows, delimiter };
}
