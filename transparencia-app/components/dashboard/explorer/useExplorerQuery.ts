"use client";
import { useSyncExternalStore } from "react";
const eventName = "cambiometro:explorer-query";
function subscribe(notify: () => void) {
  window.addEventListener("popstate", notify);
  window.addEventListener(eventName, notify);
  return () => {
    window.removeEventListener("popstate", notify);
    window.removeEventListener(eventName, notify);
  };
}
const snapshot = () => window.location.search.slice(1);
const serverSnapshot = () => "";
/** URL is the source of truth. The subscription also restores browser back/forward without a server query. */
export function useExplorerQueryString() {
  return useSyncExternalStore(subscribe, snapshot, serverSnapshot);
}
export function commitExplorerQuery(url: string) {
  window.history.pushState(null, "", url);
  window.dispatchEvent(new Event(eventName));
}
