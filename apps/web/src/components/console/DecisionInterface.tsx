'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { DECISION_CATEGORIES, PARISHES } from '@crucible/shared';
import type { DecisionPayload, ParishIdLower } from '@crucible/shared';
import {
  AlertTriangle,
  Users,
  Truck,
  Shield,
  Radio,
  HelpCircle,
  ChevronRight,
  Send,
  X,
} from 'lucide-react';

interface DecisionInterfaceProps {
  parishId: string;
  onSubmitDecision: (decision: DecisionPayload) => void;
  disabled?: boolean;
  className?: string;
}

const categoryIcons: Record<string, React.ReactNode> = {
  'resource-allocation': <Truck className="h-4 w-4" />,
  'inter-parish': <Users className="h-4 w-4" />,
  evacuation: <AlertTriangle className="h-4 w-4" />,
  infrastructure: <Shield className="h-4 w-4" />,
  communication: <Radio className="h-4 w-4" />,
  special: <HelpCircle className="h-4 w-4" />,
};

export function DecisionInterface({
  parishId,
  onSubmitDecision,
  disabled = false,
  className,
}: DecisionInterfaceProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedDecision, setSelectedDecision] = useState<string | null>(null);
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [targetParish, setTargetParish] = useState<string | null>(null);
  const [rationale, setRationale] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

  // Get the current category and decision objects
  const category = selectedCategory
    ? Object.values(DECISION_CATEGORIES).find((c) => c.id === selectedCategory)
    : null;

  const decision = category && selectedDecision
    ? category.decisions.find((d) => d.id === selectedDecision)
    : null;

  const requiresTarget = decision && 'requiresTarget' in decision && decision.requiresTarget;

  // Get other parishes for inter-parish decisions
  const otherParishes = Object.values(PARISHES).filter((p) => p.id !== parishId);

  // Reset selection when category changes
  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setSelectedDecision(null);
    setSelectedChoice(null);
    setTargetParish(null);
    setShowConfirm(false);
  };

  // Reset choice when decision changes
  const handleDecisionSelect = (decisionId: string) => {
    setSelectedDecision(decisionId);
    setSelectedChoice(null);
    setTargetParish(null);
    setShowConfirm(false);
  };

  // Handle choice selection
  const handleChoiceSelect = (choice: string) => {
    setSelectedChoice(choice);
    if (!requiresTarget) {
      setShowConfirm(true);
    }
  };

  // Handle target parish selection
  const handleTargetSelect = (targetId: string) => {
    setTargetParish(targetId);
    setShowConfirm(true);
  };

  // Submit the decision
  const handleSubmit = () => {
    if (!selectedCategory || !selectedDecision || !selectedChoice) return;

    const payload: DecisionPayload = {
      categoryId: selectedCategory,
      decisionTypeId: selectedDecision,
      choice: selectedChoice,
      rationale: rationale || undefined,
      targetParishId: (targetParish as ParishIdLower) || undefined,
    };

    onSubmitDecision(payload);

    // Reset state
    setSelectedCategory(null);
    setSelectedDecision(null);
    setSelectedChoice(null);
    setTargetParish(null);
    setRationale('');
    setShowConfirm(false);
  };

  // Cancel and reset
  const handleCancel = () => {
    setSelectedCategory(null);
    setSelectedDecision(null);
    setSelectedChoice(null);
    setTargetParish(null);
    setRationale('');
    setShowConfirm(false);
  };

  return (
    <div className={cn('panel', className)}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="panel-header mb-0">Make Decision</h2>
        {selectedCategory && (
          <Button variant="ghost" size="sm" onClick={handleCancel}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Confirmation Dialog */}
      {showConfirm && decision && selectedChoice && (
        <div className="space-y-4">
          <div className="p-4 bg-muted/50 rounded-lg">
            <h3 className="font-semibold mb-2">{decision.name}</h3>
            <p className="text-sm text-muted-foreground mb-2">{decision.prompt}</p>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Choice:</span>
                <span className="font-semibold text-primary capitalize">
                  {selectedChoice.replace(/-/g, ' ')}
                </span>
              </div>

              {targetParish && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Target:</span>
                  <span className="font-semibold capitalize">{targetParish}</span>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="text-sm text-muted-foreground block mb-2">
              Rationale (optional)
            </label>
            <textarea
              value={rationale}
              onChange={(e) => setRationale(e.target.value)}
              placeholder="Why are you making this decision?"
              className="w-full h-20 px-3 py-2 bg-background border border-input rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowConfirm(false)}
            >
              Back
            </Button>
            <Button
              className="flex-1"
              onClick={handleSubmit}
              disabled={disabled}
            >
              <Send className="h-4 w-4 mr-2" />
              Confirm Decision
            </Button>
          </div>
        </div>
      )}

      {/* Target Parish Selection */}
      {!showConfirm && requiresTarget && selectedChoice && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Select target parish:</p>
          <div className="grid grid-cols-2 gap-2">
            {otherParishes.map((parish) => (
              <Button
                key={parish.id}
                variant="outline"
                className="justify-start"
                onClick={() => handleTargetSelect(parish.id)}
              >
                {parish.name}
              </Button>
            ))}
          </div>
          <Button variant="ghost" size="sm" onClick={() => setSelectedChoice(null)}>
            Back to options
          </Button>
        </div>
      )}

      {/* Choice Selection */}
      {!showConfirm && !requiresTarget && decision && !selectedChoice && (
        <div className="space-y-3">
          <p className="text-sm font-medium">{decision.prompt}</p>
          <div className="space-y-2">
            {decision.options.map((option) => (
              <Button
                key={option}
                variant="outline"
                className="w-full justify-between text-left h-auto py-3"
                onClick={() => handleChoiceSelect(option)}
              >
                <span className="capitalize">{option.replace(/-/g, ' ')}</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            ))}
          </div>
          <Button variant="ghost" size="sm" onClick={() => setSelectedDecision(null)}>
            Back to decisions
          </Button>
        </div>
      )}

      {/* Choice Selection for target-required decisions */}
      {!showConfirm && requiresTarget && decision && !selectedChoice && (
        <div className="space-y-3">
          <p className="text-sm font-medium">{decision.prompt}</p>
          <div className="space-y-2">
            {decision.options.map((option) => (
              <Button
                key={option}
                variant="outline"
                className="w-full justify-between text-left h-auto py-3"
                onClick={() => handleChoiceSelect(option)}
              >
                <span className="capitalize">{option.replace(/-/g, ' ')}</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            ))}
          </div>
          <Button variant="ghost" size="sm" onClick={() => setSelectedDecision(null)}>
            Back to decisions
          </Button>
        </div>
      )}

      {/* Decision Type Selection */}
      {!showConfirm && category && !selectedDecision && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">{category.description}</p>
          <div className="space-y-2">
            {category.decisions.map((dec) => (
              <Button
                key={dec.id}
                variant="outline"
                className="w-full justify-between text-left h-auto py-3"
                onClick={() => handleDecisionSelect(dec.id)}
              >
                <div>
                  <div className="font-medium">{dec.name}</div>
                  <div className="text-xs text-muted-foreground">{dec.prompt}</div>
                </div>
                <ChevronRight className="h-4 w-4" />
              </Button>
            ))}
          </div>
          <Button variant="ghost" size="sm" onClick={() => setSelectedCategory(null)}>
            Back to categories
          </Button>
        </div>
      )}

      {/* Category Selection */}
      {!showConfirm && !selectedCategory && (
        <ScrollArea className="h-[300px]">
          <div className="space-y-2 pr-4">
            {Object.values(DECISION_CATEGORIES).map((cat) => (
              <Button
                key={cat.id}
                variant="outline"
                className="w-full justify-start gap-3 h-auto py-3"
                onClick={() => handleCategorySelect(cat.id)}
                disabled={disabled}
              >
                {categoryIcons[cat.id]}
                <div className="text-left">
                  <div className="font-medium">{cat.name}</div>
                  <div className="text-xs text-muted-foreground">{cat.description}</div>
                </div>
              </Button>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
