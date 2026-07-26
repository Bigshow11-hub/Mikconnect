"use client";

import { useEffect, useState } from "react";

export function NetworkStatus() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    setOnline(navigator.onLine);
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      void navigator.serviceWorker.register("/sw.js");
    }
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  if (online) return null;
  return (
    <div
      role="status"
      className="fixed inset-x-3 bottom-3 z-50 rounded-md border border-warning bg-warning-subtle px-4 py-3 text-sm font-medium text-warning-subtle-foreground shadow-lg md:left-auto md:max-w-sm"
    >
      Mode hors ligne · les données affichées peuvent être anciennes. La reconnexion est
      automatique.
    </div>
  );
}
