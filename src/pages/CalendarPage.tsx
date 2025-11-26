import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from 'react-i18next';

const CalendarPage = () => {
  const { t } = useTranslation();
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('calendar.title')}</h1>
        <p className="text-muted-foreground">
          {t('calendar.description')}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('calendar.title')}</CardTitle>
          <CardDescription>
            {t('calendar.description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            {t('calendar.comingSoon')}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CalendarPage;
