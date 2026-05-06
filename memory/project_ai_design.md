---
name: AI system design
description: Single unified "Edu" AI across all surfaces, not video-restricted
type: project
---

The AI assistant is called **Edu** everywhere (not "EduReach AI"). The FloatingAIAssistant and LearningSession AIAssistant are the same Edu identity backed by the same backend endpoint.

**Why:** Users found it confusing to have two differently-named AIs that didn't share context. EduReach AI (floating) was broken/disconnected; Edu (learning sessions) worked. Unifying the name and backend call makes the system feel coherent.

**How to apply:** Never introduce a new AI name. Always call it "Edu". The system prompt should allow general educational help — not restrict to video content. Timestamps in AI responses are removed (felt awkward to users). When quizzing users, AI must ask questions ONLY, no answers revealed until user attempts.

**Agentic vision (not yet built):** AI should eventually be able to generate links to relevant learning sessions or assessments in the chat, and create assessments on the fly that route the user directly to take them.
