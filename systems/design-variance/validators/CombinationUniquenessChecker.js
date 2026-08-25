/* Отпечаток комбинации (кнопка+иконки+иллюстрация+гармония) против реестра design_genomes.
   >=4 совпадений = high (блокировка), >=2 = moderate (предупреждение). */
export function checkUniqueness(genome, registry) {
  const fp = [genome.button.id, genome.iconSet.id, genome.illustration.id, genome.colors.harmonyType];
  const matches = registry
    .map((e) => ({ projectId: e.projectId, count: fp.filter((v) => e.fingerprint.includes(v)).length }))
    .filter((m) => m.count >= 2);
  return { conflictLevel: matches.some((m) => m.count >= 4) ? "high" : matches.length ? "moderate" : "none", matches };
}
