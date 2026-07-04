# Taste (Continuously Learned by [CommandCode][cmd])

[cmd]: https://commandcode.ai/

# huggingface
- Use Hugging Face batch reranking API (single POST request with query + documents array) instead of one-by-one textClassification calls per document. Confidence: 0.65

# typescript
- Avoid TypeScript `as` type assertions — fix type errors properly instead of taking shortcuts. Confidence: 0.40
- Prefer simple TypeScript patterns over complex generic type parameters like `<T extends X>` to keep code readable and maintainable. Confidence: 0.75
- Avoid using `any` type — use specific types or `Record<string, unknown>` instead. Confidence: 0.70

# d1
- For D1 transactions, use drizzle's `db.batch([...])` API with query builders (e.g., `db.insert().values()`) rather than raw `env.DB.batch()` with SQL prepared statements. Confidence: 0.70
- Create a shared DB initialization lib file using `drizzle(DB, { schema })` so the schema import is centralized and doesn't need to be passed repeatedly across files. Confidence: 0.65

