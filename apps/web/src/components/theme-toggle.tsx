"use client";

import { useEffect, useState } from "react";

import { Button, Moon, Sun } from "@mikconnect/ui";

type Theme = "light" | "dark";

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.dataset.themeTransition = "true";
  localStorage.setItem("mikconnect.theme", theme);
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", theme === "dark" ? "oklch(0.16 0.025 255)" : "oklch(0.972 0.008 255)");
  window.setTimeout(() => delete root.dataset.themeTransition, 220);
}

export function ThemeToggle({ className }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === "dark" ? "dark" : "light");
  }, []);

  const dark = theme === "dark";
  const label = dark ? "Activer le mode clair" : "Activer le mode sombre";

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      className={["size-11", className].filter(Boolean).join(" ")}
      aria-label={label}
      aria-pressed={dark}
      title={label}
      onClick={() => {
        const next = dark ? "light" : "dark";
        applyTheme(next);
        setTheme(next);
      }}
    >
      {dark ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
    </Button>
  );
}
