/* Валидация SEO-манифеста. Node ≥18, 0 зависимостей. */
export function validateSEOManifest(manifest) {
  const errors = [], warnings = [];
  if (!manifest.title) errors.push("Title отсутствует");
  else if (manifest.title.length < 30 || manifest.title.length > 60)
    errors.push("Title длина " + manifest.title.length + " символов (нужно 30-60)");
  if (!manifest.meta_description) errors.push("Meta description отсутствует");
  else if (manifest.meta_description.length < 120 || manifest.meta_description.length > 158)
    errors.push("Description длина " + manifest.meta_description.length + " (нужно 120-158)");
  if (manifest.h1 && manifest.title && manifest.h1.toLowerCase().trim() === manifest.title.toLowerCase().trim())
    warnings.push("H1 дословно дублирует Title");
  if (!manifest.url_slug) errors.push("URL slug отсутствует");
  else if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(manifest.url_slug)) errors.push("Slug содержит недопустимые символы");
  if (!manifest.structured_data_type || manifest.structured_data_type.length === 0)
    errors.push("Не указан тип Schema.org");
  if (!manifest.internal_links_planned || manifest.internal_links_planned.length < 2)
    warnings.push("Менее 2 внутренних ссылок — риск orphan");
  if (!manifest.og_image) errors.push("OG Image отсутствует");
  return { isValid: errors.length === 0, errors, warnings };
}
