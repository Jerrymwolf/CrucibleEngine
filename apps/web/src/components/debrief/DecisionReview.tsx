'use client';

import { useMemo } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Clock, Star, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface Decision {
  id: string;
  teamId: string;
  categoryId: string;
  decisionTypeId: string;
  choice: string;
  rationale: string;
  simulationTime: number;
  realTime: number;
  valuesAnalysis?: {
    value: string;
    alignment: number;
    evidence: string;
  }[];
  notableMoment?: boolean;
  notableReason?: string;
}

interface DecisionReviewProps {
  decisions: Decision[];
  teamId: string;
  statedValues: string[];
}

export function DecisionReview({ decisions, teamId }: DecisionReviewProps) {
  const teamDecisions = useMemo(
    () => decisions
      .filter(d => d.teamId === teamId)
      .sort((a, b) => a.simulationTime - b.simulationTime),
    [decisions, teamId]
  );

  const getAlignmentIcon = (alignment: number) => {
    if (alignment > 0) return <TrendingUp className="h-3 w-3 text-status-safe" />;
    if (alignment < 0) return <TrendingDown className="h-3 w-3 text-destructive" />;
    return <Minus className="h-3 w-3 text-muted-foreground" />;
  };

  const getAlignmentColor = (alignment: number) => {
    if (alignment >= 2) return 'bg-status-safe/20 text-status-safe';
    if (alignment >= 1) return 'bg-status-safe/10 text-status-safe';
    if (alignment <= -2) return 'bg-destructive/20 text-destructive';
    if (alignment <= -1) return 'bg-destructive/10 text-destructive';
    return 'bg-muted text-muted-foreground';
  };

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-lg">Decision Timeline</h3>
      <ScrollArea className="h-[400px]">
        <div className="space-y-4 pr-4">
          {teamDecisions.map((decision, index) => (
            <div
              key={decision.id}
              className={`p-4 rounded-lg border ${
                decision.notableMoment
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-card'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-muted-foreground">
                    #{index + 1}
                  </span>
                  <Badge variant="outline">{decision.categoryId}</Badge>
                  {decision.notableMoment && (
                    <div className="flex items-center gap-1 text-primary">
                      <Star className="h-3 w-3 fill-current" />
                      <span className="text-xs">Notable</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  T+{decision.simulationTime}m
                </div>
              </div>

              <p className="font-medium mb-1">{decision.choice}</p>
              <p className="text-sm text-muted-foreground mb-3">{decision.rationale}</p>

              {decision.notableReason && (
                <p className="text-xs text-primary italic mb-3">
                  &quot;{decision.notableReason}&quot;
                </p>
              )}

              {decision.valuesAnalysis && decision.valuesAnalysis.length > 0 && (
                <div className="pt-3 border-t border-border">
                  <p className="text-xs font-medium mb-2">Values Alignment:</p>
                  <div className="flex flex-wrap gap-2">
                    {decision.valuesAnalysis.map((va, i) => (
                      <div
                        key={i}
                        className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${getAlignmentColor(va.alignment)}`}
                        title={va.evidence}
                      >
                        {getAlignmentIcon(va.alignment)}
                        <span>{va.value}</span>
                        <span className="font-mono">
                          {va.alignment > 0 ? '+' : ''}{va.alignment}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}

          {teamDecisions.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              No decisions recorded for this team.
            </p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
