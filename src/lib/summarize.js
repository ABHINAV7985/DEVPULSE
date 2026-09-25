const MAX_ARTICLES = 6;

const STOP_WORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "been", "being", "but", "by", "for",
  "from", "had", "has", "have", "he", "her", "here", "hers", "him", "his", "how", "i",
  "if", "in", "into", "is", "it", "its", "itself", "just", "me", "more", "most", "my",
  "no", "not", "of", "on", "or", "our", "ours", "out", "over", "said", "she", "so",
  "some", "than", "that", "the", "their", "them", "then", "there", "these", "they", "this",
  "those", "to", "too", "under", "up", "was", "we", "were", "what", "when", "where", "which",
  "who", "why", "will", "with", "you", "your", "yours"
]);

function cleanText(value) {
  return String(value || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&#x27;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function normalize(value) {
  return cleanText(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function splitSentences(value) {
  return cleanText(value)
    .split(/(?<=[.!?])\s+(?=[A-Z0-9"'])/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => {
      const wordCount = sentence.split(/\s+/).filter(Boolean).length;
      return wordCount >= 8 && wordCount <= 90;
    });
}

function tokenize(value) {
  return normalize(value)
    .split(/\s+/)
    .filter((word) => word.length >= 3 && !STOP_WORDS.has(word));
}

function makeFrequencyMap(sentences) {
  const frequency = new Map();
  for (const sentence of sentences) {
    for (const word of tokenize(sentence)) {
      frequency.set(word, (frequency.get(word) || 0) + 1);
    }
  }
  return frequency;
}

function sentenceScore(sentence, index, total, frequency) {
  const words = tokenize(sentence);
  if (!words.length) return 0;

  const uniqueWords = new Set(words);
  const frequencyScore = words.reduce((sum, word) => sum + (frequency.get(word) || 0), 0) / words.length;
  const uniqueness = uniqueWords.size / words.length;
  const positionBonus = total > 1 ? 1 - index / total : 1;
  const lengthBonus = words.length >= 14 && words.length <= 42 ? 1.15 : 1;

  return (frequencyScore * 0.72 + uniqueness * 2.4 + positionBonus * 1.8) * lengthBonus;
}

function similarity(a, b) {
  const aWords = new Set(tokenize(a));
  const bWords = new Set(tokenize(b));
  if (!aWords.size || !bWords.size) return 0;

  let intersection = 0;
  for (const word of aWords) {
    if (bWords.has(word)) intersection += 1;
  }
  return intersection / Math.max(1, Math.min(aWords.size, bWords.size));
}

function uniqueByMeaning(sentences, limit) {
  const selected = [];
  for (const sentence of sentences) {
    if (selected.some((picked) => similarity(picked, sentence) >= 0.78)) continue;
    selected.push(sentence);
    if (selected.length >= limit) break;
  }
  return selected;
}

function chooseSummarySentences(sentences, limit = 3) {
  if (!sentences.length) return [];
  const frequency = makeFrequencyMap(sentences);
  const ranked = sentences
    .map((sentence, index) => ({
      sentence,
      index,
      score: sentenceScore(sentence, index, sentences.length, frequency),
    }))
    .sort((a, b) => b.score - a.score);

  const selected = uniqueByMeaning(ranked.map((item) => item.sentence), limit);
  return selected.sort((a, b) => sentences.indexOf(a) - sentences.indexOf(b));
}

function articleSentences(article) {
  return [
    ...splitSentences(article?.description),
    ...splitSentences(article?.content),
  ];
}

function fallbackSentence(article) {
  return (
    splitSentences(article?.description || article?.content)[0] ||
    article?.title ||
    "Source coverage is available below."
  );
}

/**
 * Free, deterministic, source-grounded summarizer.
 * It only reuses sentences from the fetched source material and never calls
 * an external AI provider, so there is no summarization API key or cost.
 */
export function buildFallbackSummary(articles, topic = "this topic") {
  const sourceArticles = (articles || []).slice(0, MAX_ARTICLES);
  const allSentences = sourceArticles.flatMap(articleSentences);
  const uniqueSourceSentences = [];

  for (const sentence of allSentences) {
    if (uniqueSourceSentences.some((picked) => similarity(picked, sentence) >= 0.84)) continue;
    uniqueSourceSentences.push(sentence);
  }

  const summarySentences = chooseSummarySentences(uniqueSourceSentences, 3);
  const keyDevelopments = [];
  const used = new Set();

  for (const article of sourceArticles) {
    const candidate = chooseSummarySentences(articleSentences(article), 1)[0] || fallbackSentence(article);
    const key = normalize(candidate);
    if (!candidate || used.has(key)) continue;
    used.add(key);
    keyDevelopments.push(`${candidate} — ${article?.source?.name || "Source"}`);
    if (keyDevelopments.length >= 5) break;
  }

  return {
    whatHappened:
      summarySentences.join(" ").trim() ||
      fallbackSentence(sourceArticles[0]) ||
      `No detailed source text was available for ${topic}.`,
    keyDevelopments,
    disagreements: "",
    aiGenerated: false,
    method: "free-extractive",
    sourcesUsed: [...new Set(sourceArticles.map((article) => article?.source?.name).filter(Boolean))],
  };
}

// Kept async so existing pages do not need a data-flow change. No network
// request is made here; summaries are generated locally from fetched text.
export async function getGroundedSummary(topic, articles) {
  if (!articles?.length) return null;
  return buildFallbackSummary(articles, topic);
}
