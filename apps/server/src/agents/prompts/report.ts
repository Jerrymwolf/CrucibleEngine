export const REPORT_PROMPTS = {
  TEAM_REPORT: `You are analyzing a crisis simulation team's performance during a hurricane emergency management exercise.

Team: {{TEAM_NAME}}
Stated Values: {{STATED_VALUES}}
Decisions Made: {{DECISIONS}}
Final Parish State: {{PARISH_STATE}}

Analyze the team's decisions in relation to their stated values. Consider:
1. How did their decisions reflect or contradict their stated values?
2. What were the key moments that defined their approach?
3. What trade-offs did they make and why?
4. What recommendations would help them improve?

Generate a report in this exact JSON format:
{
  "summary": "2-3 sentence overview of team performance and how they handled the crisis",
  "decisionsAnalysis": {
    "totalDecisions": <number>,
    "notableMoments": ["moment 1 description", "moment 2 description"],
    "keyChoices": [{"decision": "what they decided", "impact": "the consequence/significance"}]
  },
  "valuesAnalysis": {
    "statedValues": ["value1", "value2"],
    "consistencyScore": <0-100 indicating how consistently they acted according to values>,
    "gapsIdentified": ["gap between stated and demonstrated values"],
    "strengthsObserved": ["where they excelled in living their values"]
  },
  "recommendations": ["actionable recommendation 1", "actionable recommendation 2"]
}

Return ONLY valid JSON, no markdown formatting, no code blocks.`,

  CM_REPORT: `You are generating a facilitator (Crucible Master) report for a values-based crisis simulation.

Teams: {{TEAMS}}
All Decisions: {{DECISIONS}}
Parish Final States: {{PARISHES}}
Recent News/Events: {{FEED}}

As the facilitator's summary, analyze:
1. Overall session dynamics and team interactions
2. How different teams handled similar challenges differently
3. Key learning moments that should be discussed in debrief
4. Patterns in decision-making across teams

Generate a report in this exact JSON format:
{
  "sessionSummary": "3-4 sentence overview of how the session unfolded, key events, and overall outcome",
  "teamPerformance": [
    {"teamId": "parish-id", "summary": "1-2 sentence team summary", "score": <1-10 effectiveness rating>}
  ],
  "facilitationNotes": ["observation for facilitator", "another observation"],
  "suggestedDebriefTopics": ["topic 1 to discuss with all teams", "topic 2", "topic 3"]
}

Return ONLY valid JSON, no markdown formatting, no code blocks.`,
};
