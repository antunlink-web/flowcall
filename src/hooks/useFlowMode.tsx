import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";

export type FlowMode = "calling" | "crm";

interface FlowModeContextType {
  mode: FlowMode;
  setMode: (mode: FlowMode) => void;
  isFirstTime: boolean;
  dismissFirstTime: () => void;
  lastCrmPath: string;
  setLastCrmPath: (path: string) => void;
}

const FlowModeContext = createContext<FlowModeContextType>({
  mode: "calling",
  setMode: () => {},
  isFirstTime: false,
  dismissFirstTime: () => {},
  lastCrmPath: "",
  setLastCrmPath: () => {},
});

const STORAGE_KEY = "flowcall-mode";
const FIRST_TIME_KEY = "flowcall-mode-chosen";
const LAST_CRM_PATH_KEY = "flowcall-last-crm-path";

export function FlowModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<FlowMode>(() => {
    try {
      return (localStorage.getItem(STORAGE_KEY) as FlowMode) || "calling";
    } catch {
      return "calling";
    }
  });

  const [isFirstTime, setIsFirstTime] = useState(() => {
    try {
      return !localStorage.getItem(FIRST_TIME_KEY);
    } catch {
      return true;
    }
  });

  const [lastCrmPath, setLastCrmPathState] = useState(() => {
    try {
      return localStorage.getItem(LAST_CRM_PATH_KEY) || "";
    } catch {
      return "";
    }
  });

  const setMode = useCallback((m: FlowMode) => {
    setModeState(m);
    try { localStorage.setItem(STORAGE_KEY, m); } catch {}
  }, []);

  const dismissFirstTime = useCallback(() => {
    setIsFirstTime(false);
    try { localStorage.setItem(FIRST_TIME_KEY, "true"); } catch {}
  }, []);

  const setLastCrmPath = useCallback((path: string) => {
    setLastCrmPathState(path);
    try { localStorage.setItem(LAST_CRM_PATH_KEY, path); } catch {}
  }, []);

  return (
    <FlowModeContext.Provider value={{ mode, setMode, isFirstTime, dismissFirstTime, lastCrmPath, setLastCrmPath }}>
      {children}
    </FlowModeContext.Provider>
  );
}

export function useFlowMode() {
  return useContext(FlowModeContext);
}
