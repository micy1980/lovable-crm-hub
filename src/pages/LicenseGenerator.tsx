import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Copy, Key } from "lucide-react";

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
    logs: false,
  });
  
  const [generatedKey, setGeneratedKey] = useState("");
  const [licenseInfo, setLicenseInfo] = useState("");

  const generateRandomString = (length: number): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  // Simple encryption function using XOR with a secret key
  const encryptData = (data: string, secretKey: string): string => {
    let encrypted = '';
    for (let i = 0; i < data.length; i++) {
      encrypted += String.fromCharCode(data.charCodeAt(i) ^ secretKey.charCodeAt(i % secretKey.length));
    }
    return btoa(encrypted); // Base64 encode the encrypted data
  };

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    
    const selectedFeatures = Object.entries(features)
      .filter(([_, enabled]) => enabled)
      .map(([feature]) => feature);

    const licenseData = {
      max_users: maxUsers,
      features: selectedFeatures,
      valid_from: validFrom,
      valid_until: validUntil,
      generated_at: new Date().toISOString()
    };

    const jsonString = JSON.stringify(licenseData);
    
    // SECRET KEY - Ez csak a generátorban van, a CRM-ben az edge functionben is be kell állítani!
    const SECRET_KEY = "ORBIX_LICENSE_SECRET_2025";
    
    // Encrypt the license data
    const encryptedData = encryptData(jsonString, SECRET_KEY);
    
    // Generate 75 character license key (ORB-XXXXX-XXXXX-XXXXX-XXXXX-XXXXX format)
    // The encrypted data is embedded in the key blocks
    const keyData = encryptedData.replace(/[^A-Za-z0-9]/g, '').toUpperCase().substring(0, 75);
    const paddedKeyData = (keyData + generateRandomString(75)).substring(0, 75);
    
    const licenseKey = `ORB-${paddedKeyData.substring(0, 5)}-${paddedKeyData.substring(5, 10)}-${paddedKeyData.substring(10, 15)}-${paddedKeyData.substring(15, 20)}-${paddedKeyData.substring(20, 25)}-${paddedKeyData.substring(25, 30)}-${paddedKeyData.substring(30, 35)}-${paddedKeyData.substring(35, 40)}-${paddedKeyData.substring(40, 45)}-${paddedKeyData.substring(45, 50)}-${paddedKeyData.substring(50, 55)}-${paddedKeyData.substring(55, 60)}-${paddedKeyData.substring(60, 65)}-${paddedKeyData.substring(65, 70)}-${paddedKeyData.substring(70, 75)}`;

    setGeneratedKey(licenseKey);
    setLicenseInfo(`Max felhasználók: ${maxUsers} | Funkciók: ${selectedFeatures.join(', ')} | Érvényes: ${validFrom} - ${validUntil} | Titkosított: ${encryptedData.substring(0, 20)}...`);
    toast.success("Licensz kulcs sikeresen generálva!");
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
      logs: false,
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
                  { key: 'logs', label: 'Naplók' },
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
              <Button type="submit" className="flex-1">
                Licensz Generálása
              </Button>
              <Button type="button" variant="outline" onClick={handleReset}>
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
