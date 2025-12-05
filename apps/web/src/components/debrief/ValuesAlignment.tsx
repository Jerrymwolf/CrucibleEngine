'use client';

import { useMemo } from 'react';
import { Progress } from '@/components/ui/progress';

interface ValuesAlignmentProps {
  statedValues: string[];
  decisions: {
    valuesAnalysis?: { value: string; alignment: number }[];
  }[];
}

export function ValuesAlignment({ statedValues, decisions }: ValuesAlignmentProps) {
  const valueStats = useMemo(() => {
    const stats: Record<string, { total: number; count: number }> = {};

    statedValues.forEach(value => {
      stats[value] = { total: 0, count: 0 };
    });

    decisions.forEach(decision => {
      decision.valuesAnalysis?.forEach(va => {
        if (stats[va.value]) {
          stats[va.value].total += va.alignment;
          stats[va.value].count++;
        }
      });
    });

    return statedValues.map(value => ({
      value,
      average: stats[value].count > 0
        ? stats[value].total / stats[value].count
        : 0,
      count: stats[value].count,
    }));
  }, [statedValues, decisions]);

  const overallConsistency = useMemo(() => {
    if (valueStats.length === 0) return 0;
    const positiveCount = valueStats.filter(v => v.average > 0).length;
    return Math.round((positiveCount / valueStats.length) * 100);
  }, [valueStats]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg">Values Consistency</h3>
        <span className="text-2xl font-bold">{overallConsistency}%</span>
      </div>

      <p className="text-sm text-muted-foreground">
        How well did your decisions align with your stated values?
      </p>

      <div className="space-y-3">
        {valueStats.map((stat) => {
          const normalizedValue = ((stat.average + 3) / 6) * 100;
          return (
            <div key={stat.value} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{stat.value}</span>
                <span className="text-muted-foreground">
                  {stat.average > 0 ? '+' : ''}{stat.average.toFixed(1)} avg
                  <span className="text-xs ml-1">({stat.count} decisions)</span>
                </span>
              </div>
              <Progress
                value={normalizedValue}
                className={`h-2 ${
                  stat.average >= 1 ? '[&>div]:bg-status-safe' :
                  stat.average <= -1 ? '[&>div]:bg-destructive' :
                  ''
                }`}
              />
            </div>
          );
        })}
      </div>

      {statedValues.length > 0 && (
        <div className="pt-4 border-t border-border">
          <h4 className="font-medium mb-2">Interpretation Guide</h4>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="p-2 bg-status-safe/10 rounded">
              <span className="font-medium text-status-safe">+1 to +3</span>
              <p className="text-muted-foreground">Strongly aligned</p>
            </div>
            <div className="p-2 bg-muted rounded">
              <span className="font-medium">-1 to +1</span>
              <p className="text-muted-foreground">Neutral</p>
            </div>
            <div className="p-2 bg-destructive/10 rounded">
              <span className="font-medium text-destructive">-1 to -3</span>
              <p className="text-muted-foreground">Misaligned</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
