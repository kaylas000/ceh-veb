/* Контент-анализатор: плотность keyword, читаемость, структура. 0 зависимостей. */
const RU_VOWELS = /[аеёиоуыэюя]/gi;
const syllables = (w) => (w.match(RU_VOWELS) || ["x"]).length;

export class ContentSEOAnalyzer {
  analyze(content, primaryKeyword, secondaryKeywords = []) {
    const plain = content.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    const words = plain ? plain.split(" ") : [];
    const issues = [];
    let score = 100;
    if (words.length < 300) { issues.push({ type: "THIN_CONTENT", severity: "high", message: "Контент короче 300 слов" }); score -= 25; }
    const esc = primaryKeyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const matches = (plain.match(new RegExp(esc, "gi")) || []).length;
    const density = primaryKeyword ? (matches * primaryKeyword.split(/\s+/).length / (words.length || 1)) * 100 : 0;
    if (!primaryKeyword || density === 0) { issues.push({ type: "MISSING_KEYWORD", severity: "critical", message: "Keyword не найден" }); score -= 30; }
    else if (density > 3) { issues.push({ type: "KEYWORD_STUFFING", severity: "high", message: "Переспам " + density.toFixed(1) + "%" }); score -= 20; }
    else if (density < 0.5) { issues.push({ type: "LOW_DENSITY", severity: "medium", message: "Низкая плотность" }); score -= 10; }
    const sentences = plain.split(/[.!?]+/).filter((s) => s.trim());
    const syl = words.reduce((s, w) => s + syllables(w), 0);
    const readability = sentences.length && words.length
      ? Math.max(0, Math.min(100, 206.835 - 1.3 * (words.length / sentences.length) - 60.1 * (syl / words.length)))
      : 0;
    if (readability < 40) { issues.push({ type: "LOW_READABILITY", severity: "medium", message: "Индекс " + readability.toFixed(0) }); score -= 10; }
    const h2 = (content.match(/<h2/gi) || []).length;
    if (words.length > 500 && h2 === 0) { issues.push({ type: "NO_SUBHEADINGS", severity: "medium", message: "Нет H2 в длинном тексте" }); score -= 10; }
    secondaryKeywords.forEach((kw) => { if (kw && !plain.toLowerCase().includes(kw.toLowerCase())) { issues.push({ type: "MISSING_SECONDARY", severity: "low", message: kw }); score -= 3; } });
    return { wordCount: words.length, density, readability, score: Math.max(0, score), issues };
  }
}
