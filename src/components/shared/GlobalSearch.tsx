import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, FileText, FolderKanban, DollarSign, Users } from 'lucide-react';
import { useCompany } from '@/contexts/CompanyContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';

interface SearchResult {
  id: string;
  type: 'project' | 'sales' | 'partner' | 'document';
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
}

interface GlobalSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const GlobalSearch = ({ open, onOpenChange }: GlobalSearchProps) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const { activeCompany } = useCompany();
  const navigate = useNavigate();

  useEffect(() => {
    if (!query || query.length < 2) {
      setResults([]);
      return;
    }

    const searchTimeout = setTimeout(async () => {
      if (!activeCompany) return;
      
      setLoading(true);
      try {
        const searchResults: SearchResult[] = [];
        
        // Search projects
        const { data: projects } = await supabase
          .from('projects')
          .select('id, name, code, description')
          .eq('company_id', activeCompany.id)
          .is('deleted_at', null)
          .or(`name.ilike.%${query}%,code.ilike.%${query}%,description.ilike.%${query}%`)
          .limit(5);

        if (projects) {
          projects.forEach(p => {
            searchResults.push({
              id: p.id,
              type: 'project',
              title: p.name,
              subtitle: p.code || p.description,
              icon: <FolderKanban className="h-4 w-4" />
            });
          });
        }

        // Search sales
        const { data: sales } = await supabase
          .from('sales')
          .select('id, name, description')
          .eq('company_id', activeCompany.id)
          .is('deleted_at', null)
          .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
          .limit(5);

        if (sales) {
          sales.forEach(s => {
            searchResults.push({
              id: s.id,
              type: 'sales',
              title: s.name,
              subtitle: s.description,
              icon: <DollarSign className="h-4 w-4" />
            });
          });
        }

        // Search partners
        const { data: partners } = await supabase
          .from('partners')
          .select('id, name, email')
          .eq('company_id', activeCompany.id)
          .is('deleted_at', null)
          .or(`name.ilike.%${query}%,email.ilike.%${query}%`)
          .limit(5);

        if (partners) {
          partners.forEach(p => {
            searchResults.push({
              id: p.id,
              type: 'partner',
              title: p.name,
              subtitle: p.email,
              icon: <Users className="h-4 w-4" />
            });
          });
        }

        // Search documents
        const { data: documents } = await supabase
          .from('documents')
          .select('id, title, description')
          .eq('owner_company_id', activeCompany.id)
          .is('deleted_at', null)
          .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
          .limit(5);

        if (documents) {
          documents.forEach(d => {
            searchResults.push({
              id: d.id,
              type: 'document',
              title: d.title,
              subtitle: d.description,
              icon: <FileText className="h-4 w-4" />
            });
          });
        }

        setResults(searchResults);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(searchTimeout);
  }, [query, activeCompany]);

  const handleResultClick = (result: SearchResult) => {
    switch (result.type) {
      case 'project':
        navigate(`/projects/${result.id}`);
        break;
      case 'sales':
        navigate(`/sales/${result.id}`);
        break;
      case 'partner':
        navigate(`/partners`);
        break;
      case 'document':
        navigate(`/documents`);
        break;
    }
    onOpenChange(false);
    setQuery('');
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'project': return 'Projekt';
      case 'sales': return 'Értékesítés';
      case 'partner': return 'Partner';
      case 'document': return 'Dokumentum';
      default: return type;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Keresés</DialogTitle>
        </DialogHeader>
        
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Keresés projektek, értékesítések, partnerek között..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10"
            autoFocus
          />
        </div>

        <div className="space-y-2 max-h-96 overflow-y-auto">
          {loading && (
            <div className="text-center py-8 text-muted-foreground">
              Keresés...
            </div>
          )}
          
          {!loading && query.length >= 2 && results.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              Nincs találat
            </div>
          )}

          {!loading && results.map((result) => (
            <div
              key={`${result.type}-${result.id}`}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent cursor-pointer transition-colors"
              onClick={() => handleResultClick(result)}
            >
              <div className="text-muted-foreground">{result.icon}</div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{result.title}</span>
                  <Badge variant="secondary" className="text-xs">
                    {getTypeLabel(result.type)}
                  </Badge>
                </div>
                {result.subtitle && (
                  <p className="text-sm text-muted-foreground line-clamp-1">
                    {result.subtitle}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};
