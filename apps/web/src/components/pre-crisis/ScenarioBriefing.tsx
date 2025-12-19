'use client';

/**
 * ScenarioBriefing Component
 *
 * The final pre-crisis phase that introduces:
 * 1. Meridian BioSciences and Celarithin context
 * 2. Concordia Island geography
 * 3. Emotional anchor (Jennifer M. letter)
 * 4. Parish assignment
 * 5. Final reminder
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { ParishIdLower } from '@crucible/shared';
import { PARISHES } from '@crucible/shared';
import {
  Building2,
  Pill,
  MapPin,
  Heart,
  AlertTriangle,
  Users,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

// ============================================================================
// CONSTANTS
// ============================================================================

const PATIENT_LETTER = `Dear Meridian Team,

My daughter got eighteen more months because of you. Eighteen months to see her son start kindergarten. To finish the book she was writing. To say the things that needed to be said.

I know you probably do not see us. We are just numbers on a shipping manifest. But we see you. Every dose that arrives is someone's extra day.

When I think of the people in your facilities, working through the night to get those shipments out, I want you to know: we know. We are grateful beyond words.

Whatever decisions you face in the days ahead, please remember us. We are counting on you.

— Jennifer M., Ohio`;

// ============================================================================
// COMPONENT
// ============================================================================

export interface ScenarioBriefingProps {
  assignedParish: ParishIdLower;
  teamName: string;
  onReady: () => void;
}

export function ScenarioBriefing({
  assignedParish,
  teamName,
  onReady,
}: ScenarioBriefingProps) {
  const [step, setStep] = useState<'stakes' | 'anchor' | 'parish' | 'ready'>('stakes');

  // Get parish info
  const parishKey = Object.keys(PARISHES).find(
    (k) => PARISHES[k as keyof typeof PARISHES].id === assignedParish
  ) as keyof typeof PARISHES | undefined;
  const parish = parishKey ? PARISHES[parishKey] : null;

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <AnimatePresence mode="wait">
        {/* Step 1: The Stakes */}
        {step === 'stakes' && (
          <motion.div
            key="stakes"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="max-w-2xl w-full space-y-6"
          >
            <div className="text-center space-y-2">
              <Building2 className="h-12 w-12 mx-auto text-primary" />
              <h1 className="text-3xl font-bold">Meridian BioSciences</h1>
              <p className="text-muted-foreground">Welcome to Concordia Island</p>
            </div>

            <div className="space-y-4">
              {/* Company Context */}
              <div className="p-4 bg-muted/30 rounded-lg space-y-3">
                <div className="flex items-start gap-3">
                  <Pill className="h-5 w-5 text-primary mt-1" />
                  <div>
                    <div className="font-semibold">Celarithin</div>
                    <p className="text-sm text-muted-foreground">
                      A breakthrough cancer medication. Meridian is the sole manufacturer
                      worldwide. Production cannot be paused or moved—the specialized clean
                      rooms on Concordia are the only place it can be made.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Users className="h-5 w-5 text-primary mt-1" />
                  <div>
                    <div className="font-semibold">340,000 Patients</div>
                    <p className="text-sm text-muted-foreground">
                      Depend on regular shipments of Celarithin. A two-week supply
                      disruption would be life-threatening for thousands.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-primary mt-1" />
                  <div>
                    <div className="font-semibold">Concordia Island</div>
                    <p className="text-sm text-muted-foreground">
                      Population 24,100. Six parishes interconnected by supply chains,
                      infrastructure, and shared responsibility. What happens in one
                      parish affects them all.
                    </p>
                  </div>
                </div>
              </div>

              {/* Hurricane Warning */}
              <div className="p-4 bg-yellow-500/20 border border-yellow-500/40 rounded-lg">
                <div className="flex items-center gap-2 text-yellow-500 font-semibold mb-2">
                  <AlertTriangle className="h-5 w-5" />
                  Hurricane Midas
                </div>
                <p className="text-sm">
                  A Category 4 hurricane is forming in the Atlantic. Models show a 40%
                  chance it will directly impact Concordia within 72 hours. Your team will
                  be responsible for decisions that affect both production and lives.
                </p>
              </div>
            </div>

            <Button onClick={() => setStep('anchor')} className="w-full" size="lg">
              Continue
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </motion.div>
        )}

        {/* Step 2: Emotional Anchor */}
        {step === 'anchor' && (
          <motion.div
            key="anchor"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="max-w-xl w-full space-y-6"
          >
            <div className="text-center">
              <Heart className="h-12 w-12 mx-auto text-red-400 mb-4" />
              <h2 className="text-xl font-medium text-muted-foreground">
                A letter we received last month
              </h2>
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="p-8 bg-gradient-to-b from-muted/50 to-muted/20 rounded-xl border"
            >
              <p className="whitespace-pre-line text-lg leading-relaxed font-serif italic">
                {PATIENT_LETTER}
              </p>
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2 }}
              className="text-center text-sm text-muted-foreground"
            >
              The decisions you make in this simulation affect people like Jennifer and
              her daughter.
            </motion.p>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2.5 }}
            >
              <Button onClick={() => setStep('parish')} className="w-full" size="lg">
                Continue
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </motion.div>
          </motion.div>
        )}

        {/* Step 3: Parish Assignment */}
        {step === 'parish' && parish && (
          <motion.div
            key="parish"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="max-w-2xl w-full space-y-6"
          >
            <div className="text-center space-y-2">
              <MapPin className="h-12 w-12 mx-auto text-primary" />
              <h1 className="text-3xl font-bold">Your Assignment</h1>
              <p className="text-muted-foreground">Team {teamName}</p>
            </div>

            {/* Parish Card */}
            <div className="p-6 bg-primary/10 border border-primary/30 rounded-xl space-y-4">
              <div className="text-center">
                <div className="text-sm text-primary uppercase tracking-wide">Parish</div>
                <div className="text-4xl font-bold">{parish.name}</div>
                <div className="text-muted-foreground">{parish.description}</div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-primary/20">
                <div>
                  <div className="text-sm text-muted-foreground">Population</div>
                  <div className="text-xl font-semibold">
                    {parish.population.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Meridian Employees</div>
                  <div className="text-xl font-semibold">{parish.meridianPercent}%</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Supply Chain Role</div>
                  <div className="text-xl font-semibold capitalize">
                    {parish.supplyChainRole}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Key Assets</div>
                  <div className="text-sm">
                    {parish.keyAssets.slice(0, 2).map((a) => a.name).join(', ')}
                  </div>
                </div>
              </div>

              {/* Character */}
              <div className="pt-4 border-t border-primary/20">
                <div className="text-sm font-medium mb-2">The People Here</div>
                <p className="text-sm text-muted-foreground">
                  {parish.classCharacter.whoLivesHere}
                </p>
                <div className="grid grid-cols-2 gap-3 mt-3 text-sm">
                  <div className="p-2 bg-red-500/10 rounded">
                    <div className="text-red-400 text-xs">They fear</div>
                    <div>{parish.classCharacter.whatTheyFear}</div>
                  </div>
                  <div className="p-2 bg-green-500/10 rounded">
                    <div className="text-green-400 text-xs">They want</div>
                    <div>{parish.classCharacter.whatTheyWant}</div>
                  </div>
                </div>
              </div>

              {/* Vulnerabilities */}
              <div className="pt-4 border-t border-primary/20">
                <div className="text-sm font-medium mb-2 flex items-center gap-1">
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  Key Vulnerabilities
                </div>
                <div className="flex flex-wrap gap-2">
                  {parish.vulnerabilities.map((v) => (
                    <span
                      key={v}
                      className="px-2 py-1 bg-yellow-500/10 text-yellow-500 text-xs rounded"
                    >
                      {v}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <Button onClick={() => setStep('ready')} className="w-full" size="lg">
              I Understand My Assignment
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </motion.div>
        )}

        {/* Step 4: Final Reminder */}
        {step === 'ready' && (
          <motion.div
            key="ready"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-lg w-full text-center space-y-8"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.2 }}
              className="w-20 h-20 mx-auto rounded-full bg-primary/20 flex items-center justify-center"
            >
              <Sparkles className="h-10 w-10 text-primary" />
            </motion.div>

            <div className="space-y-4">
              <h1 className="text-3xl font-bold">You Are Ready</h1>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="p-6 bg-gradient-to-b from-muted/50 to-transparent rounded-xl"
              >
                <p className="text-xl leading-relaxed">
                  You have your values.
                  <br />
                  You have your commitment.
                  <br />
                  <span className="text-primary font-semibold">
                    Now you will practice living them when it gets hard.
                  </span>
                </p>
              </motion.div>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="text-sm text-muted-foreground"
              >
                The simulation will begin when the Crucible Master starts the session.
                <br />
                There will be no reminders of your values during the crisis.
                <br />
                <span className="italic">That is the practice.</span>
              </motion.p>
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5 }}
            >
              <Button onClick={onReady} size="lg" className="px-12">
                Enter the Simulation
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
