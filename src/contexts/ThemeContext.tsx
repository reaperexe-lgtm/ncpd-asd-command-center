import { createContext, useContext, useEffect, useState } from "react";

type Theme = "green" | "blue";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    // Try to get from localStorage first
    const stored = localStorage.getItem("app-theme") as Theme | null;
    return stored || "green";
  });

  useEffect(() => {
    // Update DOM and localStorage when theme changes
    if (theme === "blue") {
      document.documentElement.classList.add("theme-blue");
      document.documentElement.style.backgroundColor = "hsl(215, 35%, 8%)";
    } else {
      document.documentElement.classList.remove("theme-blue");
      document.documentElement.style.backgroundColor = "hsl(150, 25%, 6%)";
    }
    localStorage.setItem("app-theme", theme);
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
};
