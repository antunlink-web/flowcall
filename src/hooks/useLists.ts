import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useUploadProgress } from "@/hooks/useUploadProgress";

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

// Query keys for cache management
export const listQueryKeys = {
  all: ["lists"] as const,
  lists: () => [...listQueryKeys.all, "list"] as const,
  counts: () => [...listQueryKeys.all, "counts"] as const,
};

// Base list type without computed stats
interface ListBase {
  id: string;
  name: string;
  description: string | null;
  fields: ListField[];
  settings: ListSettings;
  status: "active" | "archived" | "blocklist";
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// Fetch lists without counts (fast)
async function fetchListsData(): Promise<ListBase[]> {
  const { data, error } = await supabase
    .from("lists")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data || []).map((list) => ({
    ...list,
    status: list.status as "active" | "archived" | "blocklist",
    fields: (list.fields as unknown as ListField[]) || [],
    settings: (list.settings as unknown as ListSettings) || {},
  }));
}

// Fetch counts separately (can be slower)
async function fetchListCounts(listIds: string[]): Promise<Record<string, { total: number; new: number; callback: number; won: number; lost: number }>> {
  if (listIds.length === 0) return {};

  const { data, error } = await supabase.rpc("get_list_lead_counts", { list_ids: listIds });

  if (error) {
    console.error("Error fetching list counts:", error);
    return {};
  }

  const countsMap: Record<string, { total: number; new: number; callback: number; won: number; lost: number }> = {};
  
  // Initialize all lists with zero counts
  listIds.forEach(id => {
    countsMap[id] = { total: 0, new: 0, callback: 0, won: 0, lost: 0 };
  });

  // Fill in actual counts
  (data || []).forEach((count: { 
    list_id: string; 
    total: number; 
    new_count: number; 
    callback_count: number; 
    won_count: number; 
    lost_count: number 
  }) => {
    countsMap[count.list_id] = {
      total: Number(count.total),
      new: Number(count.new_count),
      callback: Number(count.callback_count),
      won: Number(count.won_count),
      lost: Number(count.lost_count),
    };
  });

  return countsMap;
}

export function useLists() {
  const queryClient = useQueryClient();
  const { uploadProgress, setUploadProgress } = useUploadProgress();

  // Fetch lists (fast, cached for 5 minutes, stale after 30 seconds)
  const { 
    data: listsData = [], 
    isLoading: listsLoading,
  } = useQuery({
    queryKey: listQueryKeys.lists(),
    queryFn: fetchListsData,
    staleTime: 30 * 1000, // Consider stale after 30 seconds
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  });

  // Fetch counts separately (can be slower, updates in background)
  const { 
    data: countsData = {},
    isLoading: countsLoading 
  } = useQuery({
    queryKey: listQueryKeys.counts(),
    queryFn: () => fetchListCounts(listsData.map(l => l.id)),
    enabled: listsData.length > 0,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  // Combine lists with counts
  const lists: List[] = listsData.map((list) => ({
    ...list,
    ...(countsData[list.id] || { total: 0, new: 0, callback: 0, won: 0, lost: 0 }),
  }));

  // Create list mutation
  const createListMutation = useMutation({
    mutationFn: async ({ name, fields, description }: { name: string; fields: ListField[]; description?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");
      
      // Get user's tenant_id from their profile
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("tenant_id")
        .eq("id", user.id)
        .single();
      
      if (profileError) throw profileError;
      
      const { data, error } = await supabase
        .from("lists")
        .insert([{
          name,
          description,
          fields: JSON.parse(JSON.stringify(fields)),
          created_by: user.id,
          tenant_id: profile.tenant_id,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: listQueryKeys.all });
      toast.success("List created successfully");
    },
    onError: (error: Error) => {
      console.error("Error creating list:", error);
      toast.error("Failed to create list");
    },
  });

  // Update list mutation
  const updateListMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Pick<List, "name" | "description" | "fields" | "settings" | "status">> }) => {
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
      return { id, updates };
    },
    onSuccess: ({ id, updates }) => {
      // Optimistically update the cache
      queryClient.setQueryData(listQueryKeys.lists(), (old: typeof listsData | undefined) => 
        (old || []).map(list => list.id === id ? { ...list, ...updates } : list)
      );
      toast.success("List updated successfully");
    },
    onError: (error: Error) => {
      console.error("Error updating list:", error);
      toast.error("Failed to update list");
    },
  });

  // Delete list mutation
  const deleteListMutation = useMutation({
    mutationFn: async (id: string) => {
      // Delete leads in batches to avoid timeout on large lists
      let deletedCount = 0;
      const batchSize = 500;
      
      // Keep deleting in batches until no more leads remain
      while (true) {
        // First, get a batch of lead IDs to delete
        const { data: leadsToDelete, error: fetchError } = await supabase
          .from("leads")
          .select("id")
          .eq("list_id", id)
          .limit(batchSize);
        
        if (fetchError) {
          console.error("Error fetching leads to delete:", fetchError);
          throw fetchError;
        }
        
        // If no more leads, break out of loop
        if (!leadsToDelete || leadsToDelete.length === 0) break;
        
        const leadIds = leadsToDelete.map(l => l.id);
        
        // Delete this batch of leads by ID
        const { error: deleteError } = await supabase
          .from("leads")
          .delete()
          .in("id", leadIds);
        
        if (deleteError) {
          console.error("Error deleting leads batch:", deleteError);
          throw deleteError;
        }
        
        deletedCount += leadIds.length;
        console.log(`Deleted ${deletedCount} leads from list ${id}...`);
        
        // If we got fewer than batchSize, we're done
        if (leadsToDelete.length < batchSize) break;
      }
      
      // Now delete the list itself
      const { error } = await supabase.from("lists").delete().eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: (id) => {
      // Remove from cache
      queryClient.setQueryData(listQueryKeys.lists(), (old: typeof listsData | undefined) => 
        (old || []).filter(list => list.id !== id)
      );
      toast.success("List and all its leads deleted successfully");
    },
    onError: (error: Error) => {
      console.error("Error deleting list:", error);
      toast.error("Failed to delete list");
    },
  });

  // Import leads function
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

      // Fetch the list's tenant_id to ensure leads inherit proper tenant association
      const { data: listData, error: listError } = await supabase
        .from("lists")
        .select("tenant_id")
        .eq("id", listId)
        .single();

      if (listError || !listData?.tenant_id) {
        console.error("Failed to fetch list tenant_id:", listError);
        toast.error("Failed to import: could not determine tenant");
        setUploadProgress({ isUploading: false, progress: 0, message: "" });
        return 0;
      }

      const leads = rows.map((data) => ({
        list_id: listId,
        tenant_id: listData.tenant_id,
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
      
      // Invalidate counts cache to refresh
      queryClient.invalidateQueries({ queryKey: listQueryKeys.counts() });
      
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

  // Wrapper functions to maintain backward compatibility
  const createList = async (
    name: string,
    fields: ListField[],
    description?: string
  ): Promise<List | null> => {
    try {
      const data = await createListMutation.mutateAsync({ name, fields, description });
      return {
        ...data,
        fields: data.fields as unknown as ListField[],
        settings: data.settings as unknown as ListSettings,
        total: 0,
        new: 0,
        callback: 0,
        won: 0,
        lost: 0,
      } as List;
    } catch {
      return null;
    }
  };

  const updateList = async (
    id: string,
    updates: Partial<Pick<List, "name" | "description" | "fields" | "settings" | "status">>
  ): Promise<boolean> => {
    try {
      await updateListMutation.mutateAsync({ id, updates });
      return true;
    } catch {
      return false;
    }
  };

  const deleteList = async (id: string): Promise<boolean> => {
    try {
      await deleteListMutation.mutateAsync(id);
      return true;
    } catch {
      return false;
    }
  };

  const fetchLists = () => {
    queryClient.invalidateQueries({ queryKey: listQueryKeys.all });
  };

  return {
    lists,
    loading: listsLoading,
    countsLoading,
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
