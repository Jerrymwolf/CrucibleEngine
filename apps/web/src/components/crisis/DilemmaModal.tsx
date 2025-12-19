'use client';

/**
 * DilemmaModal Component
 *
 * Presents dilemmas to teams with persona voice and captures decisions.
 * No values reminders - teams must remember their own commitment.
 *
 * Features:
 * - Persona voice with character styling
 * - Option selection with consequences preview
 * - Rationale capture (free text)
 * - Timer for urgent decisions
 */

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type { Dilemma, DilemmaOption, PersonaFence, PersonaId } from '@crucible/shared';
import { PERSONAS } from '@crucible/shared';
import {
  AlertTriangle,
  Clock,
  ChevronRight,
  User,
  MessageCircle,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

export interface DilemmaModalProps {
  dilemma: Dilemma;
  onDecide: (optionId: string, rationale: string) => void;
  onDismiss?: () => void;
  urgencyLevel?: 'low' | 'medium' | 'high' | 'critical';
  timeLimit?: number; // seconds, optional
}

interface SelectedOption {
  option: DilemmaOption;
  rationale: string;
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

interface PersonaHeaderProps {
  personaId: PersonaId | PersonaId[];
}

function PersonaHeader({ personaId }: PersonaHeaderProps) {
  // Handle multiple personas
  const primaryId = Array.isArray(personaId) ? personaId[0] : personaId;
  const persona = PERSONAS[primaryId];

  if (!persona) return null;

  // Get persona color based on their primary value
  const getPersonaColor = (p: PersonaFence) => {
    switch (p.primaryValue) {
      case 'operational-continuity':
      case 'efficiency':
        return 'from-blue-500/20 to-blue-600/10 border-blue-500/30';
      case 'worker-safety':
      case 'family':
        return 'from-green-500/20 to-green-600/10 border-green-500/30';
      case 'community':
      case 'self-reliance':
        return 'from-purple-500/20 to-purple-600/10 border-purple-500/30';
      case 'precision':
      case 'accountability':
        return 'from-orange-500/20 to-orange-600/10 border-orange-500/30';
      case 'corporate-responsibility':
      case 'long-term-sustainability':
        return 'from-slate-500/20 to-slate-600/10 border-slate-500/30';
      default:
        return 'from-muted to-muted/50 border-muted';
    }
  };

  return (
    <div className={cn(
      'p-4 rounded-t-lg border-b bg-gradient-to-b',
      getPersonaColor(persona)
    )}>
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-background/50 flex items-center justify-center">
          <User className="h-6 w-6 text-foreground/70" />
        </div>
        <div>
          <div className="font-semibold">{persona.name}</div>
          <div className="text-sm text-muted-foreground">{persona.title}</div>
        </div>
      </div>
    </div>
  );
}

interface OptionCardProps {
  option: DilemmaOption;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  disabled: boolean;
}

function OptionCard({ option, index, isSelected, onSelect, disabled }: OptionCardProps) {
  const letterLabels = ['A', 'B', 'C', 'D'];

  return (
    <motion.button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className={cn(
        'w-full text-left p-4 rounded-lg border-2 transition-all',
        isSelected
          ? 'border-primary bg-primary/10'
          : 'border-muted hover:border-muted-foreground/50 bg-muted/30',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn(
          'w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0',
          isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
        )}>
          {letterLabels[index]}
        </div>
        <div className="flex-1">
          <div className="font-semibold mb-1">{option.label}</div>
          <p className="text-sm text-muted-foreground">{option.description}</p>
          {option.consequenceSketch && (
            <div className="mt-2 text-xs text-muted-foreground/70 italic">
              Likely outcome: {option.consequenceSketch.immediate}
            </div>
          )}
        </div>
        {isSelected && (
          <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
        )}
      </div>
    </motion.button>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function DilemmaModal({
  dilemma,
  onDecide,
  onDismiss,
  urgencyLevel = 'medium',
  timeLimit,
}: DilemmaModalProps) {
  const [step, setStep] = useState<'read' | 'choose' | 'rationale' | 'confirm'>('read');
  const [selectedOption, setSelectedOption] = useState<DilemmaOption | null>(null);
  const [rationale, setRationale] = useState('');
  const [timeRemaining, setTimeRemaining] = useState(timeLimit || 0);

  // Get persona info
  const primaryPersonaId = Array.isArray(dilemma.personaId)
    ? dilemma.personaId[0]
    : dilemma.personaId;
  const persona = PERSONAS[primaryPersonaId];

  // Handle option selection
  const handleSelectOption = (option: DilemmaOption) => {
    setSelectedOption(option);
  };

  // Handle continue to rationale
  const handleContinue = () => {
    if (selectedOption) {
      setStep('rationale');
    }
  };

  // Handle final decision
  const handleSubmit = () => {
    if (selectedOption && rationale.trim()) {
      onDecide(selectedOption.id, rationale.trim());
    }
  };

  // Get urgency styling
  const getUrgencyStyle = () => {
    switch (urgencyLevel) {
      case 'critical':
        return 'border-red-500/50 shadow-red-500/20';
      case 'high':
        return 'border-orange-500/50 shadow-orange-500/20';
      case 'medium':
        return 'border-yellow-500/50 shadow-yellow-500/20';
      default:
        return 'border-muted';
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className={cn(
          'w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-xl border-2 bg-background shadow-xl',
          getUrgencyStyle()
        )}
      >
        {/* Persona Header */}
        <PersonaHeader personaId={dilemma.personaId} />

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          <AnimatePresence mode="wait">
            {/* Step 1: Read the Dilemma */}
            {step === 'read' && (
              <motion.div
                key="read"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                {/* Urgency indicator */}
                {urgencyLevel !== 'low' && (
                  <div className={cn(
                    'flex items-center gap-2 text-sm font-semibold px-3 py-1.5 rounded-lg w-fit',
                    urgencyLevel === 'critical' && 'bg-red-500/20 text-red-500',
                    urgencyLevel === 'high' && 'bg-orange-500/20 text-orange-500',
                    urgencyLevel === 'medium' && 'bg-yellow-500/20 text-yellow-500'
                  )}>
                    <AlertTriangle className="h-4 w-4" />
                    {urgencyLevel === 'critical' && 'IMMEDIATE RESPONSE REQUIRED'}
                    {urgencyLevel === 'high' && 'URGENT DECISION NEEDED'}
                    {urgencyLevel === 'medium' && 'Decision Required'}
                  </div>
                )}

                {/* Dilemma Title */}
                <h2 className="text-2xl font-bold">{dilemma.title}</h2>

                {/* Setup / Situation */}
                <div className="p-4 bg-muted/30 rounded-lg border">
                  <div className="flex items-start gap-3">
                    <MessageCircle className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div className="space-y-2">
                      <p className="text-sm italic text-muted-foreground">
                        {persona?.name} approaches you:
                      </p>
                      <p className="whitespace-pre-line">{dilemma.setup}</p>
                    </div>
                  </div>
                </div>

                {/* Signature line if available */}
                {persona?.signatureLine && (
                  <p className="text-sm italic text-muted-foreground text-right">
                    &ldquo;{persona.signatureLine}&rdquo;
                  </p>
                )}

                <Button onClick={() => setStep('choose')} className="w-full" size="lg">
                  Consider Options
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </motion.div>
            )}

            {/* Step 2: Choose an Option */}
            {step === 'choose' && (
              <motion.div
                key="choose"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <h3 className="text-lg font-semibold">What will you do?</h3>

                <div className="space-y-3">
                  {dilemma.options.map((option, index) => (
                    <OptionCard
                      key={option.id}
                      option={option}
                      index={index}
                      isSelected={selectedOption?.id === option.id}
                      onSelect={() => handleSelectOption(option)}
                      disabled={false}
                    />
                  ))}
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep('read')} className="flex-1">
                    Back
                  </Button>
                  <Button
                    onClick={handleContinue}
                    disabled={!selectedOption}
                    className="flex-1"
                  >
                    Continue
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Step 3: Provide Rationale */}
            {step === 'rationale' && selectedOption && (
              <motion.div
                key="rationale"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div>
                  <h3 className="text-lg font-semibold">Why this choice?</h3>
                  <p className="text-sm text-muted-foreground">
                    Briefly explain your team&apos;s reasoning. This helps us understand your
                    decision-making process.
                  </p>
                </div>

                {/* Selected option summary */}
                <div className="p-3 bg-primary/10 border border-primary/30 rounded-lg">
                  <div className="text-xs text-primary mb-1">Selected:</div>
                  <div className="font-semibold">{selectedOption.label}</div>
                </div>

                <Textarea
                  value={rationale}
                  onChange={(e) => setRationale(e.target.value)}
                  placeholder="We chose this because..."
                  className="min-h-[120px]"
                />

                <p className="text-xs text-muted-foreground">
                  {rationale.length}/500 characters
                </p>

                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep('choose')} className="flex-1">
                    Back
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={rationale.trim().length < 10}
                    className="flex-1"
                  >
                    Submit Decision
                    <CheckCircle2 className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Timer (if time limit set) */}
        {timeLimit && timeLimit > 0 && (
          <div className="px-6 py-3 border-t bg-muted/30">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                Time remaining
              </div>
              <span className={cn(
                'font-mono font-bold',
                timeRemaining < 60 && 'text-red-500'
              )}>
                {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
              </span>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
