const RATE_WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 20;
const requestBuckets = new Map();
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

function allowRequest(clientId = "anonymous") {
  const key = String(clientId).slice(0, 120);
  const now = Date.now();
  const bucket = requestBuckets.get(key);

  if (!bucket || now - bucket.startedAt >= RATE_WINDOW_MS) {
    requestBuckets.set(key, { startedAt: now, count: 1 });
    return true;
  }

  if (bucket.count >= MAX_REQUESTS_PER_WINDOW) return false;
  bucket.count += 1;
  return true;
}

function safeText(value, max = 2000) {
  return String(value || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function normalize(value) {
  return safeText(value, 5000)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function splitSentences(value) {
  return safeText(value, 7000)
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+(?=[A-Z0-9"'])/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => {
      const words = sentence.split(/\s+/).filter(Boolean).length;
      return words >= 8 && words <= 90;
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
  // Present the selected sentences in their original reading order.
  return selected.sort((a, b) => sentences.indexOf(a) - sentences.indexOf(b));
}

function cleanArticle(article) {
  return {
    title: safeText(article?.title, 280),
    source: safeText(article?.source, 120),
    publishedAt: safeText(article?.publishedAt, 40),
    description: safeText(article?.description, 1800),
    content: safeText(article?.content, 5000),
  };
}

function articleSentences(article) {
  const content = splitSentences(article.content);
  const description = splitSentences(article.description);
  return [...description, ...content];
}

function fallbackSentence(article) {
  return splitSentences(article.description || article.content)[0] || article.title || "Source coverage is available below.";
}

export function buildFreeSummary(topic, articles) {
  const sourceArticles = articles.slice(0, MAX_ARTICLES).map(cleanArticle);
  const allSentences = sourceArticles.flatMap(articleSentences);
  const uniqueSourceSentences = [];

  for (const sentence of allSentences) {
    if (uniqueSourceSentences.some((picked) => similarity(picked, sentence) >= 0.84)) continue;
    uniqueSourceSentences.push(sentence);
  }

  const summarySentences = chooseSummarySentences(uniqueSourceSentences, 3);
  const developments = [];
  const used = new Set();

  for (const article of sourceArticles) {
    const candidate = chooseSummarySentences(articleSentences(article), 1)[0] || fallbackSentence(article);
    const key = normalize(candidate);
    if (!candidate || used.has(key)) continue;
    used.add(key);
    developments.push(`${candidate} — ${article.source || "Source"}`);
    if (developments.length >= 5) break;
  }

  const sourceNames = [...new Set(sourceArticles.map((a) => a.source).filter(Boolean))];
  const whatHappened = summarySentences.join(" ").trim();

  return {
    whatHappened:
      whatHappened || fallbackSentence(sourceArticles[0]) || `No detailed source text was available for ${topic || "this topic"}.`,
    keyDevelopments: developments,
    disagreements: "",
    insufficient: allSentences.length === 0,
    aiGenerated: false,
    method: "free-extractive",
    sourcesUsed: sourceNames,
  };
}

export async function proxySummarize({ topic, articles, clientId = "anonymous" }) {
  if (!allowRequest(clientId)) {
    return { status: 429, body: { message: "Too many summary requests. Try again shortly." } };
  }

  if (!topic || typeof topic !== "string" || topic.trim().length > 180) {
    return { status: 400, body: { message: "A valid topic is required." } };
  }

  if (!Array.isArray(articles) || articles.length < 1 || articles.length > MAX_ARTICLES) {
    return { status: 400, body: { message: `Send between 1 and ${MAX_ARTICLES} source articles.` } };
  }

  const trimmed = articles.map(cleanArticle).filter((article) => article.title || article.description || article.content);
  if (!trimmed.length) {
    return { status: 400, body: { message: "Source article text is required." } };
  }

  const summary = buildFreeSummary(topic.trim(), trimmed);
  if (summary.insufficient) {
    return {
      status: 200,
      body: {
        ...summary,
        message: "The current source feed did not provide enough article text for a detailed summary.",
      },
    };
  }

  return {
    status: 200,
    body: summary,
  };
}
