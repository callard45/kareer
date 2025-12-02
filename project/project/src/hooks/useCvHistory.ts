import { useState, useEffect } from "react";
import { GeneratedCvHistoryItem } from "../types/generatedCvHistory";

const CV_HISTORY_KEY = "kareer_cv_history";
const MAX_ITEMS = 10;

export function useCvHistory() {
  const [items, setItems] = useState<GeneratedCvHistoryItem[]>([]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(CV_HISTORY_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setItems(Array.isArray(parsed) ? parsed : []);
      }
    } catch (e) {
      console.error("Failed to read CV history from localStorage", e);
      setItems([]);
    }
  }, []);

  const saveItems = (next: GeneratedCvHistoryItem[]) => {
    setItems(next);
    try {
      window.localStorage.setItem(CV_HISTORY_KEY, JSON.stringify(next));
    } catch (e) {
      console.error("Failed to write CV history to localStorage", e);
    }
  };

  const addItem = (item: GeneratedCvHistoryItem) => {
    const next = [item, ...items].slice(0, MAX_ITEMS);
    saveItems(next);
  };

  const removeItem = (id: string) => {
    const next = items.filter(item => item.id !== id);
    saveItems(next);
  };

  const clear = () => {
    saveItems([]);
  };

  return { items, addItem, removeItem, clear };
}
