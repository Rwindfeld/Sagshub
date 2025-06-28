import { useAlarmCasesQuery } from '../queries/cases';
import { CaseList } from './case-list';

export function AlarmCases() {
  // Brug den optimerede alarm query med hurtigere polling (10 sekunder)
  const { data: alarmCases = [], isLoading: casesLoading } = useAlarmCasesQuery();

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
        statusHistoryMap={{}} // Tom da serveren allerede returnerer alarm sager
        showAlarmIndicator={true}
      />
    </div>
  );
} 