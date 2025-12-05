import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Copy, Key } from "lucide-react";
import { generateLicenseKey, type LicenseFeature } from "@/lib/license";

const LicenseGenerator = () => {
  const [maxUsers, setMaxUsers] = useState(5);
  const [validFrom, setValidFrom] = useState(new Date().toISOString().split('T')[0]);
  const [validUntil, setValidUntil] = useState(() => {
    const date = new Date();
    date.setFullYear(date.getFullYear() + 1);
    return date.toISOString().split('T')[0];
  });
  
  const [features, setFeatures] = useState({
    partners: true,
    projects: true,
    sales: true,
    documents: true,
    calendar: true,
    my_items: true,
    audit: false,
  });
  
  const [generatedKey, setGeneratedKey] = useState("");
  const [licenseInfo, setLicenseInfo] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate dates
    const fromDate = new Date(validFrom);
    const toDate = new Date(validUntil);
    
    if (toDate < fromDate) {
      toast.error("Az 'Érvényes-ig' dátumnak nagyobbnak vagy egyenlőnek kell lennie az 'Érvényes-től' dátumnál!");
      return;
    }
    
    if (maxUsers < 1 || maxUsers > 1023) {
      toast.error("A maximum felhasználók száma 1 és 1023 között kell legyen!");
      return;
    }
    
    setIsGenerating(true);
    
    try {
      const selectedFeatures = Object.entries(features)
        .filter(([_, enabled]) => enabled)
        .map(([feature]) => feature as LicenseFeature);

      if (selectedFeatures.length === 0) {
        toast.error("Legalább egy funkciót ki kell választani!");
        setIsGenerating(false);
        return;
      }

      // Generate cryptographic license key
      const licenseKey = await generateLicenseKey({
        maxUsers,
        validFrom: fromDate,
        validUntil: toDate,
        features: selectedFeatures
      });

      setGeneratedKey(licenseKey);
      
      // Format feature names for display
      const featureNames: Record<string, string> = {
        'partners': 'Partnerek',
        'projects': 'Projektek',
        'sales': 'Értékesítés',
        'documents': 'Dokumentumok',
        'calendar': 'Naptár',
        'my_items': 'Saját dolgaim',
        'audit': 'Audit napló'
      };
      
      const featureList = selectedFeatures.map(f => featureNames[f] || f).join(', ');
      setLicenseInfo(`Max felhasználók: ${maxUsers} | Funkciók: ${featureList} | Érvényes: ${validFrom} - ${validUntil}`);
      toast.success("Licensz kulcs sikeresen generálva!");
    } catch (error) {
      console.error('License generation error:', error);
      toast.error(error instanceof Error ? error.message : "Hiba a licensz generálása során");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedKey);
    toast.success("Másolva a vágólapra!");
  };

  const handleReset = () => {
    setMaxUsers(5);
    const today = new Date().toISOString().split('T')[0];
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    setValidFrom(today);
    setValidUntil(nextYear.toISOString().split('T')[0]);
    setFeatures({
      partners: true,
      projects: true,
      sales: true,
      documents: true,
      calendar: true,
      my_items: true,
      audit: false,
    });
    setGeneratedKey("");
    setLicenseInfo("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-purple-600 to-purple-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <Key className="h-6 w-6" />
            ORBIX License Generator
          </CardTitle>
          <CardDescription>Mini CRM Licensz Kulcs Generáló</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleGenerate} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="maxUsers">Maximum felhasználók száma</Label>
              <Input
                id="maxUsers"
                type="number"
                min={1}
                max={1000}
                value={maxUsers}
                onChange={(e) => setMaxUsers(parseInt(e.target.value))}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="validFrom">Érvényes-től</Label>
                <Input
                  id="validFrom"
                  type="date"
                  value={validFrom}
                  onChange={(e) => setValidFrom(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="validUntil">Érvényes-ig</Label>
                <Input
                  id="validUntil"
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Elérhető funkciók</Label>
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                {[
                  { key: 'partners', label: 'Partnerek' },
                  { key: 'projects', label: 'Projektek' },
                  { key: 'sales', label: 'Értékesítés' },
                  { key: 'documents', label: 'Dokumentumok' },
                  { key: 'calendar', label: 'Naptár' },
                  { key: 'my_items', label: 'Saját dolgaim' },
                  { key: 'audit', label: 'Audit napló' },
                ].map(({ key, label }) => (
                  <div key={key} className="flex items-center space-x-2">
                    <Checkbox
                      id={key}
                      checked={features[key as keyof typeof features]}
                      onCheckedChange={(checked) =>
                        setFeatures({ ...features, [key]: checked })
                      }
                    />
                    <Label htmlFor={key} className="cursor-pointer font-normal">
                      {label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <Button type="submit" className="flex-1" disabled={isGenerating}>
                {isGenerating ? "Generálás..." : "Licensz Generálása"}
              </Button>
              <Button type="button" variant="outline" onClick={handleReset} disabled={isGenerating}>
                Alaphelyzet
              </Button>
            </div>
          </form>

          {generatedKey && (
            <div className="mt-6 space-y-4 p-4 bg-primary/10 border-2 border-primary rounded-lg animate-in fade-in slide-in-from-top-2">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                ✅ Licensz kulcs sikeresen generálva!
              </h3>
              
              <div className="space-y-2">
                <div className="p-3 bg-background border border-primary rounded font-mono text-xs break-all">
                  {generatedKey}
                </div>
                
                <Button onClick={handleCopy} variant="secondary" className="w-full" size="sm">
                  <Copy className="h-4 w-4 mr-2" />
                  Másolás vágólapra
                </Button>
              </div>

              <div className="p-3 bg-background rounded text-sm text-muted-foreground">
                <strong className="text-foreground">Beállítások:</strong>
                <br />
                {licenseInfo}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LicenseGenerator;
