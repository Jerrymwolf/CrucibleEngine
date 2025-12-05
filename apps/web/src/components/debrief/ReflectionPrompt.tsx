'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Check, Loader2 } from 'lucide-react';

interface ReflectionPromptProps {
  teamId: string;
  participantName: string;
  onSubmit: (reflection: {
    content: string;
    visibility: 'private' | 'team' | 'facilitator';
    category: string;
  }) => void;
}

const REFLECTION_PROMPTS = [
  { id: 'values', prompt: 'How did your values guide your decisions under pressure?' },
  { id: 'tradeoffs', prompt: 'What was the hardest tradeoff you faced, and how did you resolve it?' },
  { id: 'surprise', prompt: 'What surprised you most about your own reactions?' },
  { id: 'growth', prompt: 'What would you do differently next time?' },
];

export function ReflectionPrompt({ onSubmit }: ReflectionPromptProps) {
  const [currentPrompt, setCurrentPrompt] = useState(0);
  const [reflection, setReflection] = useState('');
  const [visibility, setVisibility] = useState<'private' | 'team' | 'facilitator'>('facilitator');
  const [submitted, setSubmitted] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!reflection.trim()) return;

    setSubmitting(true);
    try {
      onSubmit({
        content: reflection,
        visibility,
        category: REFLECTION_PROMPTS[currentPrompt].id,
      });
      setSubmitted(prev => [...prev, REFLECTION_PROMPTS[currentPrompt].id]);
      setReflection('');
      if (currentPrompt < REFLECTION_PROMPTS.length - 1) {
        setCurrentPrompt(prev => prev + 1);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const prompt = REFLECTION_PROMPTS[currentPrompt];
  const isComplete = submitted.length === REFLECTION_PROMPTS.length;

  if (isComplete) {
    return (
      <div className="text-center py-8 space-y-4">
        <Check className="h-12 w-12 text-status-safe mx-auto" />
        <h3 className="font-semibold text-lg">Reflections Complete</h3>
        <p className="text-muted-foreground">
          Thank you for sharing your thoughts. Your reflections will inform the debrief discussion.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg">Reflection</h3>
        <span className="text-sm text-muted-foreground">
          {currentPrompt + 1} of {REFLECTION_PROMPTS.length}
        </span>
      </div>

      <div className="flex gap-1">
        {REFLECTION_PROMPTS.map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded ${
              submitted.includes(REFLECTION_PROMPTS[i].id)
                ? 'bg-status-safe'
                : i === currentPrompt
                ? 'bg-primary'
                : 'bg-muted'
            }`}
          />
        ))}
      </div>

      <p className="text-lg font-medium">{prompt.prompt}</p>

      <Textarea
        value={reflection}
        onChange={(e) => setReflection(e.target.value)}
        placeholder="Share your thoughts..."
        rows={5}
        className="resize-none"
      />

      <div className="flex items-center justify-between">
        <RadioGroup
          value={visibility}
          onValueChange={(v) => setVisibility(v as typeof visibility)}
          className="flex gap-4"
        >
          <div className="flex items-center gap-1">
            <RadioGroupItem value="private" id="private" />
            <Label htmlFor="private" className="text-xs">Private</Label>
          </div>
          <div className="flex items-center gap-1">
            <RadioGroupItem value="team" id="team" />
            <Label htmlFor="team" className="text-xs">Share with team</Label>
          </div>
          <div className="flex items-center gap-1">
            <RadioGroupItem value="facilitator" id="facilitator" />
            <Label htmlFor="facilitator" className="text-xs">Facilitator only</Label>
          </div>
        </RadioGroup>

        <Button
          onClick={handleSubmit}
          disabled={!reflection.trim() || submitting}
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : null}
          {currentPrompt < REFLECTION_PROMPTS.length - 1 ? 'Next' : 'Complete'}
        </Button>
      </div>
    </div>
  );
}
