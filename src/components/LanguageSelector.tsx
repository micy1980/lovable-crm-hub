import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Languages } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { STORAGE_KEY } from '@/i18n';

const LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'hu', name: 'Magyar', flag: '🇭🇺' },
];

interface LanguageSelectorProps {
  variant?: 'default' | 'ghost' | 'outline';
}

export const LanguageSelector = ({ variant = 'ghost' }: LanguageSelectorProps) => {
  const { i18n } = useTranslation();
  const { user } = useAuth();

  const changeLanguage = async (languageCode: string) => {
    // Change language in i18n
    await i18n.changeLanguage(languageCode);
    
    // Store in localStorage for unauthenticated users
    localStorage.setItem(STORAGE_KEY, languageCode);
    
    // Store in database for authenticated users
    if (user) {
      try {
        await supabase
          .from('profiles')
          .update({ language: languageCode })
          .eq('id', user.id);
      } catch (error) {
        console.error('Failed to update language preference:', error);
      }
    }
  };

  const currentLanguage = LANGUAGES.find((lang) => lang.code === i18n.language) || LANGUAGES[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size="icon">
          <Languages className="h-4 w-4" />
          <span className="sr-only">Change language</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {LANGUAGES.map((language) => (
          <DropdownMenuItem
            key={language.code}
            onClick={() => changeLanguage(language.code)}
            className={i18n.language === language.code ? 'bg-accent' : ''}
          >
            <span className="mr-2">{language.flag}</span>
            {language.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
