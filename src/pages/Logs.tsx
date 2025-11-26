import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useNavigate } from 'react-router-dom';
import { isSuperAdmin } from '@/lib/roleUtils';
import { useTranslation } from 'react-i18next';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle } from 'lucide-react';

const Logs = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: profile, isLoading: profileLoading } = useUserProfile();
  const [selectedCompany, setSelectedCompany] = useState<string>('all');
  const [selectedEvent, setSelectedEvent] = useState<string>('all');

  // Check if user is super_admin
  const isSuper = isSuperAdmin(profile);

  // Redirect if not super_admin
  if (!profileLoading && !isSuper) {
    navigate('/');
    return null;
  }

  // Fetch companies
  const { data: companies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('id, name')
        .is('deleted_at', null)
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: isSuper,
  });

  // Fetch logs with filters
  const { data: logs = [], isLoading: logsLoading } = useQuery({
    queryKey: ['logs', selectedCompany, selectedEvent],
    queryFn: async () => {
      let query = supabase
        .from('logs')
        .select(`
          *,
          profiles:user_id(email, full_name),
          companies:company_id(name)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      // Filter by company
      if (selectedCompany !== 'all') {
        if (selectedCompany === 'system') {
          query = query.is('company_id', null);
        } else {
          query = query.eq('company_id', selectedCompany);
        }
      }

      // Filter by event type
      if (selectedEvent !== 'all') {
        query = query.eq('entity_type', selectedEvent);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: isSuper,
  });

  // Get unique event types from logs
  const eventTypes = Array.from(
    new Set(logs.map((log) => log.entity_type).filter(Boolean))
  ).sort();

  if (profileLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isSuper) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {t('logs.accessDenied')}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('logs.title')}</h1>
        <p className="text-muted-foreground">{t('logs.description')}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('logs.auditLog')}</CardTitle>
          <CardDescription>{t('logs.auditDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">
                {t('logs.filterCompany')}
              </label>
              <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('logs.allCompanies')}</SelectItem>
                  <SelectItem value="system">{t('logs.systemEvents')}</SelectItem>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">
                {t('logs.filterEvent')}
              </label>
              <Select value={selectedEvent} onValueChange={setSelectedEvent}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('logs.allEvents')}</SelectItem>
                  {eventTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Logs Table */}
          {logsLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">{t('logs.noLogs')}</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('logs.timestamp')}</TableHead>
                    <TableHead>{t('logs.company')}</TableHead>
                    <TableHead>{t('logs.user')}</TableHead>
                    <TableHead>{t('logs.entityType')}</TableHead>
                    <TableHead>{t('logs.action')}</TableHead>
                    <TableHead>{t('logs.details')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-mono text-xs">
                        {new Date(log.created_at!).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {log.company_id ? (
                          <span className="text-sm">
                            {(log.companies as any)?.name || log.company_id}
                          </span>
                        ) : (
                          <Badge variant="outline">{t('logs.system')}</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="font-medium">
                            {(log.profiles as any)?.full_name || t('logs.unknown')}
                          </div>
                          <div className="text-muted-foreground text-xs">
                            {(log.profiles as any)?.email}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{log.entity_type}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            log.action === 'DELETE'
                              ? 'destructive'
                              : log.action === 'CREATE'
                              ? 'default'
                              : 'outline'
                          }
                        >
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        {log.entity_id && (
                          <div className="text-xs text-muted-foreground truncate">
                            {t('logs.entityId')}: {log.entity_id}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Logs;
