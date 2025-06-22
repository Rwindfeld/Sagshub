import { useState, useEffect } from 'react';
import { useLiveActivity } from '../hooks/use-live-activity';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Trash2, Wifi, WifiOff } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { da } from 'date-fns/locale';

export function LiveActivityPanel() {
  const { activities, isConnected, clearActivities } = useLiveActivity();
  const [isExpanded, setIsExpanded] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);

  // Debug information
  useEffect(() => {
    const info = [
      `WebSocket Status: ${isConnected ? 'Tilsluttet' : 'Afbrudt'}`,
      `Aktiviteter: ${activities.length}`,
      `Sidste opdatering: ${new Date().toLocaleTimeString()}`
    ];
    setDebugInfo(info);
  }, [isConnected, activities]);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'case_created':
        return '📋';
      case 'case_updated':
        return '✏️';
      case 'case_status_updated':
        return '🔄';
      case 'case_deleted':
        return '🗑️';
      case 'customer_created':
        return '👤';
      case 'customer_updated':
        return '👤';
      case 'order_created':
        return '🛒';
      case 'order_updated':
        return '📦';
      default:
        return '📢';
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'case_created':
      case 'customer_created':
      case 'order_created':
        return 'bg-green-100 text-green-800';
      case 'case_updated':
      case 'customer_updated':
      case 'order_updated':
        return 'bg-blue-100 text-blue-800';
      case 'case_status_updated':
        return 'bg-yellow-100 text-yellow-800';
      case 'case_deleted':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className="w-full max-w-sm border-4 border-red-500 bg-yellow-100">
      <CardHeader className="pb-3 bg-blue-100">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2 font-bold">
            🔔 Live Aktivitet
            {isConnected ? (
              <Wifi className="h-4 w-4 text-green-500" />
            ) : (
              <WifiOff className="h-4 w-4 text-red-500" />
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant={isConnected ? 'default' : 'destructive'}>
              {isConnected ? 'Tilsluttet' : 'Afbrudt'}
            </Badge>
            {activities.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearActivities}
                title="Ryd aktiviteter"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        {/* Debug information - ALTID SYNLIG */}
        <div className="text-xs text-gray-700 space-y-1 bg-white p-2 rounded">
          {debugInfo.map((info, index) => (
            <div key={index} className="font-mono">{info}</div>
          ))}
          <div className="font-bold text-red-600">
            Panel ER synligt! Aktiviteter: {activities.length}
          </div>
        </div>
      </CardHeader>
      <CardContent className="bg-white">
        <ScrollArea className={isExpanded ? "h-96" : "h-48"}>
          <div className="text-center text-muted-foreground py-8">
            <div className="text-2xl mb-2">🔔</div>
            <p className="font-bold">Live Aktivitet Panel</p>
            <p className="text-sm">Live opdateringer vises her</p>
            <div className="mt-4 text-xs text-gray-600 bg-gray-100 p-3 rounded">
              <p><strong>WebSocket URL:</strong> ws://localhost:3000</p>
              <p><strong>Status:</strong> {isConnected ? '✅ Forbundet' : '❌ Ikke forbundet'}</p>
              <p><strong>Aktiviteter modtaget:</strong> {activities.length}</p>
            </div>
          </div>
          
          {activities.length > 0 && (
            <div className="space-y-3 mt-4">
              <h3 className="font-bold text-green-600">Aktiviteter:</h3>
              {activities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 p-3 rounded-lg border bg-card"
                >
                  <div className="text-lg flex-shrink-0">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge 
                        variant="secondary" 
                        className={`text-xs ${getActivityColor(activity.type)}`}
                      >
                        {activity.type.replace(/_/g, ' ')}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(activity.timestamp), {
                          addSuffix: true,
                          locale: da
                        })}
                      </span>
                    </div>
                    <p className="text-sm text-foreground break-words">
                      {activity.message}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        {activities.length > 5 && (
          <div className="mt-3 pt-3 border-t">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="w-full"
            >
              {isExpanded ? 'Vis færre' : `Vis alle (${activities.length})`}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 