import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { LicenseGuard } from '@/components/license/LicenseGuard';

const Documents = () => {
  const { t } = useTranslation();
  
  return (
    <LicenseGuard feature="documents">
      <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('documents.title')}</h1>
          <p className="text-muted-foreground">
            {t('documents.description')}
          </p>
        </div>
        <Button>
          <Upload className="mr-2 h-4 w-4" />
          {t('documents.uploadDocument')}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('documents.documentLibrary')}</CardTitle>
          <CardDescription>
            {t('documents.libraryDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            {t('documents.comingSoon')}
          </div>
        </CardContent>
      </Card>
      </div>
    </LicenseGuard>
  );
};

export default Documents;
