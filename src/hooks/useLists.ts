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

  const fetchLists = async () => {
    setLoading(true);
    try {
      // Fetch lists
      const { data: listsData, error: listsError } = await supabase
        .from("lists")
        .select("*")
        .order("created_at", { ascending: false });

      if (listsError) throw listsError;

      // Fetch lead counts per list
      const { data: leadCounts, error: countsError } = await supabase
        .from("leads")
        .select("list_id, status");

      if (countsError) throw countsError;

      // Calculate stats for each list
      const listsWithStats = (listsData || []).map((list) => {
        const listLeads = leadCounts?.filter((l) => l.list_id === list.id) || [];
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
      const { error } = await supabase.from("lists").delete().eq("id", id);

      if (error) throw error;

      setLists((prev) => prev.filter((list) => list.id !== id));
      toast.success("List deleted successfully");
      return true;
    } catch (error: unknown) {
      console.error("Error deleting list:", error);
      toast.error("Failed to delete list");
      return false;
    }
  };

  const importLeadsFromCsv = async (
    listId: string,
    csvContent: string
  ): Promise<number> => {
    try {
      const lines = csvContent.trim().split("\n");
      if (lines.length < 2) {
        toast.error("CSV file must have headers and at least one data row");
        return 0;
      }

      const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
      const leads = [];

      for (let i = 1; i < lines.length; i++) {
        const values = parseCsvLine(lines[i]);
        if (values.length !== headers.length) continue;

        const data: Record<string, string> = {};
        headers.forEach((header, index) => {
          data[header] = values[index];
        });

        leads.push({
          list_id: listId,
          data,
          status: "new",
        });
      }

      if (leads.length === 0) {
        toast.error("No valid leads found in CSV");
        return 0;
      }

      // Insert in batches
      const batchSize = 100;
      let inserted = 0;

      for (let i = 0; i < leads.length; i += batchSize) {
        const batch = leads.slice(i, i + batchSize);
        const { error } = await supabase.from("leads").insert(batch);
        if (error) throw error;
        inserted += batch.length;
      }

      toast.success(`Imported ${inserted} leads successfully`);
      fetchLists(); // Refresh stats
      return inserted;
    } catch (error: unknown) {
      console.error("Error importing leads:", error);
      toast.error("Failed to import leads");
      return 0;
    }
  };

  useEffect(() => {
    fetchLists();
  }, []);

  return {
    lists,
    loading,
    fetchLists,
    createList,
    updateList,
    deleteList,
    importLeadsFromCsv,
  };
}

// Helper to parse CSV line handling quoted values
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

// Helper to extract field definitions from CSV headers
export function extractFieldsFromCsv(csvContent: string): ListField[] {
  const lines = csvContent.trim().split("\n");
  if (lines.length === 0) return [];

  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  
  return headers.map((header, index) => {
    const lowerHeader = header.toLowerCase();
    let type: ListField["type"] = "String (standard)";

    if (lowerHeader.includes("phone") || lowerHeader.includes("tel") || lowerHeader.includes("mobile")) {
      type = "Phone";
    } else if (lowerHeader.includes("email") || lowerHeader.includes("e-mail")) {
      type = "E-mail";
    } else if (lowerHeader.includes("url") || lowerHeader.includes("www") || lowerHeader.includes("website") || lowerHeader.includes("link")) {
      type = "www";
    } else if (lowerHeader.includes("date")) {
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
