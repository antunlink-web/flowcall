import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface TourContextType {
  runTour: boolean;
  startTour: () => void;
  endTour: () => void;
  hasSeenTour: boolean;
  setHasSeenTour: (seen: boolean) => void;
}

const TourContext = createContext<TourContextType | undefined>(undefined);

const TOUR_STORAGE_KEY = "flowcall_tour_completed";

export function TourProvider({ children }: { children: ReactNode }) {
  const [runTour, setRunTour] = useState(false);
  const [hasSeenTour, setHasSeenTourState] = useState(() => {
    return localStorage.getItem(TOUR_STORAGE_KEY) === "true";
  });

  const startTour = () => setRunTour(true);
  
  const endTour = () => {
    setRunTour(false);
    setHasSeenTourState(true);
    localStorage.setItem(TOUR_STORAGE_KEY, "true");
  };

  const setHasSeenTour = (seen: boolean) => {
    setHasSeenTourState(seen);
    localStorage.setItem(TOUR_STORAGE_KEY, seen ? "true" : "false");
  };

  return (
    <TourContext.Provider value={{ runTour, startTour, endTour, hasSeenTour, setHasSeenTour }}>
      {children}
    </TourContext.Provider>
  );
}

export function useTour() {
  const context = useContext(TourContext);
  if (context === undefined) {
    throw new Error("useTour must be used within a TourProvider");
  }
  return context;
}
