/**
 * Streaming content types for the narrative feed
 */

export type StreamingContentType = 'news' | 'social' | 'radio' | 'weather' | 'official';

export interface StreamingContent {
  id: string;
  type: StreamingContentType;
  source: string; // @concordianews, citizen, NOAA, etc.
  content: string;
  urgency: 1 | 2 | 3 | 4 | 5;
  relatedParish?: string;
  timestamp: number;
  breaking: boolean;
}

export interface NarrativeAgentOutput {
  type: StreamingContentType;
  source: string;
  content: string;
  urgency: 1 | 2 | 3 | 4 | 5;
  relatedParish?: string;
  breaking: boolean;
}

/**
 * Crucible Master directive
 */
export interface CMDirective {
  id: string;
  type: string; // From CM_DIRECTIVE_TYPES
  content: string;
  targetTeams?: string[]; // Empty = all teams
  isBinding: boolean;
  timestamp: number;
}

export interface DirectivePayload {
  type: string;
  content: string;
  targetTeams?: string[];
}
