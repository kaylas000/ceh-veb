module.exports = {
  ci: {
    collect: { numberOfRuns: 2, settings: { onlyCategories: ["seo"] } },
    assert: {
      assertions: {
        "categories:seo": ["error", { minScore: 0.95 }],
        "meta-description": "error",
        "document-title": "error",
        "image-alt": "error",
        "canonical": "error",
      },
    },
  },
};
