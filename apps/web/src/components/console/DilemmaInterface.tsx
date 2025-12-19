'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { PERSONAS } from '@crucible/shared';
import type { DecisionPayload, PersonaId } from '@crucible/shared';
import { Send, User, ChevronRight, ArrowLeft, Loader2 } from 'lucide-react';

interface DilemmaOption {
  id: string;
  label: string;
  description: string;
}

interface DilemmaSnapshot {
  id: string;
  title: string;
  setupNarrative: string;
  presenterPersona: string;
  presentedAt: number;
  expiresAt: number;
  options: DilemmaOption[];
}

interface DilemmaInterfaceProps {
  dilemma: DilemmaSnapshot;
  parishId: string;
  onSubmitDecision: (decision: DecisionPayload) => void;
  disabled?: boolean;
  className?: string;
}

export function DilemmaInterface({
  dilemma,
  parishId,
  onSubmitDecision,
  disabled = false,
  className,
}: DilemmaInterfaceProps) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [rationale, setRationale] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Get persona information
  const persona = PERSONAS[dilemma.presenterPersona as PersonaId];
  const personaName = persona?.name || 'Unknown';
  const personaTitle = persona?.title || '';

  const handleOptionSelect = useCallback((optionId: string) => {
    setSelectedOption(optionId);
    setShowConfirm(true);
  }, []);

  const handleBack = useCallback(() => {
    setSelectedOption(null);
    setShowConfirm(false);
  }, []);

  const handleSubmit = useCallback(() => {
    if (!selectedOption || submitting) return;

    setSubmitting(true);

    onSubmitDecision({
      categoryId: 'dilemma',
      decisionTypeId: dilemma.id,
      choice: selectedOption,
      rationale: rationale || undefined,
    });

    // Reset state after short delay to show feedback
    setTimeout(() => {
      setSelectedOption(null);
      setRationale('');
      setShowConfirm(false);
      setSubmitting(false);
    }, 500);
  }, [selectedOption, rationale, dilemma.id, onSubmitDecision, submitting]);

  const selectedOptionData = dilemma.options.find(o => o.id === selectedOption);

  return (
    <div className={cn('panel', className)}>
      {/* Presenter Header */}
      <div className="flex items-center gap-3 mb-4 pb-3 border-b border-border">
        <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
          <User className="h-5 w-5 text-primary" />
        </div>
        <div>
          <div className="font-semibold">{personaName}</div>
          <div className="text-xs text-muted-foreground">{personaTitle}</div>
        </div>
      </div>

      {/* Dilemma Title & Setup */}
      <h2 className="text-lg font-bold mb-2">{dilemma.title}</h2>
      <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
        {dilemma.setupNarrative}
      </p>

      {/* Confirmation View */}
      {showConfirm && selectedOption && selectedOptionData && (
        <div className="space-y-4">
          {/* Selected Choice */}
          <div className="p-4 bg-muted/50 rounded-lg border border-primary/20">
            <div className="text-sm text-muted-foreground mb-1">Your choice:</div>
            <div className="font-semibold text-primary">{selectedOptionData.label}</div>
            <div className="text-sm text-muted-foreground mt-1">
              {selectedOptionData.description}
            </div>
          </div>

          {/* Rationale Input */}
          <div>
            <label className="text-sm text-muted-foreground block mb-2">
              Why are you making this choice? (optional)
            </label>
            <textarea
              value={rationale}
              onChange={(e) => setRationale(e.target.value)}
              placeholder="Explain your reasoning..."
              className="w-full h-20 px-3 py-2 bg-background border border-input rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleBack}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <Button
              className="flex-1"
              onClick={handleSubmit}
              disabled={disabled || submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Confirm
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Options Selection */}
      {!showConfirm && (
        <div className="space-y-2">
          {dilemma.options.map((option) => (
            <button
              key={option.id}
              onClick={() => handleOptionSelect(option.id)}
              disabled={disabled}
              className={cn(
                'w-full p-4 rounded-lg border text-left transition-all',
                'hover:border-primary hover:bg-primary/5',
                'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
                disabled && 'opacity-50 cursor-not-allowed'
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="font-medium mb-1">{option.label}</div>
                  <div className="text-sm text-muted-foreground">{option.description}</div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
