/**
 * PersonaVoice Service
 *
 * Validates AI-generated content against persona "fences" to ensure
 * characters speak in authentic, constrained voices.
 *
 * Validates:
 * - Vocabulary matches speaking style
 * - Content doesn't reference things persona doesn't know
 * - Content doesn't use forbidden phrases
 * - Tone aligns with character
 */

import type { PersonaVoiceValidation, PersonaId, PersonaTone, PersonaVocabulary } from '@crucible/shared';
import { PERSONAS } from '@crucible/shared';

// ============================================================================
// TYPES
// ============================================================================

interface ValidationResult {
  valid: boolean;
  violations: Array<{
    type: 'vocabulary' | 'knowledge' | 'neverSays' | 'tone';
    detail: string;
    severity: 'warning' | 'error';
  }>;
  suggestions: string[];
}

// ============================================================================
// VALIDATION PATTERNS
// ============================================================================

// Words/phrases that suggest wrong tone for each PersonaTone
const TONE_VIOLATIONS: Record<PersonaTone, string[]> = {
  urgent: [
    'whenever you get a chance', 'no rush', 'take your time', 'eventually',
    'might consider', 'perhaps later',
  ],
  measured: [
    'absolutely', 'definitely', 'obviously', 'clearly', 'undoubtedly',
    'without question', 'guaranteed', 'for sure', 'RIGHT NOW',
  ],
  defensive: [
    'I completely agree', 'you are absolutely right', 'no concerns here',
    'everything is fine', 'we have no issues',
  ],
  authoritative: [
    'I think maybe', 'perhaps', 'sort of', 'kind of', 'I suppose', 'possibly',
    'it could be', 'one might argue', 'I guess',
  ],
  pleading: [
    'I demand', 'you must', 'there is no choice', 'end of discussion',
    'this is final', 'non-negotiable',
  ],
};

// Vocabulary style violations
const VOCABULARY_VIOLATIONS: Record<PersonaVocabulary, string[]> = {
  technical: [
    'like', 'kinda', 'gonna', 'wanna', 'sorta', 'totally', 'basically',
    'you know', 'I mean', 'whatever', 'stuff', 'thingy',
  ],
  'working-class': [
    'pursuant to', 'heretofore', 'notwithstanding', 'whereby', 'therein',
    'per se', 'vis-a-vis', 'paradigm', 'synergy', 'optimize', 'leverage',
  ],
  executive: [
    'gonna', 'wanna', 'ain\'t', 'y\'all', 'dude', 'bro', 'whatever',
  ],
  political: [
    'ain\'t', 'y\'all', 'dude', 'bro', 'gonna', 'wanna',
  ],
  maritime: [
    'pursuant to', 'heretofore', 'paradigm', 'synergy', 'leverage',
    'stakeholder alignment', 'value proposition',
  ],
};

// Corporate jargon that breaks immersion for most characters
const CORPORATE_JARGON = [
  'synergy', 'leverage', 'circle back', 'take offline', 'move the needle',
  'low-hanging fruit', 'bandwidth', 'drill down', 'deep dive', 'pivot',
  'value-add', 'best practices', 'mission-critical', 'scalable solution',
];

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Check if content uses vocabulary appropriate for the persona
 */
function validateVocabulary(
  content: string,
  personaId: PersonaId
): ValidationResult['violations'] {
  const persona = PERSONAS[personaId];
  if (!persona) return [];

  const violations: ValidationResult['violations'] = [];
  const lowerContent = content.toLowerCase();

  // Check vocabulary-specific violations
  const vocabStyle = persona.speakingStyle.vocabulary;
  const forbiddenForVocab = VOCABULARY_VIOLATIONS[vocabStyle] || [];

  for (const phrase of forbiddenForVocab) {
    if (lowerContent.includes(phrase.toLowerCase())) {
      violations.push({
        type: 'vocabulary',
        detail: `Phrase "${phrase}" doesn't match ${persona.name}'s ${vocabStyle} vocabulary`,
        severity: 'warning',
      });
    }
  }

  // Check for corporate jargon (breaks immersion for most characters)
  if (vocabStyle !== 'executive') {
    for (const jargon of CORPORATE_JARGON) {
      if (lowerContent.includes(jargon.toLowerCase())) {
        violations.push({
          type: 'vocabulary',
          detail: `Corporate jargon "${jargon}" doesn't fit ${persona.name}'s voice`,
          severity: 'warning',
        });
      }
    }
  }

  return violations;
}

/**
 * Check if content references things the persona shouldn't know
 */
function validateKnowledge(
  content: string,
  personaId: PersonaId
): ValidationResult['violations'] {
  const persona = PERSONAS[personaId];
  if (!persona) return [];

  const violations: ValidationResult['violations'] = [];
  const lowerContent = content.toLowerCase();

  // Check for references to things persona doesn't know
  for (const unknownTopic of persona.doesNotKnow) {
    // Create flexible pattern for the topic
    const topicWords = unknownTopic.toLowerCase().split(' ');
    const hasTopicReference = topicWords.some((word) => {
      // Skip common words
      if (['the', 'a', 'an', 'of', 'to', 'in', 'for'].includes(word)) return false;
      return lowerContent.includes(word);
    });

    if (hasTopicReference) {
      violations.push({
        type: 'knowledge',
        detail: `${persona.name} doesn't know about "${unknownTopic}"`,
        severity: 'error',
      });
    }
  }

  return violations;
}

/**
 * Check if content uses forbidden phrases
 */
function validateNeverSays(
  content: string,
  personaId: PersonaId
): ValidationResult['violations'] {
  const persona = PERSONAS[personaId];
  if (!persona) return [];

  const violations: ValidationResult['violations'] = [];
  const lowerContent = content.toLowerCase();

  for (const forbidden of persona.neverSays) {
    // Check for exact matches or close variations
    const forbiddenLower = forbidden.toLowerCase();
    if (lowerContent.includes(forbiddenLower)) {
      violations.push({
        type: 'neverSays',
        detail: `${persona.name} would never say "${forbidden}"`,
        severity: 'error',
      });
    }
  }

  return violations;
}

/**
 * Check overall tone alignment
 */
function validateTone(
  content: string,
  personaId: PersonaId
): ValidationResult['violations'] {
  const persona = PERSONAS[personaId];
  if (!persona) return [];

  const violations: ValidationResult['violations'] = [];
  const toneStyle = persona.speakingStyle.tone;

  // Check tone-specific violations
  const forbiddenForTone = TONE_VIOLATIONS[toneStyle] || [];
  const lowerContent = content.toLowerCase();

  for (const phrase of forbiddenForTone) {
    if (lowerContent.includes(phrase.toLowerCase())) {
      violations.push({
        type: 'tone',
        detail: `Phrase "${phrase}" doesn't match ${persona.name}'s ${toneStyle} tone`,
        severity: 'warning',
      });
    }
  }

  // Simple heuristics for tone
  const exclamationCount = (content.match(/!/g) || []).length;
  const wordCount = content.split(/\s+/).length;

  // Measured personas shouldn't be overly exclamatory
  if (toneStyle === 'measured' && exclamationCount > 1) {
    violations.push({
      type: 'tone',
      detail: `Too many exclamation marks for ${persona.name}'s measured tone`,
      severity: 'warning',
    });
  }

  // Authoritative personas shouldn't be overly hedging
  if (toneStyle === 'authoritative') {
    const hedges = ['might', 'could', 'perhaps', 'maybe', 'possibly'];
    const hedgeCount = hedges.filter((h) =>
      content.toLowerCase().includes(h)
    ).length;
    if (hedgeCount > 2) {
      violations.push({
        type: 'tone',
        detail: `Too much hedging for ${persona.name}'s authoritative style`,
        severity: 'warning',
      });
    }
  }

  // Pleading tone should have some emotional language
  if (toneStyle === 'pleading' && wordCount > 20) {
    const emotionalWords = ['please', 'need', 'help', 'family', 'children', 'worried'];
    const hasEmotional = emotionalWords.some((w) => lowerContent.includes(w));
    if (!hasEmotional) {
      violations.push({
        type: 'tone',
        detail: `Missing emotional language for ${persona.name}'s pleading style`,
        severity: 'warning',
      });
    }
  }

  return violations;
}

// ============================================================================
// MAIN SERVICE
// ============================================================================

export class PersonaVoice {
  /**
   * Validate content against persona fences
   */
  static validate(
    content: string,
    personaId: PersonaId
  ): PersonaVoiceValidation {
    const allViolations: PersonaVoiceValidation['violations'] = [];

    // Run all validations
    const vocabViolations = validateVocabulary(content, personaId);
    const knowledgeViolations = validateKnowledge(content, personaId);
    const neverSaysViolations = validateNeverSays(content, personaId);
    const toneViolations = validateTone(content, personaId);

    // Collect all violations
    for (const v of [...vocabViolations, ...knowledgeViolations, ...neverSaysViolations, ...toneViolations]) {
      allViolations.push({
        type: v.type,
        detail: v.detail,
      });
    }

    // Valid only if no errors (warnings are okay)
    const hasErrors = [...vocabViolations, ...knowledgeViolations, ...neverSaysViolations, ...toneViolations]
      .some((v) => v.severity === 'error');

    return {
      valid: !hasErrors,
      violations: allViolations,
    };
  }

  /**
   * Get suggestions for improving content to match persona voice
   */
  static getSuggestions(
    content: string,
    personaId: PersonaId
  ): string[] {
    const persona = PERSONAS[personaId];
    if (!persona) return [];

    const suggestions: string[] = [];
    const validation = PersonaVoice.validate(content, personaId);

    if (!validation.valid) {
      // Add persona-specific suggestions
      suggestions.push(
        `Remember ${persona.name}'s key phrase: "${persona.signatureLine}"`
      );
      suggestions.push(
        `Their primary motivation is: ${persona.primaryValue}`
      );
      suggestions.push(
        `Their speaking style is ${persona.speakingStyle.vocabulary} vocabulary with ${persona.speakingStyle.tone} tone`
      );

      // Specific suggestions based on violations
      for (const v of validation.violations) {
        if (v.type === 'knowledge') {
          suggestions.push(`Remove references to information ${persona.name} wouldn't have`);
        }
        if (v.type === 'neverSays') {
          suggestions.push(`Reword to avoid forbidden phrases`);
        }
        if (v.type === 'tone') {
          suggestions.push(`Adjust tone to be more ${persona.speakingStyle.tone}`);
        }
      }
    }

    return suggestions;
  }

  /**
   * Build a persona constraint prompt for AI generation
   */
  static buildConstraintPrompt(personaId: PersonaId): string {
    const persona = PERSONAS[personaId];
    if (!persona) return '';

    return `CHARACTER: ${persona.name} - ${persona.title}
PARISH: ${persona.parishId}
BACKGROUND: ${persona.background}

VOICE CONSTRAINTS:
- Vocabulary: ${persona.speakingStyle.vocabulary}
- Tone: ${persona.speakingStyle.tone}

YOU KNOW: ${persona.knows.join('; ')}
YOU DO NOT KNOW: ${persona.doesNotKnow.join('; ')}
NEVER SAY: ${persona.neverSays.join('; ')}

PRIMARY MOTIVATION: ${persona.primaryValue}
CORE TENSION: ${persona.valueTension}

EXAMPLE DIALOGUE: "${persona.signatureLine}"`;
  }

  /**
   * Check if a persona is appropriate for a given situation
   */
  static isPersonaAppropriate(
    personaId: PersonaId,
    parishId: string,
    topics: string[]
  ): boolean {
    const persona = PERSONAS[personaId];
    if (!persona) return false;

    // Check parish alignment (persona should know about this parish)
    if (persona.parishId !== parishId && !persona.knows.some((k) =>
      k.toLowerCase().includes(parishId.toLowerCase())
    )) {
      return false;
    }

    // Check if persona knows about the topics
    const lowerTopics = topics.map((t) => t.toLowerCase());
    const knownTopics = persona.knows.map((k) => k.toLowerCase());

    const hasRelevantKnowledge = lowerTopics.some((topic) =>
      knownTopics.some((known) =>
        known.includes(topic) || topic.includes(known)
      )
    );

    return hasRelevantKnowledge;
  }

  /**
   * Get the best persona for a given situation
   */
  static getBestPersona(
    parishId: string,
    topics: string[],
    excludeIds: PersonaId[] = []
  ): PersonaId | null {
    const candidates = Object.entries(PERSONAS)
      .filter(([id]) => !excludeIds.includes(id as PersonaId))
      .filter(([id]) => PersonaVoice.isPersonaAppropriate(id as PersonaId, parishId, topics));

    if (candidates.length === 0) {
      // Fall back to parish leader
      const parishPersona = Object.entries(PERSONAS).find(
        ([, p]) => p.parishId === parishId
      );
      return parishPersona ? (parishPersona[0] as PersonaId) : null;
    }

    // Return first matching candidate (could add scoring logic)
    return candidates[0][0] as PersonaId;
  }
}

export default PersonaVoice;
