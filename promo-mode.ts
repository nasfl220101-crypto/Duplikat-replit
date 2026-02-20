import { useSyncExternalStore } from "react";

const STORAGE_KEY = "dash_real";

let listeners: Array<() => void> = [];

function getSnapshot(): boolean {
  return localStorage.getItem(STORAGE_KEY) !== "1";
}

function subscribe(listener: () => void) {
  listeners.push(listener);
  const handler = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) listener();
  };
  window.addEventListener("storage", handler);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
    window.removeEventListener("storage", handler);
  };
}

export function setPromoMode(promo: boolean) {
  localStorage.setItem(STORAGE_KEY, promo ? "0" : "1");
  listeners.forEach((l) => l());
}

export function usePromoMode(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot);
}
