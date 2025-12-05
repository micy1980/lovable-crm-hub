import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useTheme } from "next-themes";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Sun, Moon } from "lucide-react";
import { LanguageSelector } from "@/components/LanguageSelector";

const NotFound = () => {
  const location = useLocation();
  const { theme, setTheme } = useTheme();
  const { t } = useTranslation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/10">
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
        <LanguageSelector variant="outline" />
      </div>
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold text-foreground">404</h1>
        <p className="mb-4 text-xl text-muted-foreground">{t('errors.pageNotFound', 'Az oldal nem található')}</p>
        <a href="/" className="text-primary underline hover:text-primary/90">
          {t('errors.returnToHome', 'Vissza a főoldalra')}
        </a>
      </div>
    </div>
  );
};

export default NotFound;
