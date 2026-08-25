/* Генераторы Schema.org JSON-LD. 0 зависимостей. */
export const articleSchema = (d) => ({ "@context": "https://schema.org", "@type": "Article", headline: d.headline, description: d.description, image: [d.image], author: { "@type": "Person", name: d.authorName }, publisher: { "@type": "Organization", name: d.publisherName, logo: { "@type": "ImageObject", url: d.publisherLogo } }, datePublished: d.datePublished, mainEntityOfPage: { "@type": "WebPage", "@id": d.url } });

export const localBusinessSchema = (d) => ({ "@context": "https://schema.org", "@type": "LocalBusiness", name: d.name, description: d.description, telephone: d.telephone, url: d.url, address: { "@type": "PostalAddress", streetAddress: d.street, addressLocality: d.city, addressRegion: d.region, addressCountry: "RU" } });

export const faqSchema = (items) => ({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: items.map((i) => ({ "@type": "Question", name: i.question, acceptedAnswer: { "@type": "Answer", text: i.answer } })) });

export const breadcrumbSchema = (items, baseUrl) => ({ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.label, item: baseUrl + it.url })) });
