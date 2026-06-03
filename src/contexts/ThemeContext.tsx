import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type Theme = "light" | "dark" | "system";

interface Ctx {
  theme: Theme;
  setTheme: (t: Theme) => void;
  effective: "light" | "dark";
}

const ThemeContext = createContext<Ctx | undefined>(undefined);

const apply = (t: Theme) => {
  const root = document.documentElement;
  const mql = window.matchMedia("(prefers-color-scheme: dark)");
  const eff = t === "system" ? (mql.matches ? "dark" : "light") : t;
  root.classList.toggle("dark", eff === "dark");
  return eff as "light" | "dark";
};

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setThemeState] = useState<Theme>(
    () => (localStorage.getItem("ac-theme") as Theme) || "system"
  );
  const [effective, setEffective] = useState<"light" | "dark">(() => apply(theme));

  useEffect(() => {
    setEffective(apply(theme));
    localStorage.setItem("ac-theme", theme);
    if (theme !== "system") return;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setEffective(apply("system"));
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme: setThemeState, effective }}>
      {children}
    </ThemeContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be inside ThemeProvider");
  return ctx;
};
