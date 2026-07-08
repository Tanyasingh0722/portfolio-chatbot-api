/**
 * Smart caching layer for Tanya's portfolio chatbot.
 *
 * Three response layers (checked in order):
 *   1. Pre-seeded answers  — hardcoded for common questions, always instant
 *   2. Runtime cache        — stores API responses in-memory during warm function
 *   3. Groq API fallback    — for truly new questions
 *
 * Knowledge invalidation:
 *   A hash of the knowledgeBase string is stored with every cached entry.
 *   If knowledge.js is updated (hash changes), all cached entries are stale
 *   and will be re-fetched from the API.
 */

import { knowledgeBase } from './knowledge.js';

// ─── Stop Words ─────────────────────────────────────────────────────────────────
// Common words removed during normalization so matching focuses on meaning-words.
const STOP_WORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'shall', 'can', 'need', 'dare', 'ought',
  'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from',
  'as', 'into', 'through', 'during', 'before', 'after', 'above', 'below',
  'between', 'out', 'off', 'over', 'under', 'again', 'further', 'then',
  'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'both',
  'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor',
  'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 's', 't',
  'just', 'don', 'now', 'and', 'but', 'or', 'if', 'while', 'about',
  'what', 'which', 'who', 'whom', 'this', 'that', 'these', 'those',
  'am', 'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'you', 'your',
  'he', 'him', 'his', 'she', 'her', 'it', 'its', 'they', 'them', 'their',
  'tell', 'show', 'give', 'get', 'let', 'know', 'think', 'make',
  'like', 'want', 'see', 'look', 'find', 'go', 'come', 'take', 'use',
  'say', 'said', 'also', 'up', 'please', 'really', 'much', 'many',
]);

// ─── Pre-Seeded Answers ─────────────────────────────────────────────────────────
// Each entry has keyword groups and a pre-written answer matching the system
// prompt's third-person teammate tone. Answers are 2-4 sentences max.

const PRE_SEEDED = [
  {
    id: 'summary',
    keywords: ['summary', 'quick', '30', 'second', 'overview', 'introduction',
               'introduce', 'brief', 'nutshell', 'tldr', 'short'],
    answer: `Tanya is a Product Designer with a Computer Science background, currently working at Rentickle where she handles end-to-end product design for a furniture rental platform.

She works across SaaS, fintech, and data-heavy products — and her CS background means she thinks in components and systems, which helps her ship designs that actually get built. She's also exploring design engineering and AI interaction design.`,
  },
  {
    id: 'hire',
    keywords: ['hire', 'hiring', 'why', 'strength', 'strengths', 'stand', 'standout',
               'different', 'advantage', 'best', 'good', 'fit', 'right', 'candidate'],
    answer: `Tanya is a product designer who connects user problems, business needs, and technical constraints.

She has worked on e-commerce experiences, internal SaaS tools, and design systems while collaborating closely with product and engineering teams.

She is also exploring AI workflows and design engineering to improve how products are built.`,
  },
  {
    id: 'process',
    keywords: ['process', 'approach', 'methodology', 'framework', 'workflow',
               'method', 'steps', 'design process', 'how work', 'way work'],
    answer: `Tanya doesn't follow one fixed design framework for every project. She adapts based on the problem, timeline, and team.

Usually she starts by understanding user pain points and business goals, discusses constraints with PMs and developers, explores solutions, gets feedback, and improves from there.`,
  },
  {
    id: 'education',
    keywords: ['education', 'degree', 'college', 'university', 'study', 'studied',
               'qualification', 'academic', 'school', 'btech', 'computer science',
               'background', 'graduated'],
    answer: `Tanya has a B.Tech in Computer Science from United College of Engineering and Research, Prayagraj — she graduated in 2023.

She started in graphic design and transitioned into UI/UX. Her CS background stuck with her though — she still thinks in components and systems, and can code basic front-end herself. That helps her hand off clean Figma files and close the gap between design and what actually ships.`,
  },
  {
    id: 'projects',
    keywords: ['project', 'projects', 'case', 'study', 'studies', 'casestudy',
               'portfolio', 'work', 'designed', 'product', 'products', 'built',
               'review', 'first'],
    answer: `Tanya has a few key projects worth looking at:

- **Rentickle** — She redesigned the checkout, payment flows, and KYC experience for a furniture rental platform. The checkout redesign cut completion time by 42%.
- **Canopy** — A live spending app she built solo where you draw before logging a purchase, adding intentional friction to interrupt impulse spending.
- **Pehel** — A concept app reimagining job portals for Gen Z using conversational AI.`,
  },
  {
    id: 'tools',
    keywords: ['tool', 'tools', 'figma', 'software', 'stack', 'tech', 'technology',
               'skill', 'skills', 'photoshop', 'illustrator', 'code', 'coding',
               'react', 'html', 'css', 'framer', 'webflow'],
    answer: `Figma is Tanya's main design tool. She also uses InDesign, Photoshop, Illustrator, and After Effects when needed.

On the code side, she works with HTML, CSS, and basic React. She also builds with Framer and Webflow for no-code projects.`,
  },
  {
    id: 'collaboration',
    keywords: ['collaborate', 'collaboration', 'developer', 'developers', 'engineer',
               'engineers', 'engineering', 'team', 'teamwork', 'handoff', 'handover',
               'work with'],
    answer: `Tanya's computer science background helps her collaborate better with developers.

She thinks in components, understands technical constraints, and focuses on creating designs that can actually be shipped.`,
  },
  {
    id: 'contact',
    keywords: ['contact', 'email', 'reach', 'connect', 'linkedin', 'phone',
               'hire', 'opportunity', 'opportunities', 'available', 'open',
               'contra', 'portfolio site'],
    answer: `You can reach Tanya through:

- **Email**: singhtanya20003@gmail.com
- **LinkedIn**: linkedin.com/in/designedbynitya
- **Contra**: contra.com/designedbynitya
- **Portfolio**: tanya-singh.framer.website`,
  },
];


// ─── Knowledge Hashing ──────────────────────────────────────────────────────────
// Simple string hash (djb2) — fast and sufficient for detecting content changes.

function hashString(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) & 0xFFFFFFFF;
  }
  return hash.toString(36);
}

let _knowledgeHash = null;

/**
 * Returns the hash of the current knowledgeBase.
 * Computed once per cold start (knowledge.js is a static import).
 */
export function getKnowledgeHash() {
  if (_knowledgeHash === null) {
    _knowledgeHash = hashString(knowledgeBase);
  }
  return _knowledgeHash;
}


// ─── Text Normalization ─────────────────────────────────────────────────────────

/**
 * Normalizes a question to a bag of meaningful tokens.
 * "What is Tanya's design process?" → ['tanya', 'design', 'process']
 */
export function normalizeQuestion(text) {
  return text
    .toLowerCase()
    .replace(/['']/g, '')        // Remove apostrophes
    .replace(/[^a-z0-9\s]/g, ' ') // Strip punctuation
    .split(/\s+/)
    .filter(word => word.length > 1 && !STOP_WORDS.has(word));
}


// ─── Similarity Scoring ─────────────────────────────────────────────────────────

/**
 * Scores how well a user question matches a pre-seeded entry's keywords.
 * Returns a value between 0 and 1.
 *
 * Uses bidirectional overlap:
 *   - What fraction of the entry's keywords appear in the question (recall)
 *   - What fraction of the question's tokens appear in the entry's keywords (precision)
 *   - Combined score favours recall (0.6) over precision (0.4) so short questions
 *     like "education?" still match the education entry.
 */
function similarityScore(questionTokens, entryKeywords) {
  if (questionTokens.length === 0) return 0;

  const questionSet = new Set(questionTokens);
  const keywordSet = new Set(entryKeywords);

  let matchedKeywords = 0;
  for (const kw of keywordSet) {
    if (questionSet.has(kw)) matchedKeywords++;
  }

  let matchedTokens = 0;
  for (const token of questionSet) {
    if (keywordSet.has(token)) matchedTokens++;
  }

  const recall = matchedKeywords / keywordSet.size;
  const precision = matchedTokens / questionSet.size;

  return 0.6 * recall + 0.4 * precision;
}

const SIMILARITY_THRESHOLD = 0.25; // Tuned: low because keywords are curated


// ─── Pre-Seeded Matching ────────────────────────────────────────────────────────

/**
 * Checks if the user's question matches a pre-seeded answer.
 * Returns the answer string, or null if no confident match.
 */
export function matchPreSeeded(question) {
  const tokens = normalizeQuestion(question);
  if (tokens.length === 0) return null;

  let bestScore = 0;
  let bestAnswer = null;

  for (const entry of PRE_SEEDED) {
    const score = similarityScore(tokens, entry.keywords);
    if (score > bestScore) {
      bestScore = score;
      bestAnswer = entry.answer;
    }
  }

  return bestScore >= SIMILARITY_THRESHOLD ? bestAnswer : null;
}


// ─── Runtime Cache ──────────────────────────────────────────────────────────────
// In-memory LRU cache for API responses. Lives during a warm Vercel function
// instance (~5-15 min). Lost on cold start — that's fine, pre-seeded always works.

const MAX_CACHE_SIZE = 100;

// Map<normalizedKey, { answer: string, hash: string, lastUsed: number }>
const runtimeCache = new Map();

/**
 * Creates a stable cache key from a question's normalized tokens.
 */
function cacheKey(question) {
  return normalizeQuestion(question).sort().join('|');
}

/**
 * Evicts the least-recently-used entry if cache is at capacity.
 */
function evictIfNeeded() {
  if (runtimeCache.size < MAX_CACHE_SIZE) return;

  let oldestKey = null;
  let oldestTime = Infinity;

  for (const [key, entry] of runtimeCache) {
    if (entry.lastUsed < oldestTime) {
      oldestTime = entry.lastUsed;
      oldestKey = key;
    }
  }

  if (oldestKey) runtimeCache.delete(oldestKey);
}

/**
 * Tries to find a cached answer for the given question.
 * Returns the answer string, or null if not cached / stale hash.
 */
export function findCachedAnswer(question, currentHash) {
  const key = cacheKey(question);
  const entry = runtimeCache.get(key);

  if (!entry) return null;

  // Invalidate if knowledge has been updated
  if (entry.hash !== currentHash) {
    runtimeCache.delete(key);
    return null;
  }

  // Update last-used timestamp
  entry.lastUsed = Date.now();
  return entry.answer;
}

/**
 * Stores a question-answer pair in the runtime cache.
 */
export function cacheAnswer(question, answer, currentHash) {
  const key = cacheKey(question);

  // Don't cache empty or very short answers (likely errors)
  if (!answer || answer.trim().length < 20) return;

  evictIfNeeded();

  runtimeCache.set(key, {
    answer,
    hash: currentHash,
    lastUsed: Date.now(),
  });
}

/**
 * Returns true if the conversation has enough history to suggest the question
 * depends on prior context (meaning caching would give the wrong answer).
 */
export function isContextDependent(history) {
  if (!Array.isArray(history)) return false;
  // If there are 2+ prior exchanges, the question likely references earlier context
  const userCount = history.filter(h => h.role === 'user').length;
  return userCount >= 2;
}
