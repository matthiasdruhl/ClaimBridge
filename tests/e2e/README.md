# End-to-end acceptance tests

Implement after the first vertical slice. Exercise upload -> conflict -> clarification -> evidence-backed action/draft. Test one wrong-setting counterexample and stale revision handling. Do not submit to a real insurer or call a live model in ordinary CI; provide explicit separate live-evaluation commands.

Golden evaluation fixtures stay in claimbridge-prep/evaluation and demo-case. Tests may read them; runtime application modules must not. Browser tooling will be selected when interactive flows exist.
