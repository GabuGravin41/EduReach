---
name: Product feedback
description: Key UX direction and issues flagged by founder (2026-05-05)
type: feedback
---

**Pop-out chat is a loved feature.** Users prefer the floating/pop-out AI format over being forced into a learning session.
**Why:** Less distraction; they can chat while doing other things. Ensure pop-out is available everywhere.
**How to apply:** Reuse FloatingAIAssistant UI patterns. Don't build separate AI UIs.

---

**Notifications must persist after being read.**
**Why:** Users want to review past notifications. Disappearing them on click was frustrating.
**How to apply:** Mark as read visually (dim + dot indicator) but never remove from the list. Badge count shows unread only.

---

**The system should serve student needs directly, not force workflow.**
**Why:** Students just want to survive exams. They don't want to manually create courses/sessions/assessments. If they can paste notes and get an assessment, that's ideal.
**How to apply:** Prioritize low-friction paths: paste content → AI helps. Future: upload docs/images → AI reads and creates assessments automatically.

---

**AI must not answer its own quiz questions.**
**Why:** Defeats the purpose of a quiz. User explicitly called this out.
**How to apply:** When AI generates a quiz (via quiz tab), it should not simultaneously send answers to the chat. The "Quiz me" prompt in chat was removed because AI answers its own questions when it has transcript context.
