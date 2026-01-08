import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface BrandingSettings {
  id: string;
  company_name: string | null;
  app_name: string | null;
  logo_url: string | null;
  favicon_url: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
}

interface BrandingContextType {
  branding: BrandingSettings | null;
  loading: boolean;
  refetch: () => Promise<void>;
}

const BrandingContext = createContext<BrandingContextType | undefined>(undefined);

export function BrandingProvider({ children }: { children: ReactNode }) {
  const [branding, setBranding] = useState<BrandingSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchBranding = async () => {
    const { data, error } = await supabase
      .from("branding_settings")
      .select("*")
      .maybeSingle();

    if (!error && data) {
      setBranding(data as BrandingSettings);
      applyBrandingToDOM(data as BrandingSettings);
    }
    setLoading(false);
  };

  const applyBrandingToDOM = (settings: BrandingSettings) => {
    const root = document.documentElement;
    
    if (settings.primary_color) {
      root.style.setProperty("--primary", settings.primary_color);
    }
    if (settings.secondary_color) {
      root.style.setProperty("--secondary", settings.secondary_color);
    }
    if (settings.accent_color) {
      root.style.setProperty("--accent", settings.accent_color);
    }

    // Update favicon if set
    if (settings.favicon_url) {
      const existingFavicon = document.querySelector("link[rel='icon']");
      if (existingFavicon) {
        existingFavicon.setAttribute("href", settings.favicon_url);
      } else {
        const favicon = document.createElement("link");
        favicon.rel = "icon";
        favicon.href = settings.favicon_url;
        document.head.appendChild(favicon);
      }
    }

    // Update document title with app name
    if (settings.app_name) {
      document.title = settings.app_name;
    }
  };

  useEffect(() => {
    fetchBranding();
  }, []);

  return (
    <BrandingContext.Provider value={{ branding, loading, refetch: fetchBranding }}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  const context = useContext(BrandingContext);
  if (context === undefined) {
    throw new Error("useBranding must be used within a BrandingProvider");
  }
  return context;
}
