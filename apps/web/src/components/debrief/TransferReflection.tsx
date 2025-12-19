'use client';

/**
 * TransferReflection Component
 *
 * Helps participants transfer insights from the simulation to real life.
 * Captures:
 * 1. A real situation where they felt similar pressure
 * 2. Which value was tested
 * 3. A personal commitment for next time
 *
 * Enhanced with:
 * - Step-by-step animated journey
 * - Sound effects for emotional resonance
 * - Ceremonial commitment builder
 * - Shareable commitment card
 *
 * Design principle: Application, not assessment.
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useSound } from '@/hooks/useSound';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Heart,
  Lightbulb,
  Target,
  Sparkles,
  Share2,
  Download,
  Feather,
  Shield,
  Zap,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

export interface TransferReflectionProps {
  teamName: string;
  teamValues: string[];
  participantName: string;
  onSubmit: (reflection: TransferReflectionData) => void;
  onShare?: (reflection: TransferReflectionData) => void;
  className?: string;
}

export interface TransferReflectionData {
  realSituation: string;
  pressureDescription: string;
  valuesTested: string[];
  whatYouDid?: string;
  whatYouWouldDoDifferently?: string;
  personalCommitment: {
    pressure: string;
    action: string;
    value: string;
  };
  participantName: string;
  teamName: string;
  timestamp: number;
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function ProgressDots({
  currentStep,
  totalSteps,
  stepLabels,
}: {
  currentStep: number;
  totalSteps: number;
  stepLabels: string[];
}) {
  return (
    <div className="flex items-center justify-center gap-3">
      {Array.from({ length: totalSteps }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <motion.div
            initial={false}
            animate={{
              scale: i === currentStep ? 1.2 : 1,
              backgroundColor:
                i < currentStep
                  ? 'hsl(var(--primary))'
                  : i === currentStep
                    ? 'hsl(var(--primary))'
                    : 'hsl(var(--muted))',
            }}
            className={cn(
              'w-3 h-3 rounded-full transition-colors relative',
              i <= currentStep ? 'ring-2 ring-primary/30' : ''
            )}
          >
            {i === currentStep && (
              <motion.div
                animate={{ scale: [1, 1.5, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute inset-0 rounded-full bg-primary/30"
              />
            )}
          </motion.div>
          {i < totalSteps - 1 && (
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: i < currentStep ? 1 : 0 }}
              className="w-12 h-0.5 bg-primary origin-left"
            />
          )}
        </div>
      ))}
    </div>
  );
}

function CommitmentCard({
  commitment,
  participantName,
  teamName,
  isAnimated = true,
}: {
  commitment: TransferReflectionData['personalCommitment'];
  participantName: string;
  teamName: string;
  isAnimated?: boolean;
}) {
  const containerVariants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.5,
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  const Wrapper = isAnimated ? motion.div : 'div';
  const wrapperProps = isAnimated
    ? { variants: containerVariants, initial: 'hidden', animate: 'visible' }
    : {};

  return (
    <Wrapper
      {...wrapperProps}
      className="relative p-8 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-2 border-primary/30 rounded-2xl overflow-hidden"
    >
      {/* Decorative elements */}
      <div className="absolute top-4 right-4 text-primary/20">
        <Feather className="h-12 w-12" />
      </div>
      <div className="absolute bottom-4 left-4 text-primary/10">
        <Shield className="h-16 w-16" />
      </div>

      {/* Header */}
      <motion.div variants={itemVariants} className="text-center mb-6">
        <Sparkles className="h-6 w-6 mx-auto text-primary mb-2" />
        <h3 className="text-lg font-bold text-primary">Personal Commitment</h3>
        <p className="text-sm text-muted-foreground">{participantName} - Team {teamName}</p>
      </motion.div>

      {/* Commitment Text */}
      <motion.div variants={itemVariants} className="relative z-10">
        <p className="text-xl leading-relaxed text-center">
          <span className="text-muted-foreground">&ldquo;The next time I feel </span>
          <span className="font-bold text-amber-500">{commitment.pressure || '...'}</span>
          <span className="text-muted-foreground">, I will </span>
          <span className="font-bold text-green-500">{commitment.action || '...'}</span>
          <span className="text-muted-foreground"> to stay aligned with </span>
          <span className="font-bold text-primary">{commitment.value || '...'}</span>
          <span className="text-muted-foreground">.&rdquo;</span>
        </p>
      </motion.div>

      {/* Date */}
      <motion.div variants={itemVariants} className="text-center mt-6">
        <p className="text-xs text-muted-foreground">
          {new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>
      </motion.div>
    </Wrapper>
  );
}

function ValueSelector({
  values,
  selected,
  onToggle,
}: {
  values: string[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  const { play: playSound } = useSound();

  return (
    <div className="flex flex-wrap gap-2 justify-center">
      {values.map((value, index) => {
        const isSelected = selected.includes(value);
        return (
          <motion.button
            key={value}
            type="button"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => {
              onToggle(value);
              playSound('ui', isSelected ? 'click' : 'select');
            }}
            className={cn(
              'px-4 py-2 rounded-full text-sm font-medium transition-all border-2',
              isSelected
                ? 'bg-primary text-primary-foreground border-primary scale-105 shadow-lg'
                : 'bg-background hover:bg-muted border-border hover:border-primary/50'
            )}
          >
            {isSelected && <CheckCircle2 className="h-3 w-3 inline mr-1.5" />}
            {value}
          </motion.button>
        );
      })}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function TransferReflection({
  teamName,
  teamValues,
  participantName,
  onSubmit,
  onShare,
  className,
}: TransferReflectionProps) {
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const { play: playSound } = useSound();
  const [formData, setFormData] = useState<Partial<TransferReflectionData>>({
    participantName,
    teamName,
    timestamp: Date.now(),
    valuesTested: [],
    personalCommitment: {
      pressure: '',
      action: '',
      value: '',
    },
  });

  const handleSubmit = () => {
    if (formData.realSituation && formData.personalCommitment?.pressure && formData.personalCommitment?.action) {
      playSound('dramatic', 'commitmentSeal');
      onSubmit(formData as TransferReflectionData);
      setSubmitted(true);
    }
  };

  const toggleValue = (value: string) => {
    setFormData((prev) => {
      const current = prev.valuesTested || [];
      const updated = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      return { ...prev, valuesTested: updated };
    });
  };

  const goToStep = (newStep: number) => {
    setStep(newStep);
    playSound('ui', 'click');
  };

  const steps = [
    {
      title: 'Real Situation',
      subtitle: 'Think of a real situation where you felt similar pressure',
      icon: <Lightbulb className="h-6 w-6" />,
      color: 'text-amber-500',
    },
    {
      title: 'Values at Stake',
      subtitle: 'Which values were tested in that situation?',
      icon: <Heart className="h-6 w-6" />,
      color: 'text-red-500',
    },
    {
      title: 'Personal Commitment',
      subtitle: 'What will you do differently next time?',
      icon: <Target className="h-6 w-6" />,
      color: 'text-primary',
    },
  ];

  // Submitted confirmation
  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={cn('space-y-8', className)}
      >
        {/* Success Header */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className="text-center"
        >
          <div className="mx-auto w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mb-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3 }}
            >
              <CheckCircle2 className="h-10 w-10 text-green-500" />
            </motion.div>
          </div>
          <h2 className="text-3xl font-bold mb-2">Commitment Sealed</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Your commitment has been recorded. The real test comes when you face
            that pressure in the future. You now have language for what to do.
          </p>
        </motion.div>

        {/* Commitment Card */}
        <CommitmentCard
          commitment={formData.personalCommitment!}
          participantName={participantName}
          teamName={teamName}
        />

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="flex justify-center gap-3"
        >
          {onShare && (
            <Button
              variant="outline"
              onClick={() => onShare(formData as TransferReflectionData)}
            >
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
          )}
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Save as Image
          </Button>
        </motion.div>

        {/* Reminder */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="p-4 bg-muted/30 rounded-xl text-center"
        >
          <Zap className="h-5 w-5 mx-auto text-amber-500 mb-2" />
          <p className="text-sm text-muted-foreground">
            Pro tip: Set a reminder to revisit this commitment in 30 days.
            <br />
            Reflection without action fades quickly.
          </p>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <div className={cn('space-y-8', className)}>
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold mb-2">Transfer to Real Life</h2>
        <p className="text-lg text-muted-foreground">
          Connect what you learned to your actual work
        </p>
      </div>

      {/* Progress */}
      <ProgressDots
        currentStep={step}
        totalSteps={steps.length}
        stepLabels={steps.map((s) => s.title)}
      />

      {/* Step Header */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          className="text-center"
        >
          <div className={cn('inline-flex items-center gap-2 mb-2', steps[step].color)}>
            {steps[step].icon}
            <span className="text-xl font-bold">{steps[step].title}</span>
          </div>
          <p className="text-muted-foreground">{steps[step].subtitle}</p>
        </motion.div>
      </AnimatePresence>

      {/* Step Content */}
      <div className="p-6 bg-muted/30 rounded-xl border min-h-[350px]">
        <AnimatePresence mode="wait">
          {/* Step 1: Real Situation */}
          {step === 0 && (
            <motion.div
              key="step-0"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="space-y-3">
                <label className="text-sm font-semibold">
                  Describe a situation from your work or life where you faced similar pressure:
                </label>
                <Textarea
                  value={formData.realSituation || ''}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, realSituation: e.target.value }))
                  }
                  placeholder="e.g., When my team was under deadline pressure and quality was being compromised..."
                  className="min-h-[120px] text-base"
                />
              </div>

              <div className="space-y-3">
                <label className="text-sm font-semibold">
                  What was the specific pressure you felt?
                </label>
                <Textarea
                  value={formData.pressureDescription || ''}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, pressureDescription: e.target.value }))
                  }
                  placeholder="e.g., The pressure to deliver on time even if it meant cutting corners..."
                  className="min-h-[100px] text-base"
                />
              </div>
            </motion.div>
          )}

          {/* Step 2: Values at Stake */}
          {step === 1 && (
            <motion.div
              key="step-1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="space-y-4">
                <label className="text-sm font-semibold">
                  Select the values that were tested in your real situation:
                </label>
                <ValueSelector
                  values={teamValues}
                  selected={formData.valuesTested || []}
                  onToggle={toggleValue}
                />
              </div>

              <div className="space-y-3">
                <label className="text-sm font-semibold">
                  What did you do in that situation? (optional)
                </label>
                <Textarea
                  value={formData.whatYouDid || ''}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, whatYouDid: e.target.value }))
                  }
                  placeholder="Describe what you actually did..."
                  className="min-h-[80px]"
                />
              </div>

              <div className="space-y-3">
                <label className="text-sm font-semibold">
                  What might you do differently now? (optional)
                </label>
                <Textarea
                  value={formData.whatYouWouldDoDifferently || ''}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, whatYouWouldDoDifferently: e.target.value }))
                  }
                  placeholder="After this experience, what would you change?"
                  className="min-h-[80px]"
                />
              </div>
            </motion.div>
          )}

          {/* Step 3: Personal Commitment */}
          {step === 2 && (
            <motion.div
              key="step-2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="p-6 bg-background rounded-xl border-2 border-dashed border-primary/30">
                <p className="text-sm text-muted-foreground mb-6 text-center">
                  Complete your commitment statement:
                </p>
                <div className="space-y-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-lg">&ldquo;The next time I feel</span>
                    <input
                      type="text"
                      value={formData.personalCommitment?.pressure || ''}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          personalCommitment: {
                            ...prev.personalCommitment!,
                            pressure: e.target.value,
                          },
                        }))
                      }
                      placeholder="[pressure/situation]"
                      className="flex-1 min-w-[200px] px-4 py-2 rounded-lg border-2 border-amber-500/50 bg-amber-500/5 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all"
                    />
                    <span className="font-semibold text-lg">,</span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-lg">I will</span>
                    <input
                      type="text"
                      value={formData.personalCommitment?.action || ''}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          personalCommitment: {
                            ...prev.personalCommitment!,
                            action: e.target.value,
                          },
                        }))
                      }
                      placeholder="[specific action]"
                      className="flex-1 min-w-[200px] px-4 py-2 rounded-lg border-2 border-green-500/50 bg-green-500/5 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 outline-none transition-all"
                    />
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-lg">to stay aligned with</span>
                    <select
                      value={formData.personalCommitment?.value || ''}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          personalCommitment: {
                            ...prev.personalCommitment!,
                            value: e.target.value,
                          },
                        }))
                      }
                      className="flex-1 min-w-[150px] px-4 py-2 rounded-lg border-2 border-primary/50 bg-primary/5 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    >
                      <option value="">Select a value...</option>
                      {teamValues.map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                    <span className="font-semibold text-lg">.&rdquo;</span>
                  </div>
                </div>
              </div>

              {/* Live Preview */}
              <AnimatePresence>
                {formData.personalCommitment?.pressure &&
                  formData.personalCommitment?.action &&
                  formData.personalCommitment?.value && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                    >
                      <CommitmentCard
                        commitment={formData.personalCommitment}
                        participantName={participantName}
                        teamName={teamName}
                        isAnimated={false}
                      />
                    </motion.div>
                  )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => goToStep(Math.max(0, step - 1))}
          disabled={step === 0}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        {step < steps.length - 1 ? (
          <Button
            onClick={() => goToStep(step + 1)}
            disabled={
              (step === 0 && !formData.realSituation) ||
              (step === 1 && (!formData.valuesTested || formData.valuesTested.length === 0))
            }
          >
            Continue
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={
              !formData.personalCommitment?.pressure ||
              !formData.personalCommitment?.action ||
              !formData.personalCommitment?.value
            }
            className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Seal My Commitment
          </Button>
        )}
      </div>
    </div>
  );
}

export default TransferReflection;
