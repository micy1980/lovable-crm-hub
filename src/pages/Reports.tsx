import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, FileSpreadsheet, BarChart3, Users, TrendingUp, FolderKanban } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { toast } from 'sonner';
import {
  generateDetailedPDFReport,
  generateDetailedExcelReport,
  generateProjectsReport,
  generateSalesReport,
  generatePartnersReport,
} from '@/lib/reportUtils';

type ReportType = 'projects' | 'sales' | 'partners';

const Reports = () => {
const { t } = useTranslation();
  const { activeCompany } = useCompany();
  const selectedCompanyId = activeCompany?.id;
  const [selectedReport, setSelectedReport] = useState<ReportType>('projects');
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Options state
  const [includeCompleted, setIncludeCompleted] = useState(true);
  const [includeWon, setIncludeWon] = useState(true);
  const [includeLost, setIncludeLost] = useState(false);
  const [partnerCategory, setPartnerCategory] = useState<string>('');
  
  // Fetch data
  const { data: projects = [] } = useQuery({
    queryKey: ['projects-report', selectedCompanyId],
    queryFn: async () => {
      if (!selectedCompanyId) return [];
      const { data, error } = await supabase
        .from('projects')
        .select('*, partner:partners(name)')
        .eq('company_id', selectedCompanyId)
        .is('deleted_at', null);
      if (error) throw error;
      return data.map(p => ({ ...p, partner_name: p.partner?.name }));
    },
    enabled: !!selectedCompanyId,
  });
  
  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks-report', selectedCompanyId],
    queryFn: async () => {
      if (!selectedCompanyId) return [];
      const { data, error } = await supabase
        .from('tasks')
        .select('*, project:projects(name), responsible:profiles!tasks_responsible_user_id_fkey(full_name)')
        .eq('company_id', selectedCompanyId)
        .is('deleted_at', null);
      if (error) throw error;
      return data.map(t => ({
        ...t,
        project_name: t.project?.name,
        responsible_name: t.responsible?.full_name,
      }));
    },
    enabled: !!selectedCompanyId,
  });
  
  const { data: sales = [] } = useQuery({
    queryKey: ['sales-report', selectedCompanyId],
    queryFn: async () => {
      if (!selectedCompanyId) return [];
      const { data, error } = await supabase
        .from('sales')
        .select('*, partner:partners(name)')
        .eq('company_id', selectedCompanyId)
        .is('deleted_at', null);
      if (error) throw error;
      return data.map(s => ({ ...s, partner_name: s.partner?.name }));
    },
    enabled: !!selectedCompanyId,
  });
  
  const { data: partners = [] } = useQuery({
    queryKey: ['partners-report', selectedCompanyId],
    queryFn: async () => {
      if (!selectedCompanyId) return [];
      const { data, error } = await supabase
        .from('partners')
        .select('*')
        .eq('company_id', selectedCompanyId)
        .is('deleted_at', null);
      if (error) throw error;
      return data;
    },
    enabled: !!selectedCompanyId,
  });
  
  const { data: categories = [] } = useQuery({
    queryKey: ['partner-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('master_data')
        .select('label, value')
        .eq('type', 'partner_category')
        .order('order_index');
      if (error) throw error;
      return data;
    },
  });
  
  const handleGenerateReport = (format: 'pdf' | 'excel') => {
    if (!selectedCompanyId) {
      toast.error('Nincs kiválasztott vállalat');
      return;
    }
    
    setIsGenerating(true);
    
    try {
      let report;
      
      switch (selectedReport) {
        case 'projects':
          report = generateProjectsReport(projects, tasks, { includeCompleted });
          break;
        case 'sales':
          report = generateSalesReport(sales, { includeWon, includeLost });
          break;
        case 'partners':
          report = generatePartnersReport(partners, { category: partnerCategory || undefined });
          break;
      }
      
      if (format === 'pdf') {
        generateDetailedPDFReport(report);
      } else {
        generateDetailedExcelReport(report);
      }
      
      toast.success(`${format.toUpperCase()} riport generálva`);
    } catch (error) {
      console.error('Report generation error:', error);
      toast.error('Hiba a riport generálása során');
    } finally {
      setIsGenerating(false);
    }
  };
  
  const reportTypes = [
    {
      id: 'projects' as ReportType,
      title: 'Projektek',
      description: 'Projektek és feladatok összesítése',
      icon: FolderKanban,
    },
    {
      id: 'sales' as ReportType,
      title: 'Értékesítés',
      description: 'Értékesítési pipeline összesítése',
      icon: TrendingUp,
    },
    {
      id: 'partners' as ReportType,
      title: 'Partnerek',
      description: 'Partner adatbázis összesítése',
      icon: Users,
    },
  ];
  
  if (!selectedCompanyId) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Válassz egy vállalatot a riportok megtekintéséhez</p>
        </div>
      </MainLayout>
    );
  }
  
  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <BarChart3 className="h-8 w-8" />
            Riportok
          </h1>
          <p className="text-muted-foreground mt-1">
            Részletes összesítő riportok generálása
          </p>
        </div>
        
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Report type selection */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Riport típusa</CardTitle>
              <CardDescription>Válaszd ki a generálandó riport típusát</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-3">
                {reportTypes.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setSelectedReport(type.id)}
                    className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors ${
                      selectedReport === type.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <type.icon className={`h-8 w-8 ${selectedReport === type.id ? 'text-primary' : 'text-muted-foreground'}`} />
                    <span className="font-medium">{type.title}</span>
                    <span className="text-xs text-muted-foreground text-center">{type.description}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
          
          {/* Options */}
          <Card>
            <CardHeader>
              <CardTitle>Beállítások</CardTitle>
              <CardDescription>Riport szűrési opciók</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedReport === 'projects' && (
                <div className="flex items-center justify-between">
                  <Label htmlFor="includeCompleted">Befejezett projektek</Label>
                  <Switch
                    id="includeCompleted"
                    checked={includeCompleted}
                    onCheckedChange={setIncludeCompleted}
                  />
                </div>
              )}
              
              {selectedReport === 'sales' && (
                <>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="includeWon">Nyert értékesítések</Label>
                    <Switch
                      id="includeWon"
                      checked={includeWon}
                      onCheckedChange={setIncludeWon}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="includeLost">Elveszett értékesítések</Label>
                    <Switch
                      id="includeLost"
                      checked={includeLost}
                      onCheckedChange={setIncludeLost}
                    />
                  </div>
                </>
              )}
              
              {selectedReport === 'partners' && (
                <div className="space-y-2">
                  <Label>Kategória szűrő</Label>
                  <Select value={partnerCategory} onValueChange={setPartnerCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Összes kategória" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Összes kategória</SelectItem>
                      {categories.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
        {/* Generate buttons */}
        <Card>
          <CardHeader>
            <CardTitle>Riport generálása</CardTitle>
            <CardDescription>Válaszd ki a kívánt formátumot</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <Button
                onClick={() => handleGenerateReport('pdf')}
                disabled={isGenerating}
                className="flex items-center gap-2"
              >
                <FileText className="h-4 w-4" />
                PDF letöltése
              </Button>
              <Button
                variant="outline"
                onClick={() => handleGenerateReport('excel')}
                disabled={isGenerating}
                className="flex items-center gap-2"
              >
                <FileSpreadsheet className="h-4 w-4" />
                Excel letöltése
              </Button>
            </div>
            
            {/* Preview counts */}
            <div className="mt-6 p-4 bg-muted/50 rounded-lg">
              <h4 className="font-medium mb-2">Előnézet</h4>
              <div className="grid gap-2 sm:grid-cols-3 text-sm">
                {selectedReport === 'projects' && (
                  <>
                    <div>Projektek: <span className="font-medium">{projects.length}</span></div>
                    <div>Feladatok: <span className="font-medium">{tasks.length}</span></div>
                    <div>Aktív feladatok: <span className="font-medium">{tasks.filter(t => t.status !== 'completed').length}</span></div>
                  </>
                )}
                {selectedReport === 'sales' && (
                  <>
                    <div>Értékesítések: <span className="font-medium">{sales.length}</span></div>
                    <div>Nyert: <span className="font-medium">{sales.filter(s => s.status === 'won').length}</span></div>
                    <div>Aktív: <span className="font-medium">{sales.filter(s => !['won', 'lost'].includes(s.status)).length}</span></div>
                  </>
                )}
                {selectedReport === 'partners' && (
                  <>
                    <div>Partnerek: <span className="font-medium">{partners.length}</span></div>
                    <div>Szűrt: <span className="font-medium">
                      {partnerCategory ? partners.filter(p => p.category === partnerCategory).length : partners.length}
                    </span></div>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default Reports;
