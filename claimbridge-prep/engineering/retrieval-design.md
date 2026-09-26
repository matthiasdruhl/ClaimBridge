# Retrieval implementation

## User/plan domain

Extract pages with pdfplumber. Keep page number, paragraph/section headings, table rows and native geometry. Split by section first; cap long chunks around 1,200-1,800 characters with short overlap, retaining the section parent. Store SHA-256 and stable evidence IDs. FTS5 ranks only within workspace and document domain.

For this case, query `network OR participating OR facility OR anesthesia` plus explicit references `Section 7` and `Section 8`. Fetch both exclusion and exception; additionally fetch benefits and appeal provisions. Never make a coverage conclusion from an isolated exclusion chunk. Rank by lexical relevance, explicit cross-reference and matching plan year. Top 6 chunks plus referenced sections fit the MVP. Deterministic joins use member, service date, provider and claim IDs; date coincidence alone is insufficient.

## External domain

Start from plan classification and dispute type, not raw patient text. Use registry tags: federal, ERISA, non-emergency, anesthesia, facility, appeal. R02/R03/R06 support the core question; R01/R04 support next steps. R09 and actual cases R10/R11 are background and should not be cited as controlling demo rules. Filter before ranking; a high semantic score never overrides incompatible jurisdiction.

Load verified summaries from sources.json, label 'verified source summary', show its locator and outbound URL. Do not invent a full source snapshot or direct quote. During hackathon, optionally fetch and cache the official text with timestamp/hash after a successful access; keep approved source domains and manually checked scope. Network failure uses the dated local summary with an explicit cache label, or returns insufficient evidence. Do not silently pretend a cached result is live research.

No embedding requirement for P0. FTS5 plus a small synonym set is sufficient to test this case; use embeddings only after measured recall failures. Unknown plan type blocks definitive external routing. A service-date/version mismatch requires review. Source freshness is a policy, not an arbitrary numeric confidence score.

## Retrieval evaluation

Require P7 and P8 within top six, P13 for deadline queries, and relevant source R02 for facility protections. Add a long-plan distractor test and a negative medical-necessity document. Record retrieved IDs and rank before generation. This is a narrow stress test, not proof of broad insurance retrieval quality.
