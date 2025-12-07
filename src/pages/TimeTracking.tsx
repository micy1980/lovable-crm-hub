import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTimeTracking } from '@/hooks/useTimeTracking';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Clock, Square } from 'lucide-react';
import { LicenseGuard } from '@/components/license/LicenseGuard';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { hu } from 'date-fns/locale';

const TimeTracking = () => {
  const { t } = useTranslation();
  const { timeEntries, runningEntry, stopTimer, totalMinutes, isLoading } = useTimeTracking();
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('week');

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}ó ${mins}p`;
    }
    return `${mins}p`;
  };

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const filteredEntries = timeEntries.filter((entry) => {
    const entryDate = new Date(entry.start_time);
    switch (dateFilter) {
      case 'today':
        return entryDate >= today;
      case 'week':
        return isWithinInterval(entryDate, { start: weekStart, end: weekEnd });
      case 'month':
        return isWithinInterval(entryDate, { start: monthStart, end: monthEnd });
      default:
        return true;
    }
  });

  const filteredTotal = filteredEntries.reduce((sum, entry) => sum + (entry.duration_minutes || 0), 0);

  return (
    <LicenseGuard feature="projects">
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Clock className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Időkövetés</h1>
          </div>
          
          <div className="flex items-center gap-4">
            {runningEntry && (
              <div className="flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-lg">
                <Badge variant="default" className="animate-pulse">Fut</Badge>
                <span className="text-sm font-medium">{runningEntry.task?.title}</span>
                <Button size="sm" variant="destructive" onClick={() => stopTimer(runningEntry.id)}>
                  <Square className="h-4 w-4" />
                </Button>
              </div>
            )}

            <div className="flex items-center gap-2">
              <Label className="text-sm">Időszak:</Label>
              <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as any)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Ma</SelectItem>
                  <SelectItem value="week">E hét</SelectItem>
                  <SelectItem value="month">E hónap</SelectItem>
                  <SelectItem value="all">Összes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Összesen (szűrt)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatDuration(filteredTotal)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Bejegyzések száma</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{filteredEntries.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Teljes összeg</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatDuration(totalMinutes)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Time entries table */}
        <Card>
          <CardContent className="pt-6">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : filteredEntries.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                Nincsenek időbejegyzések a kiválasztott időszakban
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Feladat</TableHead>
                    <TableHead>Projekt</TableHead>
                    <TableHead className="text-center">Kezdés</TableHead>
                    <TableHead className="text-center">Befejezés</TableHead>
                    <TableHead className="text-center">Időtartam</TableHead>
                    <TableHead>Leírás</TableHead>
                    <TableHead className="text-center">Státusz</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEntries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>{entry.task?.title || '-'}</TableCell>
                      <TableCell>{entry.task?.project?.name || '-'}</TableCell>
                      <TableCell className="text-center">
                        {format(new Date(entry.start_time), 'MM.dd HH:mm', { locale: hu })}
                      </TableCell>
                      <TableCell className="text-center">
                        {entry.end_time ? format(new Date(entry.end_time), 'MM.dd HH:mm', { locale: hu }) : '-'}
                      </TableCell>
                      <TableCell className="text-center font-mono">
                        {entry.duration_minutes ? formatDuration(entry.duration_minutes) : '-'}
                      </TableCell>
                      <TableCell>{entry.description || '-'}</TableCell>
                      <TableCell className="text-center">
                        {entry.is_running ? (
                          <Badge variant="default">Fut</Badge>
                        ) : (
                          <Badge variant="secondary">Lezárt</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </LicenseGuard>
  );
};

export default TimeTracking;
