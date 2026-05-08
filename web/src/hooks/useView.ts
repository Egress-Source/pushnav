import { useEffect, useState } from "react";

export type View = "navigation" | "catalog";

const STORAGE_KEY = "pushnav.view";

export function useView(): [View, (v: View) => void] {
  const [view, setView] = useState<View>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === "catalog" ? "catalog" : "navigation";
  });
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, view);
  }, [view]);
  return [view, setView];
}
