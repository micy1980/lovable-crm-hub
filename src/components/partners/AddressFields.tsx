import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslation } from 'react-i18next';
import { useMasterData } from '@/hooks/useMasterData';
import { usePostalCodes, usePostalCodeLookup, PostalCodeData } from '@/hooks/usePostalCodes';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AddressData {
  country: string;
  county: string;
  postal_code: string;
  city: string;
  street_name: string;
  street_type: string;
  house_number: string;
  plot_number: string;
  building: string;
  staircase: string;
  floor_door: string;
}

interface AddressFieldsProps {
  title?: string;
  data: AddressData;
  onChange: (data: AddressData) => void;
}

export function AddressFields({ title, data, onChange }: AddressFieldsProps) {
  const { t } = useTranslation();
  const { items: countries, isLoading: countriesLoading } = useMasterData('COUNTRY');
  const { items: counties, isLoading: countiesLoading } = useMasterData('COUNTY');
  const { items: streetTypes, isLoading: streetTypesLoading } = useMasterData('STREET_TYPE');
  
  const [postalCodeSearch, setPostalCodeSearch] = useState('');
  const [citySearch, setCitySearch] = useState('');
  const [countrySearch, setCountrySearch] = useState('');
  const [streetTypeSearch, setStreetTypeSearch] = useState('');
  const [postalOpen, setPostalOpen] = useState(false);
  const [cityOpen, setCityOpen] = useState(false);
  const [countryOpen, setCountryOpen] = useState(false);
  const [streetTypeOpen, setStreetTypeOpen] = useState(false);
  
  const { data: postalCodes = [] } = usePostalCodes(postalCodeSearch || citySearch);
  const { data: lookupResult } = usePostalCodeLookup(data.postal_code);

  useEffect(() => {
    if (lookupResult && data.postal_code === lookupResult.postal_code) {
      const updates: Partial<AddressData> = {};
      
      if (!data.city && lookupResult.city) {
        updates.city = lookupResult.city;
      }
      if (!data.county && lookupResult.county) {
        // Handle "-" county for Budapest directly
        if (lookupResult.county === '-') {
          updates.county = '-';
        } else {
          const matchingCounty = counties.find((c: any) => 
            c.label.toLowerCase() === lookupResult.county?.toLowerCase() ||
            c.value.toLowerCase() === lookupResult.county?.toLowerCase()
          );
          if (matchingCounty) {
            updates.county = matchingCounty.value;
          }
        }
      }
      if (!data.country && lookupResult.country === 'Magyarország') {
        updates.country = 'Hungary';
      }
      
      if (Object.keys(updates).length > 0) {
        onChange({ ...data, ...updates });
      }
    }
  }, [lookupResult, data.postal_code, counties]);

  const handleChange = (field: keyof AddressData, value: string) => {
    onChange({ ...data, [field]: value });
  };

  const handlePostalCodeSelect = (postalCode: PostalCodeData) => {
    let countyValue = '';
    if (postalCode.county === '-') {
      countyValue = '-';
    } else if (postalCode.county) {
      const matchingCounty = counties.find((c: any) => 
        c.label.toLowerCase() === postalCode.county?.toLowerCase() ||
        c.value.toLowerCase() === postalCode.county?.toLowerCase()
      );
      countyValue = matchingCounty?.value || '';
    }
    
    onChange({
      ...data,
      postal_code: postalCode.postal_code,
      city: postalCode.city,
      county: countyValue,
      country: 'Hungary'
    });
    setPostalOpen(false);
  };

  const handleCitySelect = (postalCode: PostalCodeData) => {
    let countyValue = '';
    if (postalCode.county === '-') {
      countyValue = '-';
    } else if (postalCode.county) {
      const matchingCounty = counties.find((c: any) => 
        c.label.toLowerCase() === postalCode.county?.toLowerCase() ||
        c.value.toLowerCase() === postalCode.county?.toLowerCase()
      );
      countyValue = matchingCounty?.value || '';
    }
    
    onChange({
      ...data,
      postal_code: postalCode.postal_code,
      city: postalCode.city,
      county: countyValue,
      country: 'Hungary'
    });
    setCityOpen(false);
  };

  const uniquePostalCodes = postalCodes.reduce((acc: PostalCodeData[], curr) => {
    if (!acc.find(p => p.postal_code === curr.postal_code && p.city === curr.city)) {
      acc.push(curr);
    }
    return acc;
  }, []);

  // Filter countries based on search
  const filteredCountries = countries.filter((c: any) => 
    c.label.toLowerCase().includes(countrySearch.toLowerCase()) ||
    c.value.toLowerCase().includes(countrySearch.toLowerCase())
  );

  // Filter street types based on search
  const filteredStreetTypes = streetTypes.filter((s: any) => 
    s.label.toLowerCase().includes(streetTypeSearch.toLowerCase())
  );

  // Get display labels
  const getCountryLabel = (value: string) => {
    const country = countries.find((c: any) => c.value === value);
    return country?.label || value;
  };

  const getStreetTypeLabel = (value: string) => {
    const streetType = streetTypes.find((s: any) => s.value === value);
    return streetType?.label || value;
  };

  const getCountyLabel = (value: string) => {
    const county = counties.find((c: any) => c.value === value);
    return county?.label || value;
  };

  return (
    <div className="space-y-4">
      {title && <h4 className="font-medium text-sm text-muted-foreground">{title}</h4>}
      
      {/* Ország és megye */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-sm">{t('partners.address.country')}</Label>
          <Popover open={countryOpen} onOpenChange={setCountryOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={countryOpen}
                className="w-full h-10 justify-between font-normal"
              >
                {data.country ? getCountryLabel(data.country) : t('partners.address.selectCountry')}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0 bg-popover" align="start">
              <Command>
                <CommandInput 
                  placeholder={t('partners.address.searchCountry', 'Keresés...')}
                  value={countrySearch}
                  onValueChange={setCountrySearch}
                />
                <CommandList>
                  <CommandEmpty>{t('partners.address.noResults', 'Nincs találat')}</CommandEmpty>
                  <CommandGroup>
                    {filteredCountries.slice(0, 50).map((c: any) => (
                      <CommandItem
                        key={c.id}
                        value={`${c.label} ${c.value}`}
                        onSelect={() => {
                          handleChange('country', c.value);
                          setCountryOpen(false);
                          setCountrySearch('');
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            data.country === c.value ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {c.label}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
        <div className="space-y-2">
          <Label className="text-sm">{t('partners.address.county')}</Label>
          <Select value={data.county || ''} onValueChange={(v) => handleChange('county', v)}>
            <SelectTrigger className="h-10">
              <SelectValue placeholder={t('partners.address.selectCounty')}>
                {data.county ? getCountyLabel(data.county) : t('partners.address.selectCounty')}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {counties.map((c: any) => (
                <SelectItem key={c.id} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Irányítószám és település */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label className="text-sm">{t('partners.address.postalCode')}</Label>
          <Popover open={postalOpen} onOpenChange={setPostalOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={postalOpen}
                className="w-full h-10 justify-between font-normal"
              >
                {data.postal_code || t('partners.address.selectPostalCode', 'Irányítószám')}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[280px] p-0 bg-popover" align="start">
              <Command>
                <CommandInput 
                  placeholder={t('partners.address.searchPostalCode', 'Keresés...')}
                  value={postalCodeSearch}
                  onValueChange={setPostalCodeSearch}
                />
                <CommandList>
                  <CommandEmpty>{t('partners.address.noResults', 'Nincs találat')}</CommandEmpty>
                  <CommandGroup>
                    {uniquePostalCodes.map((pc) => (
                      <CommandItem
                        key={`${pc.postal_code}-${pc.city}`}
                        value={`${pc.postal_code} ${pc.city}`}
                        onSelect={() => handlePostalCodeSelect(pc)}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            data.postal_code === pc.postal_code && data.city === pc.city
                              ? "opacity-100"
                              : "opacity-0"
                          )}
                        />
                        {pc.postal_code} - {pc.city}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
        <div className="col-span-1 sm:col-span-2 space-y-2">
          <Label className="text-sm">{t('partners.address.city')}</Label>
          <Popover open={cityOpen} onOpenChange={setCityOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={cityOpen}
                className="w-full h-10 justify-between font-normal"
              >
                {data.city || t('partners.address.selectCity', 'Település')}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[320px] p-0 bg-popover" align="start">
              <Command>
                <CommandInput 
                  placeholder={t('partners.address.searchCity', 'Keresés...')}
                  value={citySearch}
                  onValueChange={setCitySearch}
                />
                <CommandList>
                  <CommandEmpty>{t('partners.address.noResults', 'Nincs találat')}</CommandEmpty>
                  <CommandGroup>
                    {uniquePostalCodes.map((pc) => (
                      <CommandItem
                        key={`city-${pc.postal_code}-${pc.city}`}
                        value={`${pc.city} ${pc.postal_code}`}
                        onSelect={() => handleCitySelect(pc)}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            data.city === pc.city && data.postal_code === pc.postal_code
                              ? "opacity-100"
                              : "opacity-0"
                          )}
                        />
                        {pc.city} ({pc.postal_code})
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Közterület */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="col-span-2 space-y-2">
          <Label className="text-sm">{t('partners.address.streetName')}</Label>
          <Input 
            value={data.street_name || ''} 
            onChange={(e) => handleChange('street_name', e.target.value)}
            className="h-10"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-sm">{t('partners.address.streetType')}</Label>
          <Popover open={streetTypeOpen} onOpenChange={setStreetTypeOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={streetTypeOpen}
                className="w-full h-10 justify-between font-normal"
              >
                {data.street_type ? getStreetTypeLabel(data.street_type) : t('partners.address.selectType')}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0 bg-popover" align="start">
              <Command>
                <CommandInput 
                  placeholder={t('partners.address.searchStreetType', 'Keresés...')}
                  value={streetTypeSearch}
                  onValueChange={setStreetTypeSearch}
                />
                <CommandList>
                  <CommandEmpty>{t('partners.address.noResults', 'Nincs találat')}</CommandEmpty>
                  <CommandGroup>
                    {filteredStreetTypes.map((s: any) => (
                      <CommandItem
                        key={s.id}
                        value={s.label}
                        onSelect={() => {
                          handleChange('street_type', s.value);
                          setStreetTypeOpen(false);
                          setStreetTypeSearch('');
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            data.street_type === s.value ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {s.label}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
        <div className="space-y-2">
          <Label className="text-sm">{t('partners.address.houseNumber')}</Label>
          <Input 
            value={data.house_number || ''} 
            onChange={(e) => handleChange('house_number', e.target.value)}
            className="h-10"
          />
        </div>
      </div>

      {/* Egyéb címadatok */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="space-y-2">
          <Label className="text-sm">{t('partners.address.plotNumber')}</Label>
          <Input 
            value={data.plot_number || ''} 
            onChange={(e) => handleChange('plot_number', e.target.value)}
            placeholder="hrsz"
            className="h-10"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-sm">{t('partners.address.building')}</Label>
          <Input 
            value={data.building || ''} 
            onChange={(e) => handleChange('building', e.target.value)}
            className="h-10"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-sm">{t('partners.address.staircase')}</Label>
          <Input 
            value={data.staircase || ''} 
            onChange={(e) => handleChange('staircase', e.target.value)}
            className="h-10"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-sm">{t('partners.address.floorDoor')}</Label>
          <Input 
            value={data.floor_door || ''} 
            onChange={(e) => handleChange('floor_door', e.target.value)}
            placeholder="em./ajtó"
            className="h-10"
          />
        </div>
      </div>
    </div>
  );
}
