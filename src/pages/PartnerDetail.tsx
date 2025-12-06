import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { hu } from 'date-fns/locale';
import {
  ArrowLeft,
  Building2,
  Phone,
  Mail,
  MapPin,
  FileText,
  FolderOpen,
  Briefcase,
  Pencil,
  Loader2,
  Lock,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { LicenseGuard } from '@/components/license/LicenseGuard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';

const formatAddress = (address: any) => {
  if (!address) return '-';
  const parts = [
    address.postal_code,
    address.city,
    address.street_name && address.street_type 
      ? `${address.street_name} ${address.street_type}` 
      : address.street_name,
    address.house_number,
    address.building,
    address.staircase,
    address.floor_door,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : '-';
};

export default function PartnerDetail() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { activeCompany } = useCompany();

  // Fetch partner details
  const { data: partner, isLoading: partnerLoading } = useQuery({
    queryKey: ['partner', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('partners')
        .select(`
          *,
          partner_addresses(*)
        `)
        .eq('id', id!)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Fetch related sales
  const { data: sales = [] } = useQuery({
    queryKey: ['partner-sales', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales')
        .select('*')
        .eq('partner_id', id!)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!id,
  });

  // Fetch related documents
  const { data: documents = [] } = useQuery({
    queryKey: ['partner-documents', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('partner_id', id!)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!id,
  });

  // Fetch related tasks
  const { data: tasks = [] } = useQuery({
    queryKey: ['partner-tasks', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          project:projects(id, name)
        `)
        .eq('partner_id', id!)
        .is('deleted_at', null)
        .order('deadline', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!id,
  });

  // Fetch related events
  const { data: events = [] } = useQuery({
    queryKey: ['partner-events', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          project:projects(id, name)
        `)
        .eq('partner_id', id!)
        .is('deleted_at', null)
        .order('start_time', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!id,
  });

  if (partnerLoading) {
    return (
      <LicenseGuard feature="partners">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </LicenseGuard>
    );
  }

  if (!partner) {
    return (
      <LicenseGuard feature="partners">
        <div className="space-y-6">
          <Button variant="ghost" onClick={() => navigate('/partners')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('common.back')}
          </Button>
          <div className="text-center py-12">
            <p className="text-muted-foreground">{t('partners.notFound')}</p>
          </div>
        </div>
      </LicenseGuard>
    );
  }

  const headquartersAddress = partner.partner_addresses?.find(
    (a: any) => a.address_type === 'headquarters'
  );
  const siteAddress = partner.partner_addresses?.find(
    (a: any) => a.address_type === 'site'
  );
  const mailingAddress = partner.partner_addresses?.find(
    (a: any) => a.address_type === 'mailing'
  );

  return (
    <LicenseGuard feature="partners">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/partners')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-bold tracking-tight">{partner.name}</h1>
                {partner.restrict_access && (
                  <Lock className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              {partner.category && (
                <Badge variant="secondary" className="mt-1">{partner.category}</Badge>
              )}
            </div>
          </div>
        </div>

        {/* Partner Info Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                {t('partners.basicInfo')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">{t('partners.taxId')}</p>
                <p className="font-medium">{partner.tax_id || '-'}</p>
              </div>
              {partner.eu_vat_number && (
                <div>
                  <p className="text-sm text-muted-foreground">{t('partners.euVatNumber')}</p>
                  <p className="font-medium">{partner.eu_vat_number}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground">{t('partners.defaultCurrency')}</p>
                <p className="font-medium">{partner.default_currency || 'HUF'}</p>
              </div>
            </CardContent>
          </Card>

          {/* Contact Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                {t('partners.contactInfo')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{partner.phone || '-'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{partner.email || '-'}</span>
              </div>
            </CardContent>
          </Card>

          {/* Addresses */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                {t('partners.addresses')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">{t('partners.headquarters')}</p>
                <p className="font-medium text-sm">{formatAddress(headquartersAddress)}</p>
              </div>
              {siteAddress && (
                <div>
                  <p className="text-sm text-muted-foreground">{t('partners.site')}</p>
                  <p className="font-medium text-sm">{formatAddress(siteAddress)}</p>
                </div>
              )}
              {mailingAddress && (
                <div>
                  <p className="text-sm text-muted-foreground">{t('partners.mailingAddress')}</p>
                  <p className="font-medium text-sm">{formatAddress(mailingAddress)}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Notes */}
        {partner.notes && (
          <Card>
            <CardHeader>
              <CardTitle>{t('partners.notes')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap">{partner.notes}</p>
            </CardContent>
          </Card>
        )}

        {/* Related Items Tabs */}
        <Tabs defaultValue="sales" className="space-y-4">
          <TabsList>
            <TabsTrigger value="sales" className="flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              {t('sales.title')} ({sales.length})
            </TabsTrigger>
            <TabsTrigger value="tasks" className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4" />
              {t('tasks.title')} ({tasks.length})
            </TabsTrigger>
            <TabsTrigger value="events" className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4" />
              {t('events.title')} ({events.length})
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              {t('documents.title')} ({documents.length})
            </TabsTrigger>
          </TabsList>

          {/* Sales Tab */}
          <TabsContent value="sales">
            <Card>
              <CardHeader>
                <CardTitle>{t('sales.title')}</CardTitle>
                <CardDescription>{t('partners.relatedSales')}</CardDescription>
              </CardHeader>
              <CardContent>
                {sales.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">{t('partners.noSales')}</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('sales.name')}</TableHead>
                        <TableHead>{t('sales.status')}</TableHead>
                        <TableHead>{t('sales.expectedValue')}</TableHead>
                        <TableHead>{t('sales.expectedCloseDate')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sales.map((sale: any) => (
                        <TableRow 
                          key={sale.id} 
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => navigate(`/sales/${sale.id}`)}
                        >
                          <TableCell className="font-medium">{sale.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{sale.status || '-'}</Badge>
                          </TableCell>
                          <TableCell>
                            {sale.expected_value 
                              ? `${sale.expected_value.toLocaleString()} ${sale.currency || 'HUF'}`
                              : '-'
                            }
                          </TableCell>
                          <TableCell>
                            {sale.expected_close_date 
                              ? format(new Date(sale.expected_close_date), 'yyyy.MM.dd', { locale: hu })
                              : '-'
                            }
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tasks Tab */}
          <TabsContent value="tasks">
            <Card>
              <CardHeader>
                <CardTitle>{t('tasks.title')}</CardTitle>
                <CardDescription>{t('partners.relatedTasks')}</CardDescription>
              </CardHeader>
              <CardContent>
                {tasks.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">{t('partners.noTasks')}</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('tasks.title')}</TableHead>
                        <TableHead>{t('tasks.statusLabel')}</TableHead>
                        <TableHead>{t('projects.title')}</TableHead>
                        <TableHead>{t('tasks.deadline')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tasks.map((task: any) => (
                        <TableRow key={task.id}>
                          <TableCell className="font-medium">{task.title}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{t(`tasks.status.${task.status}`)}</Badge>
                          </TableCell>
                          <TableCell>
                            {task.project ? (
                              <button
                                onClick={() => navigate(`/projects/${task.project.id}`)}
                                className="text-primary hover:underline"
                              >
                                {task.project.name}
                              </button>
                            ) : '-'}
                          </TableCell>
                          <TableCell>
                            {task.deadline 
                              ? format(new Date(task.deadline), 'yyyy.MM.dd HH:mm', { locale: hu })
                              : '-'
                            }
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Events Tab */}
          <TabsContent value="events">
            <Card>
              <CardHeader>
                <CardTitle>{t('events.title')}</CardTitle>
                <CardDescription>{t('partners.relatedEvents')}</CardDescription>
              </CardHeader>
              <CardContent>
                {events.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">{t('partners.noEvents')}</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('events.title')}</TableHead>
                        <TableHead>{t('projects.title')}</TableHead>
                        <TableHead>{t('events.startTime')}</TableHead>
                        <TableHead>{t('events.location')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {events.map((event: any) => (
                        <TableRow key={event.id}>
                          <TableCell className="font-medium">{event.title}</TableCell>
                          <TableCell>
                            {event.project ? (
                              <button
                                onClick={() => navigate(`/projects/${event.project.id}`)}
                                className="text-primary hover:underline"
                              >
                                {event.project.name}
                              </button>
                            ) : '-'}
                          </TableCell>
                          <TableCell>
                            {format(new Date(event.start_time), event.is_all_day ? 'yyyy.MM.dd' : 'yyyy.MM.dd HH:mm', { locale: hu })}
                          </TableCell>
                          <TableCell>{event.location || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents">
            <Card>
              <CardHeader>
                <CardTitle>{t('documents.title')}</CardTitle>
                <CardDescription>{t('partners.relatedDocuments')}</CardDescription>
              </CardHeader>
              <CardContent>
                {documents.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">{t('partners.noDocuments')}</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('documents.title')}</TableHead>
                        <TableHead>{t('documents.visibility')}</TableHead>
                        <TableHead>{t('documents.uploadedAt')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {documents.map((doc: any) => (
                        <TableRow key={doc.id}>
                          <TableCell className="font-medium">{doc.title}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{doc.visibility}</Badge>
                          </TableCell>
                          <TableCell>
                            {doc.uploaded_at 
                              ? format(new Date(doc.uploaded_at), 'yyyy.MM.dd HH:mm', { locale: hu })
                              : '-'
                            }
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </LicenseGuard>
  );
}
