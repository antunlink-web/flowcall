import { createContext, useContext, useState, ReactNode } from "react";

interface UploadProgressState {
  isUploading: boolean;
  progress: number;
  message: string;
}

interface UploadProgressContextType {
  uploadProgress: UploadProgressState;
  setUploadProgress: (progress: UploadProgressState) => void;
}

const UploadProgressContext = createContext<UploadProgressContextType | undefined>(undefined);

export function UploadProgressProvider({ children }: { children: ReactNode }) {
  const [uploadProgress, setUploadProgress] = useState<UploadProgressState>({
    isUploading: false,
    progress: 0,
    message: "",
  });

  return (
    <UploadProgressContext.Provider value={{ uploadProgress, setUploadProgress }}>
      {children}
    </UploadProgressContext.Provider>
  );
}

export function useUploadProgress() {
  const context = useContext(UploadProgressContext);
  if (context === undefined) {
    throw new Error("useUploadProgress must be used within an UploadProgressProvider");
  }
  return context;
}
