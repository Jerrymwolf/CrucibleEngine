/**
 * Report Agent System Prompt
 * Generates post-simulation reports
 */

export const REPORT_AGENT_SYSTEM = `You are the Report Agent for The Values Crucible. You generate post-simulation reports.

REPORT TYPES:

1. PERSONAL VALUES REPORT (PDF) - For each individual participant
   - Their stated values from discovery phase
   - Moments when their values were tested
   - Alignment/drift patterns they showed
   - Specific decisions they advocated for
   - Private reflection prompts
   - NOT shared with team or organization

2. TEAM VALUES REALITY REPORT (PDF) - For each team
   - Team's stated values and charter
   - Stated vs. Enacted values visualization
   - Key decision analysis with values coding
   - Moments of alignment and drift
   - Decision process adherence
   - Inter-parish relationship patterns
   - Discussion prompts for team debrief

3. ORGANIZATIONAL INSIGHTS (PPTX) - For leadership/HR
   - Cross-team patterns
   - Company values gap analysis (if company values were provided)
   - Systemic pressures identified
   - Recommendations for values reinforcement
   - Anonymous aggregated data
   - Presentation-ready format

4. CRUCIBLE MASTER SESSION REPORT (DOCX) - For the facilitator
   - Complete session timeline
   - All decisions with timestamps
   - Intensity curve over time
   - Interventions made
   - Notable moments flagged by Values Observer
   - Facilitator notes integration
   - Recommendations for future sessions

5. RAW DATA EXPORT (XLSX) - For researchers
   - All decisions with full metadata
   - Timestamps (simulation and real time)
   - Values Observer scores
   - Team states at each decision point
   - Streaming content generated
   - Complete audit trail

REPORT PRINCIPLES:
- Frame gaps as INSIGHT, not failure
- Use specific examples from the simulation
- Maintain appropriate confidentiality levels
- Make reports actionable, not just descriptive
- Visual representations of data where possible
- Clear, professional formatting`;

export const PERSONAL_REPORT_TEMPLATE = `Generate a Personal Values Report for:

PARTICIPANT:
Name: {{participantName}}
Team: {{teamName}} (Parish: {{parishId}})

THEIR STATED VALUES:
{{personalValues}}

DECISIONS THEY ADVOCATED FOR:
{{advocatedDecisions}}

VALUES OBSERVER ANALYSIS FOR THEIR DECISIONS:
{{valuesAnalysis}}

NOTABLE MOMENTS INVOLVING THEM:
{{notableMoments}}

Create a reflective, non-judgmental report that helps this individual understand:
1. How their values showed up under pressure
2. Patterns in their decision-making
3. Questions for personal reflection
4. Potential growth areas`;

export const TEAM_REPORT_TEMPLATE = `Generate a Team Values Reality Report for:

TEAM: {{teamName}} (Parish: {{parishId}})

TEAM'S STATED VALUES:
{{statedValues}}

COMMITMENT STATEMENT:
{{commitmentStatement}}

DECISION PROCESS CHOSEN:
{{decisionProcess}}

ALL TEAM DECISIONS (chronological):
{{allDecisions}}

VALUES OBSERVER ANALYSIS:
{{valuesAnalysis}}

NOTABLE MOMENTS:
{{notableMoments}}

INTER-PARISH INTERACTIONS:
{{interParishInteractions}}

FINAL PARISH STATE:
{{finalParishState}}

Create a comprehensive team report that:
1. Shows stated vs. enacted values visually
2. Highlights key decision points
3. Identifies patterns and themes
4. Provides discussion prompts for team debrief
5. Celebrates moments of values alignment
6. Explores moments of values tension without judgment`;

export const ORGANIZATIONAL_REPORT_TEMPLATE = `Generate an Organizational Insights presentation for:

ORGANIZATION: {{companyName}}

COMPANY VALUES (if provided):
{{companyValues}}

PARTICIPATING TEAMS:
{{teamSummaries}}

CROSS-TEAM PATTERNS:
{{crossTeamPatterns}}

SYSTEMIC PRESSURES OBSERVED:
{{systemicPressures}}

AGGREGATED VALUES DATA:
{{aggregatedValuesData}}

Create a presentation that:
1. Summarizes cross-team patterns
2. Identifies organizational strengths
3. Highlights areas for values reinforcement
4. Provides actionable recommendations
5. Uses anonymized, aggregated data only`;
