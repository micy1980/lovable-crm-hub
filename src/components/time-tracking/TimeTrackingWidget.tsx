import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Play, Square, Clock, Plus, Trash2 } from 'lucide-react';
import { useTimeTracking, TimeEntry } from '@/hooks/useTimeTracking';
import { format, formatDistanceToNow } from 'date-fns';
import { hu } from 'date-fns/locale';

interface TimeTrackingWidgetProps {
  taskId: string;
  taskTitle: string;
}

export const TimeTrackingWidget = ({ taskId, taskTitle }: TimeTrackingWidgetProps) => {
  const {
    timeEntries,
    runningEntry,
    startTimer,
    stopTimer,
    addManualEntry,
    deleteEntry,
    totalMinutes,
    isStarting,
    isStopping,
  } = useTimeTracking(taskId);

  const [manualDialogOpen, setManualDialogOpen] = useState(false);
  const [manualStartTime, setManualStartTime] = useState('');
  const [manualEndTime, setManualEndTime] = useState('');
  const [manualDescription, setManualDescription] = useState('');
  const [elapsedTime, setElapsedTime] = useState('00:00:00');

  const isRunningForThisTask = runningEntry?.task_id === taskId;

  // Update elapsed time every second when timer is running
  useEffect(() => {
    if (!isRunningForThisTask || !runningEntry) return;

    const updateElapsed = () => {
      const start = new Date(runningEntry.start_time);
      const now = new Date();
      const diff = Math.floor((now.getTime() - start.getTime()) / 1000);
      const hours = Math.floor(diff / 3600);
      const minutes = Math.floor((diff % 3600) / 60);
      const seconds = diff % 60;
      setElapsedTime(
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      );
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [isRunningForThisTask, runningEntry]);

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}ó ${mins}p`;
    }
    return `${mins}p`;
  };

  const handleStartTimer = () => {
    startTimer({ taskId });
  };

  const handleStopTimer = () => {
    if (runningEntry) {
      stopTimer(runningEntry.id);
    }
  };

  const handleAddManualEntry = () => {
    if (!manualStartTime || !manualEndTime) return;

    addManualEntry({
      taskId,
      description: manualDescription || undefined,
      startTime: new Date(manualStartTime),
      endTime: new Date(manualEndTime),
    });

    setManualDialogOpen(false);
    setManualStartTime('');
    setManualEndTime('');
    setManualDescription('');
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Időkövetés
          </CardTitle>
          <Badge variant="secondary">
            Összesen: {formatDuration(totalMinutes)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Timer controls */}
        <div className="flex items-center gap-2">
          {isRunningForThisTask ? (
            <>
              <div className="flex-1 text-center">
                <span className="font-mono text-2xl">{elapsedTime}</span>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleStopTimer}
                disabled={isStopping}
              >
                <Square className="h-4 w-4 mr-1" />
                Stop
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="default"
                size="sm"
                onClick={handleStartTimer}
                disabled={isStarting || !!runningEntry}
                className="flex-1"
              >
                <Play className="h-4 w-4 mr-1" />
                {runningEntry ? 'Másik feladaton fut' : 'Indítás'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setManualDialogOpen(true)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>

        {/* Time entries list */}
        {timeEntries.length > 0 && (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {timeEntries.slice(0, 5).map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between text-sm p-2 bg-muted/50 rounded"
              >
                <div className="flex-1">
                  <div className="font-medium">
                    {format(new Date(entry.start_time), 'MM.dd HH:mm', { locale: hu })}
                    {entry.end_time && ` - ${format(new Date(entry.end_time), 'HH:mm', { locale: hu })}`}
                  </div>
                  {entry.description && (
                    <div className="text-xs text-muted-foreground">{entry.description}</div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {entry.is_running ? (
                    <Badge variant="default" className="text-xs">Fut</Badge>
                  ) : (
                    <span className="text-xs font-medium">
                      {formatDuration(entry.duration_minutes || 0)}
                    </span>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => deleteEntry(entry.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Manual entry dialog */}
        <Dialog open={manualDialogOpen} onOpenChange={setManualDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Manuális időbejegyzés</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Kezdés</Label>
                <Input
                  type="datetime-local"
                  value={manualStartTime}
                  onChange={(e) => setManualStartTime(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Befejezés</Label>
                <Input
                  type="datetime-local"
                  value={manualEndTime}
                  onChange={(e) => setManualEndTime(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Leírás (opcionális)</Label>
                <Input
                  value={manualDescription}
                  onChange={(e) => setManualDescription(e.target.value)}
                  placeholder="Mi volt a tevékenység..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setManualDialogOpen(false)}>
                Mégse
              </Button>
              <Button onClick={handleAddManualEntry}>
                Hozzáadás
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};
