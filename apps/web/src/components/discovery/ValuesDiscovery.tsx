'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { GripVertical, Plus, X, Check, ArrowUp, ArrowDown } from 'lucide-react';

// Common values that teams often choose
const SUGGESTED_VALUES = [
  'Transparency',
  'Safety',
  'Compassion',
  'Fairness',
  'Efficiency',
  'Community',
  'Accountability',
  'Innovation',
  'Collaboration',
  'Integrity',
  'Respect',
  'Excellence',
  'Service',
  'Trust',
  'Courage',
];

export interface ValuesDiscoveryData {
  values: string[];
  commitmentStatement: string;
  decisionProcess: 'consensus' | 'majority' | 'leader';
}

interface ValuesDiscoveryProps {
  teamId: string;
  teamName: string;
  parishName: string;
  onSubmitValues: (data: ValuesDiscoveryData) => void;
  onReady: () => void;
  existingValues?: string[];
  isReady: boolean;
}

export function ValuesDiscovery({
  teamId,
  teamName,
  parishName,
  onSubmitValues,
  onReady,
  existingValues = [],
  isReady,
}: ValuesDiscoveryProps) {
  const [values, setValues] = useState<string[]>(
    existingValues.length > 0 ? [...existingValues] : []
  );
  const [customValue, setCustomValue] = useState('');
  const [commitmentStatement, setCommitmentStatement] = useState('');
  const [decisionProcess, setDecisionProcess] = useState<'consensus' | 'majority' | 'leader'>('consensus');
  const [step, setStep] = useState<'select' | 'rank' | 'commit'>(
    existingValues.length >= 3 ? 'rank' : 'select'
  );

  // Add a value
  const addValue = useCallback((value: string) => {
    const trimmed = value.trim();
    if (trimmed && !values.includes(trimmed) && values.length < 5) {
      setValues((prev) => [...prev, trimmed]);
    }
  }, [values]);

  // Remove a value
  const removeValue = useCallback((index: number) => {
    setValues((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // Move value up in rank
  const moveUp = useCallback((index: number) => {
    if (index === 0) return;
    setValues((prev) => {
      const newValues = [...prev];
      [newValues[index - 1], newValues[index]] = [newValues[index]!, newValues[index - 1]!];
      return newValues;
    });
  }, []);

  // Move value down in rank
  const moveDown = useCallback((index: number) => {
    if (index === values.length - 1) return;
    setValues((prev) => {
      const newValues = [...prev];
      [newValues[index], newValues[index + 1]] = [newValues[index + 1]!, newValues[index]!];
      return newValues;
    });
  }, [values.length]);

  // Add custom value
  const handleAddCustom = () => {
    if (customValue.trim()) {
      addValue(customValue);
      setCustomValue('');
    }
  };

  // Submit values (intermediate steps)
  const handleSubmit = () => {
    if (values.length >= 3) {
      if (step === 'select') {
        setStep('rank');
      } else if (step === 'rank') {
        setStep('commit');
      }
    }
  };

  // Final ready - send all discovery data
  const handleReady = () => {
    onSubmitValues({
      values,
      commitmentStatement,
      decisionProcess,
    });
    onReady();
  };

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Values Discovery</h1>
          <p className="text-muted-foreground">
            Team {teamName} | {parishName}
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-2">
          {['select', 'rank', 'commit'].map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
                  step === s
                    ? 'bg-primary text-primary-foreground'
                    : i < ['select', 'rank', 'commit'].indexOf(step)
                      ? 'bg-status-safe text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                )}
              >
                {i < ['select', 'rank', 'commit'].indexOf(step) ? (
                  <Check className="h-4 w-4" />
                ) : (
                  i + 1
                )}
              </div>
              {i < 2 && (
                <div
                  className={cn(
                    'w-12 h-1 rounded',
                    i < ['select', 'rank', 'commit'].indexOf(step)
                      ? 'bg-status-safe'
                      : 'bg-muted'
                  )}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Select Values */}
        {step === 'select' && (
          <div className="panel space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-2">Select Your Team&apos;s Values</h2>
              <p className="text-sm text-muted-foreground">
                Choose 3-5 values that will guide your decisions during the crisis.
                These values represent what your team believes is most important.
              </p>
            </div>

            {/* Selected Values */}
            <div>
              <Label className="mb-2 block">Selected Values ({values.length}/5)</Label>
              <div className="flex flex-wrap gap-2 min-h-[44px] p-3 bg-muted/30 rounded-lg">
                {values.length === 0 ? (
                  <span className="text-sm text-muted-foreground">
                    Click values below to select them
                  </span>
                ) : (
                  values.map((value, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-primary text-primary-foreground rounded-full text-sm"
                    >
                      {value}
                      <button
                        onClick={() => removeValue(i)}
                        className="hover:bg-primary-foreground/20 rounded-full p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))
                )}
              </div>
            </div>

            {/* Suggested Values */}
            <div>
              <Label className="mb-2 block">Suggested Values</Label>
              <div className="flex flex-wrap gap-2">
                {SUGGESTED_VALUES.map((value) => (
                  <button
                    key={value}
                    onClick={() => addValue(value)}
                    disabled={values.includes(value) || values.length >= 5}
                    className={cn(
                      'px-3 py-1 rounded-full text-sm border transition-colors',
                      values.includes(value)
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background border-border hover:border-primary hover:text-primary',
                      values.length >= 5 && !values.includes(value) && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Value */}
            <div>
              <Label className="mb-2 block">Add Custom Value</Label>
              <div className="flex gap-2">
                <Input
                  value={customValue}
                  onChange={(e) => setCustomValue(e.target.value)}
                  placeholder="Enter a custom value..."
                  onKeyDown={(e) => e.key === 'Enter' && handleAddCustom()}
                  disabled={values.length >= 5}
                />
                <Button
                  onClick={handleAddCustom}
                  disabled={!customValue.trim() || values.length >= 5}
                  size="icon"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <Button
              onClick={handleSubmit}
              disabled={values.length < 3}
              className="w-full"
            >
              Continue to Ranking
            </Button>
          </div>
        )}

        {/* Step 2: Rank Values */}
        {step === 'rank' && (
          <div className="panel space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-2">Rank Your Values</h2>
              <p className="text-sm text-muted-foreground">
                Arrange your values in order of importance. The top value is your
                team&apos;s highest priority when faced with difficult decisions.
              </p>
            </div>

            {/* Ranked Values */}
            <div className="space-y-2">
              {values.map((value, i) => (
                <div
                  key={value}
                  className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg"
                >
                  <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                    {i + 1}
                  </span>
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                  <span className="flex-1 font-medium">{value}</span>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => moveUp(i)}
                      disabled={i === 0}
                      className="h-8 w-8"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => moveDown(i)}
                      disabled={i === values.length - 1}
                      className="h-8 w-8"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <p className="text-xs text-muted-foreground text-center">
              Use the arrows to reorder values by priority
            </p>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep('select')} className="flex-1">
                Back
              </Button>
              <Button onClick={handleSubmit} className="flex-1">
                Continue to Commitment
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Commitment Statement */}
        {step === 'commit' && (
          <div className="panel space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-2">Team Commitment</h2>
              <p className="text-sm text-muted-foreground">
                Create a commitment statement that captures how your team will
                uphold these values during the crisis.
              </p>
            </div>

            {/* Values Summary */}
            <div className="p-4 bg-muted/30 rounded-lg">
              <h3 className="font-medium mb-2">Your Team&apos;s Values</h3>
              <ol className="list-decimal list-inside space-y-1 text-sm">
                {values.map((value, i) => (
                  <li key={i}>{value}</li>
                ))}
              </ol>
            </div>

            {/* Commitment Statement */}
            <div>
              <Label className="mb-2 block">Commitment Statement (Optional)</Label>
              <textarea
                value={commitmentStatement}
                onChange={(e) => setCommitmentStatement(e.target.value)}
                placeholder="As Team [name], we commit to..."
                className="w-full h-32 px-3 py-2 bg-background border border-input rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <p className="text-xs text-muted-foreground mt-1">
                This statement will be visible to your team during the simulation
                as a reminder of your shared commitment.
              </p>
            </div>

            <Separator />

            {/* Decision Process */}
            <div>
              <Label className="mb-2 block">How will your team make decisions?</Label>
              <div className="space-y-2">
                {([
                  {
                    id: 'consensus' as const,
                    label: 'Consensus',
                    description: 'Everyone must agree before taking action',
                  },
                  {
                    id: 'majority' as const,
                    label: 'Majority Vote',
                    description: 'Decisions made by majority rule',
                  },
                  {
                    id: 'leader' as const,
                    label: 'Leader Decides',
                    description: 'One person has final decision authority',
                  },
                ]).map((option) => (
                  <label
                    key={option.id}
                    className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg cursor-pointer hover:bg-muted/50"
                  >
                    <input
                      type="radio"
                      name="decisionProcess"
                      value={option.id}
                      className="mt-1"
                      checked={decisionProcess === option.id}
                      onChange={() => setDecisionProcess(option.id)}
                    />
                    <div>
                      <div className="font-medium">{option.label}</div>
                      <div className="text-xs text-muted-foreground">
                        {option.description}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep('rank')} className="flex-1">
                Back
              </Button>
              <Button onClick={handleReady} disabled={isReady} className="flex-1">
                {isReady ? 'Waiting for Others...' : "We're Ready"}
              </Button>
            </div>
          </div>
        )}

        {/* Already Ready */}
        {isReady && (
          <div className="text-center text-sm text-muted-foreground">
            <Check className="h-6 w-6 text-status-safe mx-auto mb-2" />
            Your team&apos;s values have been submitted. Waiting for the Crucible Master
            to begin the briefing...
          </div>
        )}
      </div>
    </div>
  );
}
