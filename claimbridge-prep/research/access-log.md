# Source-access limitations

Verified entries appear in sources.json. Search snippets alone were not treated as verification. Some URLs failed in the browser tool; retries/alternatives below explain the gaps. No private patient data was searched or downloaded.

| Attempt | Result / treatment |
|---|---|
| https://www.dol.gov/node/63367 and DOL filing-health-benefits booklet PDF | Open failed/403; direct eCFR R01 used for operative claims rules |
| https://www.dol.gov/node/25140 | DOL claims/COB FAQ open failed; no universal COB procedure taken from snippet |
| https://www.dol.gov/agencies/ebsa/laws-and-regulations/laws/mental-health-parity/mhpaea-enforcement-2022 | Open failed; enforcement statistics not adopted |
| https://www.dfs.ny.gov/public-appeal/search | Search UI failed; individual case pages R10/R11 opened |
| R11 print link | Failed; clinical rationale unverified, metadata only |
| https://www.hhs.gov/hipaa/for-professionals/privacy/guidance/access-right-health-apps-apis/index.html | Open failed; FTC R14 used for limited privacy scope |
| https://www.counterforcehealth.tech/ | Open failed; organization's .org site C02 opened |
| https://www.uhc.com/content/dam/uhcdotcom/en/Legal/PDF/16_2962_1066586_2_COB_Model_Notice_1_2017.pdf | Not accessible; no terms adopted; CMS R16 covers Medicare background only |
| https://www.aetna.com/healthcare-professionals/assets/documents/rejected-returned-claims.pdf | Open failed; Aetna provider disputes HTML R15 opened instead |

Full-page/source snapshots were not saved. The register saves verified paraphrases, locators, jurisdiction, URLs and dates. Official pages can change, so the future app must verify versions when refreshing sources. Some early guessed eCFR paths failed; registry URLs are the successfully opened canonical paths.

## September 26 implementation recheck

- R01: Reopened the eCFR claims-procedure section. Confirmed group-health receipt-based appeal period and relevant-record access in (h)(2)(iii)/(h)(3)(i): https://www.ecfr.gov/current/title-29/subtitle-B/chapter-XXV/subchapter-G/part-2560/section-2560.503-1 .
- R02: Reopened the plan-side non-emergency facility protection, including recognized-amount cost sharing and distinct provider payment requirements: https://www.ecfr.gov/current/title-29/subtitle-B/chapter-XXV/subchapter-L/part-2590/subpart-D/section-2590.716-5 .
- R03: eCFR redirected to an access-block page. Read the regulation text through Cornell LII instead: https://www.law.cornell.edu/cfr/text/45/149.420 . Confirmed (b)(1)(i) anesthesiology exception exclusion and (i) notification. This does not constitute a successful fresh opening of the registry's eCFR URL; keep its original access date. Full source snapshots were not archived.
- These checks support the existing bounded summaries, not a determination that any particular real claim qualifies. Runtime retains the registry's original access dates and URLs.
