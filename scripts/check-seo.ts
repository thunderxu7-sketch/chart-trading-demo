import assert from 'node:assert/strict';
import { load } from 'cheerio';
const base = process.env.TEST_BASE_URL || 'http://localhost:3000';
const canonicalBase = process.env.SITE_URL || 'http://localhost:3000';
const paths = ['/', '/markets/eth-musd', '/trade/eth-musd', '/faq'];
const titles = new Set<string>();
for (const path of paths) {
  // Fetch raw HTML without JS: a hydrated browser alone would miss CSR-only SEO regressions.
  const response = await fetch(new URL(path,base), { headers: { 'User-Agent': 'Googlebot' } });
  assert.equal(response.status,200,path); const $ = load(await response.text());
  const title = $('title').text().trim();
  assert.ok(title.length >= 10 && title.length < 100,`${path}: missing/invalid title`);
  assert.ok(!titles.has(title),`${path}: duplicate title`);titles.add(title);
  assert.equal($('link[rel="canonical"]').length,1,`${path}: exactly one canonical`);
  const canonical = $('link[rel="canonical"]').attr('href');
  assert.ok(canonical && /^https?:\/\//.test(canonical),`${path}: canonical must be absolute`);
  // URL normalization treats origin and origin/ identically; Next strips the
  // root slash in metadata. Missing/wrong-host/wrong-path canonicals still fail.
  assert.equal(new URL(canonical).toString(),new URL(path,canonicalBase).toString(),`${path}: canonical must match public origin/path`);
  assert.equal($('h1').length,1,`${path}: single H1`);
  assert.ok(!$('meta[name="robots"]').attr('content')?.includes('noindex'),`${path}: unexpectedly noindex`);
  if(path !== '/') {
    const schemas = $('script[type="application/ld+json"]').toArray().map(el=>JSON.parse($(el).html()!));
    assert.ok(schemas.some(s=>s['@type']==='BreadcrumbList' && s.itemListElement.at(-1).item === new URL(path,canonicalBase).toString()),`${path}: breadcrumb missing`);
  }
  if(path === '/trade/eth-musd') {
    assert.ok($('[data-testid="server-summary"]').text().includes('历史行情摘要'),'Missing server history');
    assert.ok($('[data-testid="server-details"]').text().includes('0.30%'),'Missing crawlable fees');
  }
  console.log('SEO PASS',path,title);
}
const sitemap = await (await fetch(`${base}/sitemap.xml`)).text();
for(const path of paths)assert.ok(sitemap.includes(new URL(path,canonicalBase).toString()),`Sitemap missing ${path}`);
const robots = await (await fetch(`${base}/robots.txt`)).text();
assert.match(robots,/Allow: \//);assert.ok(robots.includes(`${canonicalBase.replace(/\/$/,'')}/sitemap.xml`));
console.log('SEO PASS sitemap, robots, crawlable RSC content');
