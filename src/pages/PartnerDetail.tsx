import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
  Plus,
  Calendar,
  CheckSquare,
} from 'lucide-react';
import { TagSelector, TagDisplay } from '@/components/shared/TagSelector';
import { CommentsSection } from '@/components/shared/CommentsSection';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { usePartners } from '@/hooks/usePartners';
import { useReadOnlyMode } from '@/hooks/useReadOnlyMode';
import { LicenseGuard } from '@/components/license/LicenseGuard';
import { PartnerDialog } from '@/components/partners/PartnerDialog';
import { TaskDialog } from '@/components/projects/TaskDialog';
import { ProjectDialog } from '@/components/projects/ProjectDialog';
import { EventDialog } from '@/components/events/EventDialog';
import { DocumentDialog } from '@/components/documents/DocumentDialog';
import { SalesDialog } from '@/components/sales/SalesDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import { formatCurrency, getNumberFormatSettings } from '@/lib/formatCurrency';

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
  const queryClient = useQueryClient();
  const { updatePartner } = usePartners();
  const { canEdit, checkReadOnly } = useReadOnlyMode();
  const { settings: systemSettings } = useSystemSettings();
  const numberFormatSettings = getNumberFormatSettings(systemSettings);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false);
  const [isDocumentDialogOpen, setIsDocumentDialogOpen] = useState(false);
  const [isSalesDialogOpen, setIsSalesDialogOpen] = useState(false);
  const [isProjectDialogOpen, setIsProjectDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [selectedDocument, setSelectedDocument] = useState<any>(null);
  const [selectedSale, setSelectedSale] = useState<any>(null);

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

  // Fetch related projects (directly linked via partner_id)
  const { data: projects = [] } = useQuery({
    queryKey: ['partner-projects', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          owner:profiles!projects_owner_user_id_fkey(id, full_name, email)
        `)
        .eq('partner_id', id!)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      
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
              <div className="flex items-center gap-2 mt-1">
                {partner.category && (
                  <Badge variant="secondary">{partner.category}</Badge>
                )}
                <TagSelector entityType="partner" entityId={partner.id} />
              </div>
            </div>
          </div>
          <Button 
            onClick={() => checkReadOnly(() => setIsDialogOpen(true))} 
            disabled={!canEdit}
          >
            <Pencil className="mr-2 h-4 w-4" />
            {t('common.edit')}
          </Button>
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
        <Tabs defaultValue="projects" className="space-y-4">
          <TabsList>
            <TabsTrigger value="projects" className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4" />
              {t('projects.title')} ({projects.length})
            </TabsTrigger>
            <TabsTrigger value="sales" className="flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              {t('sales.title')} ({sales.length})
            </TabsTrigger>
            <TabsTrigger value="tasks" className="flex items-center gap-2">
              <CheckSquare className="h-4 w-4" />
              {t('tasks.title')} ({tasks.length})
            </TabsTrigger>
            <TabsTrigger value="events" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {t('events.title')} ({events.length})
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              {t('documents.title')} ({documents.length})
            </TabsTrigger>
          </TabsList>

          {/* Projects Tab */}
          <TabsContent value="projects">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>{t('projects.title')}</CardTitle>
                  <CardDescription>{t('partners.relatedProjects')}</CardDescription>
                </div>
                <Button 
                  size="sm" 
                  onClick={() => checkReadOnly(() => setIsProjectDialogOpen(true))}
                  disabled={!canEdit}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  {t('projects.create')}
                </Button>
              </CardHeader>
              <CardContent>
                {projects.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">{t('partners.noProjects')}</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Név</TableHead>
                        <TableHead>Kód</TableHead>
                        <TableHead>Státusz</TableHead>
                        <TableHead>Tulajdonos</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {projects.map((project: any) => (
                        <TableRow 
                          key={project.id} 
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => navigate(`/projects/${project.id}`)}
                        >
                          <TableCell className="font-medium">{project.name}</TableCell>
                          <TableCell>{project.code || '-'}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline">{project.status || '-'}</Badge>
                          </TableCell>
                          <TableCell>{project.owner?.full_name || project.owner?.email || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Sales Tab */}
          <TabsContent value="sales">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>{t('sales.title')}</CardTitle>
                  <CardDescription>{t('partners.relatedSales')}</CardDescription>
                </div>
                <Button 
                  size="sm" 
                  onClick={() => checkReadOnly(() => { setSelectedSale(null); setIsSalesDialogOpen(true); })}
                  disabled={!canEdit}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  {t('sales.create')}
                </Button>
              </CardHeader>
              <CardContent>
                {sales.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">{t('partners.noSales')}</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Név</TableHead>
                        <TableHead>Státusz</TableHead>
                        <TableHead>Várható érték</TableHead>
                        <TableHead>Várható lezárás</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sales.map((sale: any) => (
                        <TableRow 
                          key={sale.id} 
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => {
                            setSelectedSale(sale);
                            setIsSalesDialogOpen(true);
                          }}
                        >
                          <TableCell className="font-medium">{sale.name}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline">{sale.status || '-'}</Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {sale.expected_value 
                              ? `${formatCurrency(sale.expected_value, sale.currency || 'HUF', numberFormatSettings)} ${sale.currency || 'HUF'}`
                              : '-'
                            }
                          </TableCell>
                          <TableCell className="text-center">
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
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>{t('tasks.title')}</CardTitle>
                  <CardDescription>{t('partners.relatedTasks')}</CardDescription>
                </div>
                <Button 
                  size="sm" 
                  onClick={() => checkReadOnly(() => { setSelectedTask(null); setIsTaskDialogOpen(true); })}
                  disabled={!canEdit}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  {t('tasks.create')}
                </Button>
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
                        <TableRow 
                          key={task.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => {
                            setSelectedTask(task);
                            setIsTaskDialogOpen(true);
                          }}
                        >
                          <TableCell className="font-medium">{task.title}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline">{t(`tasks.status.${task.status}`)}</Badge>
                          </TableCell>
                          <TableCell>
                            {task.project ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/projects/${task.project.id}`);
                                }}
                                className="text-primary hover:underline"
                              >
                                {task.project.name}
                              </button>
                            ) : '-'}
                          </TableCell>
                          <TableCell className="text-center">
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
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>{t('events.title')}</CardTitle>
                  <CardDescription>{t('partners.relatedEvents')}</CardDescription>
                </div>
                <Button 
                  size="sm" 
                  onClick={() => checkReadOnly(() => { setSelectedEvent(null); setIsEventDialogOpen(true); })}
                  disabled={!canEdit}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  {t('events.create')}
                </Button>
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
                        <TableRow 
                          key={event.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => {
                            setSelectedEvent(event);
                            setIsEventDialogOpen(true);
                          }}
                        >
                          <TableCell className="font-medium">{event.title}</TableCell>
                          <TableCell>
                            {event.project ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/projects/${event.project.id}`);
                                }}
                                className="text-primary hover:underline"
                              >
                                {event.project.name}
                              </button>
                            ) : '-'}
                          </TableCell>
                          <TableCell className="text-center">
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
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>{t('documents.title')}</CardTitle>
                  <CardDescription>{t('partners.relatedDocuments')}</CardDescription>
                </div>
                <Button 
                  size="sm" 
                  onClick={() => checkReadOnly(() => { setSelectedDocument(null); setIsDocumentDialogOpen(true); })}
                  disabled={!canEdit}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  {t('documents.upload')}
                </Button>
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
                        <TableRow 
                          key={doc.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => {
                            setSelectedDocument(doc);
                            setIsDocumentDialogOpen(true);
                          }}
                        >
                          <TableCell className="font-medium">{doc.title}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline">{doc.visibility}</Badge>
                          </TableCell>
                          <TableCell className="text-center">
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

        {/* Comments Section */}
        {id && (
          <Card>
            <CardContent className="pt-6">
              <CommentsSection entityType="partner" entityId={id} />
            </CardContent>
          </Card>
        )}

        <PartnerDialog
          open={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
          onSubmit={(data) => {
            updatePartner.mutate({ id: partner.id, ...data }, {
              onSuccess: () => {
                setIsDialogOpen(false);
                queryClient.invalidateQueries({ queryKey: ['partner', id] });
              },
            });
          }}
          isSubmitting={updatePartner.isPending}
          initialData={partner}
        />

        <TaskDialog
          open={isTaskDialogOpen}
          onOpenChange={(open) => {
            setIsTaskDialogOpen(open);
            if (!open) {
              setSelectedTask(null);
              queryClient.invalidateQueries({ queryKey: ['partner-tasks', id] });
            }
          }}
          partnerId={id}
          task={selectedTask}
        />

        <EventDialog
          open={isEventDialogOpen}
          onOpenChange={(open) => {
            setIsEventDialogOpen(open);
            if (!open) {
              setSelectedEvent(null);
              queryClient.invalidateQueries({ queryKey: ['partner-events', id] });
            }
          }}
          defaultPartnerId={id}
          event={selectedEvent}
        />

        <DocumentDialog
          open={isDocumentDialogOpen}
          onOpenChange={(open) => {
            setIsDocumentDialogOpen(open);
            if (!open) {
              setSelectedDocument(null);
              queryClient.invalidateQueries({ queryKey: ['partner-documents', id] });
            }
          }}
          defaultPartnerId={id}
          document={selectedDocument}
        />

        <SalesDialog
          open={isSalesDialogOpen}
          onOpenChange={(open) => {
            setIsSalesDialogOpen(open);
            if (!open) {
              setSelectedSale(null);
              queryClient.invalidateQueries({ queryKey: ['partner-sales', id] });
            }
          }}
          partnerId={id}
          sale={selectedSale}
        />

        <ProjectDialog
          open={isProjectDialogOpen}
          onOpenChange={setIsProjectDialogOpen}
        />
      </div>
    </LicenseGuard>
  );
}
