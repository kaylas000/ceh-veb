/* ------------------------------------------------------------------ */
/* ЦЕХ Schema.org Rich Snippet Factory & OpenGraph Generator (SOTA)   */
/* Node ≥18, ноль npm-зависимостей                                    */
/* ------------------------------------------------------------------ */

export class SchemaFactory {
  static createLocalBusiness(data = {}) {
    return {
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      "name": data.name || "ЦЕХ — Веб-студия дизайна",
      "url": data.url || "https://ceh-studio.ru",
      "telephone": data.phone || "+7 (925) 333-86-66",
      "address": {
        "@type": "PostalAddress",
        "streetAddress": data.address || "Речная ул., 8",
        "addressLocality": data.city || "Красногорск",
        "addressRegion": data.region || "Московская область",
        "addressCountry": "RU"
      },
      "geo": {
        "@type": "GeoCoordinates",
        "latitude": data.lat || "55.8208",
        "longitude": data.lng || "37.3325"
      },
      "openingHoursSpecification": {
        "@type": "OpeningHoursSpecification",
        "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
        "opens": "09:00",
        "closes": "21:00"
      },
      "priceRange": "₽₽"
    };
  }

  static createProduct(data = {}) {
    return {
      "@context": "https://schema.org",
      "@type": "Product",
      "name": data.name || "Разработка веб-сайта",
      "description": data.description || "Дизайн и сборка сайта строго по регламенту ЦЕХа",
      "brand": {
        "@type": "Brand",
        "name": "ЦЕХ"
      },
      "offers": {
        "@type": "Offer",
        "priceCurrency": "RUB",
        "price": String(data.price || 100000),
        "availability": "https://schema.org/InStock"
      }
    };
  }

  static createFAQPage(questions = []) {
    return {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": questions.map((q) => ({
        "@type": "Question",
        "name": q.q,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": q.a
        }
      }))
    };
  }

  static createOpenGraphMeta(data = {}) {
    const title = data.title || "ЦЕХ — веб-студия дизайна";
    const desc = data.desc || "Студия агентной разработки под закрытие проектов";
    const url = data.url || "https://ceh-studio.ru";
    const image = data.image || "https://ceh-studio.ru/og-image.png";

    return `
    <meta property="og:type" content="website">
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${desc}">
    <meta property="og:url" content="${url}">
    <meta property="og:image" content="${image}">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${title}">
    <meta name="twitter:description" content="${desc}">
    <meta name="twitter:image" content="${image}">
    `;
  }
}
