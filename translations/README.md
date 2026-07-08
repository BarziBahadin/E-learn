# Sorani Kurdish translation handoff

The translation catalog is `ckb-IQ.catalog.json`. It targets Sorani Kurdish as used in the Kurdistan Region of Iraq and uses right-to-left layout.

## Translator workflow

1. Edit only `kurdish`, `status`, and `reviewerNotes`.
2. Set `status` to `Draft`, then `Reviewed` after a second native speaker approves it.
3. Preserve names and every placeholder listed in `placeholders`.
4. Translate for meaning and UI length rather than word-for-word equivalence.
5. Flag ambiguous education, payment, security, and guardian terminology in `reviewerNotes`.

Do not edit `key`, `english`, or `locations`; the application will depend on stable keys.

## Recommended reviewers

- A native Sorani speaker for the initial translation.
- A Kurdish Grade 12 educator for curriculum and course terminology.
- The product owner for payment, wallet, voucher, guardian, and account-security terms.

## Refreshing the inventory

Run:

```bash
node scripts/extract-translation-catalog.mjs
```

The extractor inventories visible text from the landing page, application UI, and navigation. It preserves existing Kurdish translations, review status, reviewer notes, and stable keys when English source text is unchanged.
