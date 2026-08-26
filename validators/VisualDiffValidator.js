/* ------------------------------------------------------------------ */
/* ЦЕХ VisualDiffValidator.js — DOM Structural Fingerprinter & Visual Diff */
/* ------------------------------------------------------------------ */

export class VisualDiffValidator {
  /**
   * Генерация структурного отпечатка (Jaccard DOM Fingerprint)
   */
  generateDomFingerprint(root = document.body) {
    const tags = [];
    const walk = (el) => {
      if (!el || el.nodeType !== 1) return;
      const selector = el.tagName.toLowerCase() + (el.className ? "." + Array.from(el.classList).join(".") : "");
      tags.push(selector);
      for (const child of el.children) {
        walk(child);
      }
    };
    walk(root);
    return tags;
  }

  /**
   * Сравнение двух DOM-деревьев на процент сходства
   */
  compareDomTrees(treeA, treeB) {
    const setA = new Set(treeA);
    const setB = new Set(treeB);
    const intersection = [...setA].filter((x) => setB.has(x)).length;
    const union = new Set([...setA, ...setB]).size;

    if (union === 0) return 0;
    const similarityPct = Math.round((intersection / union) * 100);
    return similarityPct;
  }

  validate(targetRoot = document.body, referenceTree = []) {
    const currentTree = this.generateDomFingerprint(targetRoot);
    const similarity = this.compareDomTrees(currentTree, referenceTree);

    return {
      currentTreeLength: currentTree.length,
      similarityPercentage: similarity,
      isUnique: similarity <= 10,
    };
  }
}
