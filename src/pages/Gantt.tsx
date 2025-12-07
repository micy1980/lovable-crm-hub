import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { GanttChart } from '@/components/projects/GanttChart';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { GanttChartSquare, ChevronLeft, ChevronRight } from 'lucide-react';
import { LicenseGuard } from '@/components/license/LicenseGuard';
import { addMonths, subMonths, startOfMonth, endOfMonth, format } from 'date-fns';
import { hu } from 'date-fns/locale';

const Gantt = () => {
  const { t } = useTranslation();
  const { activeCompany } = useCompany();
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>(undefined);
  const [viewDate, setViewDate] = useState(new Date());

  const { data: projects = [] } = useQuery({
    queryKey: ['projects-for-gantt', activeCompany?.id],
    queryFn: async () => {
      if (!activeCompany?.id) return [];
      
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, code')
        .eq('company_id', activeCompany.id)
        .is('deleted_at', null)
        .order('name');
      
      if (error) throw error;
      return data;
    },
    enabled: !!activeCompany?.id,
  });

  const startDate = subMonths(startOfMonth(viewDate), 1);
  const endDate = addMonths(endOfMonth(viewDate), 2);

  const handlePrevious = () => {
    setViewDate(subMonths(viewDate, 1));
  };

  const handleNext = () => {
    setViewDate(addMonths(viewDate, 1));
  };

  const handleToday = () => {
    setViewDate(new Date());
  };

  return (
    <LicenseGuard feature="projects">
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <GanttChartSquare className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">{t('common.gantt', 'Gantt diagram')}</h1>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Navigation */}
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={handlePrevious}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" onClick={handleToday}>
                Ma
              </Button>
              <Button variant="outline" size="icon" onClick={handleNext}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium ml-2">
                {format(viewDate, 'yyyy MMMM', { locale: hu })}
              </span>
            </div>

            {/* Project filter */}
            <div className="flex items-center gap-2">
              <Label htmlFor="project-filter" className="text-sm whitespace-nowrap">
                Projekt szűrő:
              </Label>
              <Select
                value={selectedProjectId || 'all'}
                onValueChange={(value) => setSelectedProjectId(value === 'all' ? undefined : value)}
              >
                <SelectTrigger id="project-filter" className="w-[250px]">
                  <SelectValue placeholder="Összes feladat" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Összes feladat</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.code ? `${project.code} - ${project.name}` : project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <Card>
          <CardContent className="pt-6">
            <GanttChart 
              projectId={selectedProjectId}
              startDate={startDate}
              endDate={endDate}
            />
          </CardContent>
        </Card>
      </div>
    </LicenseGuard>
  );
};

export default Gantt;
