import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { isCaseInAlarm } from '../utils/dates';
import { Case } from '../types/case';
import { StatusHistoryItem } from '../types/status-history';
import { CaseList } from './case-list';

export function AlarmCases() {
  const [alarmCases, setAlarmCases] = useState<Case[]>([]);
  const [statusHistoryMap, setStatusHistoryMap] = useState<Record<number, StatusHistoryItem[]>>({});

  // Hent alle sager
  const { data: casesData, isLoading: casesLoading } = useQuery({
    queryKey: ['cases'],
    queryFn: async () => {
      const response = await fetch('/api/cases', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Fejl ved hentning af sager');
      return response.json();
    }
  });

  // Hent statushistorik for ALLE sager og identificer alarmsager
  useEffect(() => {
    if (!casesData?.items || casesData.items.length === 0) return;
    
    const fetchStatusHistoryForCases = async () => {
      const historyPromises = casesData.items.map(caseItem =>
        fetch(`/api/cases/${caseItem.id}/status-history`, {
          credentials: 'include',
        }).then(res => res.ok ? res.json() : [])
          .catch(() => [])
      );
      const histories = await Promise.all(historyPromises);
      const historyMap: Record<number, StatusHistoryItem[]> = {};
      casesData.items.forEach((caseItem, idx) => {
        historyMap[caseItem.id] = histories[idx];
      });
      setStatusHistoryMap(historyMap);
      // Identificer sager i alarm
      const alarmedCases = casesData.items.filter(caseItem => 
        isCaseInAlarm(caseItem, historyMap[caseItem.id] || [])
      );
      setAlarmCases(alarmedCases);
    };
    fetchStatusHistoryForCases();
  }, [casesData]);

  if (casesLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Sager i alarm</h2>
        <span className="text-sm text-gray-500">
          {alarmCases.length} sager i alarm
        </span>
      </div>
      <CaseList 
        cases={alarmCases}
        statusHistoryMap={statusHistoryMap}
        showAlarmIndicator={true}
      />
    </div>
  );
} 