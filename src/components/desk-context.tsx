"use client";

import { createContext, useContext, type ReactNode } from "react";

export type CharacterName = "cat" | "rabbit";

type DeskContextValue = {
  openChat: (who: CharacterName) => void;
  openProfile: () => void;
};

const DeskContext = createContext<DeskContextValue | null>(null);

export function DeskContextProvider({
  value,
  children,
}: {
  value: DeskContextValue;
  children: ReactNode;
}) {
  return <DeskContext.Provider value={value}>{children}</DeskContext.Provider>;
}

export function useDesk(): DeskContextValue {
  const value = useContext(DeskContext);
  if (!value) {
    throw new Error("Desk context is missing");
  }
  return value;
}
