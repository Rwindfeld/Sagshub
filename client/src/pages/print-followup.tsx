import React, { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { PrintFollowupLayout } from '@/components/print-followup-layout';
import { CaseWithCustomer } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';

export default function PrintFollowupPage() {
  const [, setLocation] = useLocation();
  const [caseData, setCaseData] = useState<CaseWithCustomer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const caseId = urlParams.get('caseId');
    
    if (!caseId) {
      setError('Intet sags-ID fundet');
      setLoading(false);
      return;
    }

    const fetchCaseData = async () => {
      try {
        const response = await apiRequest('GET', `/api/cases/${caseId}`);
        if (!response.ok) {
          throw new Error('Kunne ikke hente sag data');
        }
        const data = await response.json();
        setCaseData(data);
      } catch (err) {
        setError('Fejl ved hentning af sag data');
        console.error('Error fetching case data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCaseData();
  }, []);

  const handlePrintComplete = () => {
    // Gå tilbage til cases siden efter print
    setLocation('/worker/cases');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div>Henter sag data...</div>
      </div>
    );
  }

  if (error || !caseData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-red-600 mb-4">{error || 'Sag ikke fundet'}</div>
          <button
            onClick={() => setLocation('/worker/cases')}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Tilbage til sager
          </button>
        </div>
      </div>
    );
  }

  return (
    <PrintFollowupLayout 
      caseData={caseData} 
      onPrint={handlePrintComplete}
    />
  );
} 