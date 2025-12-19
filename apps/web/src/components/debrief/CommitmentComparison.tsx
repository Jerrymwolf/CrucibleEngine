'use client';

/**
 * CommitmentComparison Component
 *
 * Side-by-side comparison of the team's pre-crisis commitment
 * with their actual decision-making during the storm.
 *
 * This creates a powerful "mirror moment" by showing:
 * - The exact words they committed to
 * - How those words translated (or didn't) into action
 * - Specific examples from the simulation
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useSound } from '@/hooks/useSound';
import {
  FileText,
  Activity,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronDown,
  Quote,
  ArrowRight,
  Sparkles,
  Shield,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

// ============================================================================
// TYPES
// ============================================================================

export interface CommitmentClause {
  id: string;
  text: string;
  valueReferenced?: string;
  fulfillmentStatus: 'fulfilled' | 'partial' | 'unfulfilled';
  fulfillmentScore: number; // 0-100
  supportingDecisions: CommitmentEvidence[];
  contradictingDecisions: CommitmentEvidence[];
  reflectionNote?: string;
}

export interface CommitmentEvidence {
  id: string;
  timestamp: number;
  decision: string;
  howItRelates: string;
}

export interface CommitmentComparisonProps {
  teamName: string;
  fullCommitmentText: string;
  signatureCount: number;
  signatureDate: string;
  clauses: CommitmentClause[];
  overallFulfillment: number; // 0-100
  onComplete?: () => void;
  className?: string;
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function CommitmentDocument({
  text,
  teamName,
  signatureCount,
  signatureDate,
}: {
  text: string;
  teamName: string;
  signatureCount: number;
  signatureDate: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative"
    >
      {/* Document styling */}
      <div className="bg-gradient-to-b from-amber-50 to-amber-100 dark:from-amber-950/30 dark:to-amber-900/20 rounded-xl p-8 border-2 border-amber-200 dark:border-amber-800 shadow-lg">
        {/* Wax seal decoration */}
        <div className="absolute -top-4 -right-4 w-12 h-12 bg-red-700 rounded-full flex items-center justify-center shadow-lg">
          <Shield className="h-6 w-6 text-amber-200" />
        </div>

        {/* Header */}
        <div className="text-center mb-6">
          <h3 className="text-lg font-serif text-amber-800 dark:text-amber-200 mb-1">
            Team Commitment
          </h3>
          <p className="text-sm text-amber-600 dark:text-amber-400">
            {teamName}
          </p>
        </div>

        {/* Commitment Text */}
        <div className="prose prose-amber dark:prose-invert max-w-none">
          <p className="text-amber-900 dark:text-amber-100 leading-relaxed italic font-serif">
            &ldquo;{text}&rdquo;
          </p>
        </div>

        {/* Signatures */}
        <div className="mt-8 pt-4 border-t border-amber-300 dark:border-amber-700">
          <div className="flex items-center justify-between text-sm text-amber-700 dark:text-amber-300">
            <span>Signed by {signatureCount} team members</span>
            <span>{signatureDate}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function FulfillmentBadge({
  status,
  score,
}: {
  status: CommitmentClause['fulfillmentStatus'];
  score: number;
}) {
  const config = {
    fulfilled: {
      icon: CheckCircle2,
      color: 'text-green-500',
      bg: 'bg-green-500/10',
      label: 'Fulfilled',
    },
    partial: {
      icon: AlertTriangle,
      color: 'text-amber-500',
      bg: 'bg-amber-500/10',
      label: 'Partially Fulfilled',
    },
    unfulfilled: {
      icon: XCircle,
      color: 'text-red-500',
      bg: 'bg-red-500/10',
      label: 'Not Fulfilled',
    },
  };

  const { icon: Icon, color, bg, label } = config[status];

  return (
    <div className={cn('inline-flex items-center gap-2 px-3 py-1.5 rounded-full', bg)}>
      <Icon className={cn('h-4 w-4', color)} />
      <span className={cn('text-sm font-medium', color)}>{label}</span>
      <span className={cn('text-xs font-bold ml-1', color)}>{score}%</span>
    </div>
  );
}

function ClauseCard({
  clause,
  index,
  isExpanded,
  onToggle,
}: {
  clause: CommitmentClause;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const { play: playSound } = useSound();

  const handleToggle = () => {
    onToggle();
    playSound('ui', 'click');
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.15 }}
      className={cn(
        'border rounded-xl overflow-hidden transition-colors',
        clause.fulfillmentStatus === 'fulfilled'
          ? 'border-green-500/30 bg-green-500/5'
          : clause.fulfillmentStatus === 'partial'
            ? 'border-amber-500/30 bg-amber-500/5'
            : 'border-red-500/30 bg-red-500/5'
      )}
    >
      {/* Header */}
      <button
        type="button"
        onClick={handleToggle}
        className="w-full p-4 text-left"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold">
                {index + 1}
              </span>
              {clause.valueReferenced && (
                <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded">
                  {clause.valueReferenced}
                </span>
              )}
            </div>
            <p className="font-medium leading-relaxed">
              &ldquo;{clause.text}&rdquo;
            </p>
          </div>
          <div className="shrink-0 flex flex-col items-end gap-2">
            <FulfillmentBadge status={clause.fulfillmentStatus} score={clause.fulfillmentScore} />
            <ChevronDown
              className={cn(
                'h-5 w-5 transition-transform text-muted-foreground',
                isExpanded && 'rotate-180'
              )}
            />
          </div>
        </div>
      </button>

      {/* Expanded Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="px-4 pb-4 space-y-4 border-t pt-4">
              {/* Supporting Decisions */}
              {clause.supportingDecisions.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="font-semibold">
                      Supporting Decisions ({clause.supportingDecisions.length})
                    </span>
                  </div>
                  <div className="space-y-2 ml-6">
                    {clause.supportingDecisions.map((ev) => (
                      <div
                        key={ev.id}
                        className="p-3 bg-green-500/10 rounded-lg border-l-2 border-green-500"
                      >
                        <p className="text-sm font-medium">{ev.decision}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {ev.howItRelates}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Contradicting Decisions */}
              {clause.contradictingDecisions.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                    <XCircle className="h-4 w-4" />
                    <span className="font-semibold">
                      Contradicting Decisions ({clause.contradictingDecisions.length})
                    </span>
                  </div>
                  <div className="space-y-2 ml-6">
                    {clause.contradictingDecisions.map((ev) => (
                      <div
                        key={ev.id}
                        className="p-3 bg-red-500/10 rounded-lg border-l-2 border-red-500"
                      >
                        <p className="text-sm font-medium">{ev.decision}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {ev.howItRelates}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Reflection Note */}
              {clause.reflectionNote && (
                <div className="p-4 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <Sparkles className="h-4 w-4" />
                    <span className="font-semibold">Reflection</span>
                  </div>
                  <p className="text-sm italic">{clause.reflectionNote}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function OverallScore({ score }: { score: number }) {
  const getScoreColor = () => {
    if (score >= 75) return 'text-green-500';
    if (score >= 50) return 'text-amber-500';
    return 'text-red-500';
  };

  const getScoreLabel = () => {
    if (score >= 75) return 'Strong Alignment';
    if (score >= 50) return 'Mixed Results';
    return 'Significant Gap';
  };

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.5, type: 'spring' }}
      className="text-center p-8 bg-muted/30 rounded-xl"
    >
      <div className="text-sm text-muted-foreground uppercase tracking-wide mb-2">
        Overall Commitment Fulfillment
      </div>
      <div className={cn('text-6xl font-bold mb-2', getScoreColor())}>
        {score}%
      </div>
      <div className={cn('text-lg font-medium', getScoreColor())}>
        {getScoreLabel()}
      </div>
    </motion.div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function CommitmentComparison({
  teamName,
  fullCommitmentText,
  signatureCount,
  signatureDate,
  clauses,
  overallFulfillment,
  onComplete,
  className,
}: CommitmentComparisonProps) {
  const [expandedClause, setExpandedClause] = useState<string | null>(null);
  const [view, setView] = useState<'document' | 'analysis'>('document');
  const { play: playSound } = useSound();

  const handleViewChange = (newView: typeof view) => {
    setView(newView);
    playSound('ui', 'click');
  };

  const fulfilledCount = clauses.filter((c) => c.fulfillmentStatus === 'fulfilled').length;
  const partialCount = clauses.filter((c) => c.fulfillmentStatus === 'partial').length;
  const unfulfilledCount = clauses.filter((c) => c.fulfillmentStatus === 'unfulfilled').length;

  return (
    <div className={cn('space-y-8', className)}>
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold mb-2">The Commitment Mirror</h2>
        <p className="text-lg text-muted-foreground">
          Comparing your words with your actions
        </p>
      </div>

      {/* View Toggle */}
      <div className="flex justify-center">
        <div className="inline-flex bg-muted/30 rounded-lg p-1">
          <button
            type="button"
            onClick={() => handleViewChange('document')}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors',
              view === 'document'
                ? 'bg-background shadow text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <FileText className="h-4 w-4" />
            Your Commitment
          </button>
          <button
            type="button"
            onClick={() => handleViewChange('analysis')}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors',
              view === 'analysis'
                ? 'bg-background shadow text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Activity className="h-4 w-4" />
            Your Actions
          </button>
        </div>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {view === 'document' ? (
          <motion.div
            key="document"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="max-w-2xl mx-auto"
          >
            <CommitmentDocument
              text={fullCommitmentText}
              teamName={teamName}
              signatureCount={signatureCount}
              signatureDate={signatureDate}
            />

            <div className="mt-8 text-center">
              <p className="text-muted-foreground mb-4">
                You made this commitment before the storm. How did it hold up?
              </p>
              <Button onClick={() => handleViewChange('analysis')}>
                See the Analysis
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="analysis"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-8"
          >
            {/* Overall Score */}
            <OverallScore score={overallFulfillment} />

            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-green-500/10 rounded-lg text-center">
                <div className="text-2xl font-bold text-green-500">{fulfilledCount}</div>
                <div className="text-sm text-muted-foreground">Fulfilled</div>
              </div>
              <div className="p-4 bg-amber-500/10 rounded-lg text-center">
                <div className="text-2xl font-bold text-amber-500">{partialCount}</div>
                <div className="text-sm text-muted-foreground">Partial</div>
              </div>
              <div className="p-4 bg-red-500/10 rounded-lg text-center">
                <div className="text-2xl font-bold text-red-500">{unfulfilledCount}</div>
                <div className="text-sm text-muted-foreground">Not Fulfilled</div>
              </div>
            </div>

            {/* Clause Analysis */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Clause-by-Clause Analysis</h3>
              <div className="space-y-3">
                {clauses.map((clause, index) => (
                  <ClauseCard
                    key={clause.id}
                    clause={clause}
                    index={index}
                    isExpanded={expandedClause === clause.id}
                    onToggle={() =>
                      setExpandedClause(
                        expandedClause === clause.id ? null : clause.id
                      )
                    }
                  />
                ))}
              </div>
            </div>

            {/* Continue Button */}
            {onComplete && (
              <div className="text-center pt-4">
                <Button onClick={onComplete} size="lg">
                  Continue to Next Chapter
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default CommitmentComparison;
