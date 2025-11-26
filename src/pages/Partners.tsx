import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Search } from 'lucide-react';

const Partners = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const { data: partners, isLoading } = useQuery({
    queryKey: ['partners', searchTerm],
    queryFn: async () => {
      let query = supabase
        .from('partners')
        .select('*')
        .is('deleted_at', null)
        .order('name');

      if (searchTerm) {
        query = query.ilike('name', `%${searchTerm}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Partners</h1>
          <p className="text-muted-foreground">
            Manage your clients, suppliers, and partners
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Partner
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Partners</CardTitle>
          <CardDescription>
            A list of all partners in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search partners..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading partners...
            </div>
          ) : partners && partners.length > 0 ? (
            <div className="space-y-4">
              {partners.map((partner) => (
                <div
                  key={partner.id}
                  className="flex items-center justify-between border rounded-lg p-4 hover:bg-accent/50 transition-colors"
                >
                  <div>
                    <h3 className="font-semibold">{partner.name}</h3>
                    <div className="text-sm text-muted-foreground space-y-1">
                      {partner.email && <p>Email: {partner.email}</p>}
                      {partner.phone && <p>Phone: {partner.phone}</p>}
                      {partner.category && (
                        <span className="inline-block bg-primary/10 text-primary px-2 py-1 rounded-md text-xs">
                          {partner.category}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    View Details
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No partners found. Add your first partner to get started.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Partners;
