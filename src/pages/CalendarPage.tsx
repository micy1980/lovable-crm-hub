import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const CalendarPage = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Calendar</h1>
        <p className="text-muted-foreground">
          View and manage tasks on a calendar
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Task Calendar</CardTitle>
          <CardDescription>
            Monthly and weekly view of all tasks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            Calendar view coming soon. You'll see all tasks organized by deadline with filtering options.
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CalendarPage;
