import { useLiveActivity } from '../hooks/use-live-activity';
import { format } from 'date-fns';
import { da } from 'date-fns/locale';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

export function LiveActivityMenu() {
  const { activities, isConnected } = useLiveActivity();
  const queryClient = useQueryClient();
  
  // Vis kun de seneste 7 aktiviteter
  const recentActivities = activities.slice(0, 7);

  const handleActivityClick = useCallback(async (activity: any) => {
    try {
      // Udtræk sagsnummer og case ID fra meddelelsen eller data
      const caseNumber = activity.data?.case?.caseNumber || 
                        activity.message?.match(/([A-Z]{3}\d{5})/)?.[1];
      const caseId = activity.data?.case?.id;
      
      if (caseNumber) {
        // Invalidér alle relevante queries før navigation
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["/api/cases"] }),
          queryClient.invalidateQueries({ queryKey: ["/api/cases", caseNumber] }),
          queryClient.invalidateQueries({ queryKey: ["/api/cases", caseNumber, "status-history"] }),
          queryClient.invalidateQueries({ queryKey: ["/api/cases", caseNumber, "orders"] }),
          // Også invalidér med case ID hvis tilgængeligt
          caseId ? queryClient.invalidateQueries({ queryKey: ["/api/cases", caseId.toString()] }) : Promise.resolve(),
          caseId ? queryClient.invalidateQueries({ queryKey: ["/api/cases", caseId.toString(), "status-history"] }) : Promise.resolve(),
          caseId ? queryClient.invalidateQueries({ queryKey: ["/api/cases", caseId.toString(), "orders"] }) : Promise.resolve(),
        ]);
        
        // Navigér direkte til sagen
        window.location.href = `/worker/cases/${caseNumber}`;
      }
    } catch (error) {
      console.error('Error handling activity click:', error);
    }
  }, [queryClient]);

  return (
    <div className="mt-4 border-t border-border pt-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-foreground">Live aktivitet</h3>
        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
      </div>
      
      {recentActivities.length === 0 ? (
        <div className="text-xs text-muted-foreground py-2">
          Ingen aktivitet endnu
        </div>
      ) : (
        <div className="space-y-2">
          {recentActivities.map((activity) => {
            const caseNumber = activity.data?.case?.caseNumber || 
                              activity.message?.match(/([A-Z]{3}\d{5})/)?.[1];
            
            return (
              <div 
                key={activity.id} 
                className={`text-xs py-2 px-2 border-b border-border last:border-b-0 rounded hover:bg-muted/30 dark:hover:bg-muted/50 transition-colors ${caseNumber ? 'cursor-pointer' : ''}`}
                onClick={() => handleActivityClick(activity)}
                title={activity.message}
              >
                <div className="text-foreground leading-relaxed break-words">
                  {activity.message}
                </div>
                <div className="text-muted-foreground mt-1">
                  {format(new Date(activity.timestamp), 'HH:mm', { locale: da })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
} 
