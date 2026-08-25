/* SEOHead — обязательные мета-теги. Без title/description/canonical/ogImage — ошибка в dev. */
import React from "react";

function validate({ title, description, canonical, ogImage }) {
  const e = [];
  if (!title || title.length < 30 || title.length > 60) e.push("title должен быть 30-60 символов");
  if (!description || description.length < 120 || description.length > 158) e.push("description должен быть 120-158 символов");
  if (!canonical) e.push("canonical обязателен");
  if (!ogImage) e.push("og:image обязателен");
  if (e.length) console.error("SEO ERROR:\n" + e.join("\n"));
}

export function SEOHead({ title, description, canonical, ogImage, ogType = "website", structuredData = [] }) {
  if (process.env.NODE_ENV === "development") validate({ title, description, canonical, ogImage });
  return (
    <>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonical} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={canonical} />
      <meta name="twitter:card" content="summary_large_image" />
      {structuredData.map((s, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(s) }} />
      ))}
    </>
  );
}
