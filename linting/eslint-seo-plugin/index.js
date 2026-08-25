/* ESLint SEO-правила: require-seo-head, require-alt-text, no-duplicate-h1. */
module.exports = {
  rules: {
    "require-seo-head": {
      meta: { type: "problem", docs: { description: "Требует <SEOHead> на каждой странице" } },
      create(context) {
        const isPage = /\/pages\/.*\.jsx?$/.test(context.getFilename()) && !/_app|_document/.test(context.getFilename());
        if (!isPage) return {};
        let has = false;
        return {
          JSXElement(node) { if (node.openingElement.name.name === "SEOHead") has = true; },
          "Program:exit"() { if (!has) context.report({ node: context.getSourceCode().ast, message: "Страница без <SEOHead>" }); },
        };
      },
    },
    "require-alt-text": {
      meta: { type: "problem", docs: { description: "Требует alt у img" } },
      create(context) {
        return {
          JSXOpeningElement(node) {
            if (node.name.name === "img" || node.name.name === "SEOImage") {
              const attrs = node.attributes.map((a) => a.name && a.name.name);
              if (!attrs.includes("alt") && !attrs.includes("isDecorative"))
                context.report({ node, message: "img без alt" });
            }
          },
        };
      },
    },
    "no-duplicate-h1": {
      meta: { type: "problem", docs: { description: "Запрещает >1 H1" } },
      create(context) {
        let n = 0;
        return {
          JSXOpeningElement(node) {
            if (node.name.name === "h1") { n++; if (n > 1) context.report({ node, message: "Повторный H1" }); }
          },
        };
      },
    },
  },
};
