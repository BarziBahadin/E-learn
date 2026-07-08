import fs from 'node:fs/promises';

const catalogPath = new URL('../translations/ckb-IQ.catalog.json', import.meta.url);
const catalog = JSON.parse(await fs.readFile(catalogPath, 'utf8'));
const pending = catalog.entries.filter((entry) => !entry.kurdish);

async function translate(entry) {
  const url = new URL('https://translate.googleapis.com/translate_a/single');
  url.search = new URLSearchParams({ client: 'gtx', sl: 'en', tl: 'ckb', dt: 't', q: entry.english });
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const response = await fetch(url);
    if (response.ok) {
      const payload = await response.json();
      entry.kurdish = payload[0].map((part) => part[0]).join('').trim();
      entry.status = 'Draft';
      entry.reviewerNotes = 'AI-assisted first draft; native Sorani review required.';
      return;
    }
    if (attempt === 3) throw new Error(`Translation failed (${response.status}): ${entry.english}`);
    await new Promise((resolve) => setTimeout(resolve, attempt * 750));
  }
}

for (let index = 0; index < pending.length; index += 8) {
  await Promise.all(pending.slice(index, index + 8).map(translate));
  console.log(`Translated ${Math.min(index + 8, pending.length)} of ${pending.length}`);
}

await fs.writeFile(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`);
console.log(`Updated ${pending.length} draft translations.`);
