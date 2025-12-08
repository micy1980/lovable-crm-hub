import { format, parseISO } from 'date-fns';
import { hu } from 'date-fns/locale';
import { CheckCircle, XCircle, AlertTriangle, Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAutomationLogs } from '@/hooks/useAutomationLogs';

interface AutomationLogsListProps {
  ruleId?: string;
}

export const AutomationLogsList = ({ ruleId }: AutomationLogsListProps) => {
  const { logs, isLoading, successCount, failureCount } = useAutomationLogs(ruleId);

  const formatDate = (date: string) => {
    return format(parseISO(date), 'yyyy.MM.dd HH:mm:ss', { locale: hu });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Végrehajtási napló
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1 text-green-600 border-green-600">
              <CheckCircle className="h-3 w-3" />
              {successCount} sikeres
            </Badge>
            <Badge variant="outline" className="gap-1 text-destructive border-destructive">
              <XCircle className="h-3 w-3" />
              {failureCount} sikertelen
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Activity className="h-12 w-12 mb-4 opacity-50" />
            <p>Még nem történt végrehajtás</p>
          </div>
        ) : (
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-3">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className={`flex items-start gap-3 p-3 border rounded-lg ${
                    log.success ? 'border-green-200 bg-green-50/50' : 'border-red-200 bg-red-50/50'
                  }`}
                >
                  {log.success ? (
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  ) : (
                    <XCircle className="h-5 w-5 text-destructive mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium truncate">
                        {log.rule?.name || 'Ismeretlen szabály'}
                      </span>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(log.executed_at)}
                      </span>
                    </div>
                    {log.entity_type && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Entitás: {log.entity_type}
                      </p>
                    )}
                    {log.error_message && (
                      <p className="text-sm text-destructive mt-1 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        {log.error_message}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};
