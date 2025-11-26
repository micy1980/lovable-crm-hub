import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useUserCompanies } from '@/hooks/useUserCompanies';

const ACTIVE_COMPANY_KEY = 'mini_crm_active_company_id';

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

  // Load active company from localStorage or set first available
  useEffect(() => {
    if (companies.length === 0) return;

    const storedCompanyId = localStorage.getItem(ACTIVE_COMPANY_KEY);
    
    if (storedCompanyId) {
      const storedCompany = companies.find((c: any) => c.id === storedCompanyId);
      if (storedCompany) {
        setActiveCompany(storedCompany as Company);
        return;
      }
    }
    
    // Set first company as default if no stored selection
    if (!activeCompany) {
      setActiveCompany(companies[0] as Company);
      localStorage.setItem(ACTIVE_COMPANY_KEY, companies[0].id);
    }
  }, [companies, activeCompany]);

  // Persist company selection to localStorage
  const handleSetActiveCompany = (company: Company | null) => {
    setActiveCompany(company);
    if (company) {
      localStorage.setItem(ACTIVE_COMPANY_KEY, company.id);
    } else {
      localStorage.removeItem(ACTIVE_COMPANY_KEY);
    }
  };

  return (
    <CompanyContext.Provider value={{ activeCompany, setActiveCompany: handleSetActiveCompany, companies: companies as Company[] }}>
      {children}
    </CompanyContext.Provider>
  );
};
