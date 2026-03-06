import { createContext, useContext, useState } from "react";

type ActiveSportContextValue = {
  activeSport: string;
  setActiveSport: (sportKey: string) => void;
};

const ActiveSportContext = createContext<ActiveSportContextValue | null>(null);

export function ActiveSportProvider({ children }: { children: React.ReactNode }) {
  const [activeSport, setActiveSport] = useState("soccer_epl");
  return (
    <ActiveSportContext.Provider value={{ activeSport, setActiveSport }}>
      {children}
    </ActiveSportContext.Provider>
  );
}

export function useActiveSport() {
  const ctx = useContext(ActiveSportContext);
  if (!ctx) throw new Error("useActiveSport must be used within ActiveSportProvider");
  return ctx;
}
