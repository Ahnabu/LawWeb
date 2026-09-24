import { contentPageSchemas } from '../../src/config/contentSchemas';
import { validateRequest, saveContentDraftSchema, contentRevisionSchema } from '../../src/middleware/validation';

let failures = 0;
const expect = (name: string, cond: boolean, detail?: unknown) => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}`);
  if (!cond) { failures++; if (detail) console.log('      ', JSON.stringify(detail)); }
};
const ok = (key: keyof typeof contentPageSchemas, data: unknown) => contentPageSchemas[key].safeParse(data);

// Empty pages are valid (sparse storage)
for (const key of Object.keys(contentPageSchemas) as (keyof typeof contentPageSchemas)[]) {
  expect(`${key}: empty object valid`, ok(key, {}).success);
}

// String overrides
let r = ok('about', { strings: { 'about.heroTitle': { en: '  New title ', bn: 'নতুন শিরোনাম' } } });
expect('about: string override valid + trimmed', r.success && (r.data as any).strings['about.heroTitle'].en === 'New title', r);
expect('about: bn-only override valid', ok('about', { strings: { 'about.heroTitle': { bn: 'শুধু বাংলা' } } }).success);
expect('bad i18n key rejected', !ok('global', { strings: { 'no dots here': { en: 'x' } } }).success);
expect('script key rejected', !ok('global', { strings: { '<script>': { en: 'x' } } }).success);
expect('unknown top-level field rejected (strict)', !ok('track-case', { stats: [] }).success);
expect('too-long text rejected', !ok('global', { strings: { 'nav.home': { en: 'x'.repeat(2001) } } }).success);

// Lists
r = ok('home', { stats: [{ value: { en: '27+' }, label: { en: 'Experience', bn: 'অভিজ্ঞতা' } }] });
expect('home: stats with missing bn defaults to ""', r.success && (r.data as any).stats[0].value.bn === '', r);
expect('home: list item without en rejected', !ok('home', { stats: [{ value: { en: '' }, label: { en: 'x' } }] }).success);
expect('home: more than 8 stats rejected', !ok('home', { stats: Array(9).fill({ value: { en: 'a' }, label: { en: 'b' } }) }).success);

const area = (slug: string) => ({ slug, title: { en: 'T' }, description: { en: 'D' }, details: { en: 'X' } });
expect('practice-areas: valid areas', ok('practice-areas', { areas: [area('immigration'), area('family-law')] }).success);
expect('practice-areas: duplicate slugs rejected', !ok('practice-areas', { areas: [area('a'), area('a')] }).success);
expect('practice-areas: bad slug rejected', !ok('practice-areas', { areas: [area('Bad Slug')] }).success);

// Site settings
expect('site: valid settings', ok('site', { settings: { phone: '+8801715365380', whatsappNumber: '8801715365380', email: 'info@example.com', socials: [{ platform: 'facebook', url: 'https://facebook.com/x' }] } }).success);
expect('site: whatsapp with + rejected', !ok('site', { settings: { whatsappNumber: '+8801715365380' } }).success);
expect('site: javascript: url rejected', !ok('site', { settings: { socials: [{ platform: 'x', url: 'javascript:alert(1)' }] } }).success);
expect('site: unknown settings field rejected', !ok('site', { settings: { adminPassword: 'x' } }).success);

// Route-level request validation middleware
const run = (schema: any, req: any) => {
  let status = 0; let nextCalled = false;
  const res = { status: (s: number) => { status = s; return { json: () => undefined }; } };
  validateRequest(schema)(req, res, () => { nextCalled = true; });
  return { status, nextCalled };
};
expect('route: valid pageKey + data passes', run(saveContentDraftSchema, { params: { pageKey: 'home' }, body: { data: {} } }).nextCalled);
expect('route: unknown pageKey -> 400', run(saveContentDraftSchema, { params: { pageKey: 'dashboard' }, body: { data: {} } }).status === 400);
expect('route: missing data -> 400', run(saveContentDraftSchema, { params: { pageKey: 'home' }, body: {} }).status === 400);
expect('route: revision version "3" passes', run(contentRevisionSchema, { params: { pageKey: 'about', version: '3' } }).nextCalled);
expect('route: revision version "abc" -> 400', run(contentRevisionSchema, { params: { pageKey: 'about', version: 'abc' } }).status === 400);

console.log(failures ? `\n${failures} FAILED` : '\nAll checks passed');
process.exit(failures ? 1 : 0);
