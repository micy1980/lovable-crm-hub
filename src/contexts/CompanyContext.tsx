import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useUserCompanies } from '@/hooks/useUserCompanies';

interface Company {
  id: string;
  name: string;
  tax_id: string | null;
}

interface CompanyContextType {
  activeCompany: Company | null;
  setActiveCompany: (company: Company | null) => void;
  companies: Company[];
}

const CompanyContext = createContext<CompanyContextType>({
  activeCompany: null,
  setActiveCompany: () => {},
  companies: [],
});

export const useCompany = () => {
  const context = useContext(CompanyContext);
  if (!context) {
    throw new Error('useCompany must be used within CompanyProvider');
  }
  return context;
};

export const CompanyProvider = ({ children }: { children: ReactNode }) => {
  const [activeCompany, setActiveCompany] = useState<Company | null>(null);
  const { data: companies = [] } = useUserCompanies();

  // Set first company as active by default
  useEffect(() => {
    if (companies.length > 0 && !activeCompany) {
      setActiveCompany(companies[0] as Company);
    }
  }, [companies, activeCompany]);

  return (
    <CompanyContext.Provider value={{ activeCompany, setActiveCompany, companies: companies as Company[] }}>
      {children}
    </CompanyContext.Provider>
  );
};
