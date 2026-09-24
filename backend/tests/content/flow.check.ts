// Integration check for the CMS controller against a throwaway local database.
import mongoose from 'mongoose';
import * as c from '../../src/controllers/contentController';
import ContentRevision from '../../src/models/ContentRevision';

// Drops the database it runs against, so only a local throwaway DB is allowed.
const URI = process.env.CMS_TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017/lawweb_cms_test';
if (!/^mongodb:\/\/(127\.0\.0\.1|localhost)(:\d+)?\/\w*test\w*$/.test(URI)) {
  console.error(`Refusing to run: ${URI} is not a local *test* database.`);
  process.exit(1);
}
const user = { _id: new mongoose.Types.ObjectId(), name: 'Test Admin' };

let failures = 0;
const expect = (name: string, cond: boolean, detail?: unknown) => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}`);
  if (!cond) { failures++; if (detail !== undefined) console.log('      ', JSON.stringify(detail)); }
};

const call = async (fn: any, params: Record<string, string>, body: any = {}) => {
  let status = 200; let json: any; const headers: Record<string, string> = {};
  const res: any = {
    status(s: number) { status = s; return res; },
    json(j: any) { json = j; return res; },
    set(k: string, v: string) { headers[k] = v; return res; },
  };
  await fn({ params, body, user } as any, res);
  return { status, json, headers };
};

const heroTitle = (en: string) => ({ strings: { 'about.heroTitle': { en, bn: 'বাংলা' } } });

(async () => {
  await mongoose.connect(URI);
  await mongoose.connection.dropDatabase();
  await ContentRevision.syncIndexes();

  let r = await call(c.listContentPages, {});
  expect('list: all 7 pages returned before any doc exists', r.json.data.length === 7 && r.json.data.every((p: any) => p.version === 0));
  expect('list: draft included, published omitted', 'draft' in r.json.data[0] && !('published' in r.json.data[0]));

  r = await call(c.getContentPageAdmin, { pageKey: 'about' });
  expect('get: missing page returns empty virtual page', r.status === 200 && r.json.data.version === 0);

  r = await call(c.publishContentPage, { pageKey: 'about' });
  expect('publish: nothing to publish -> 400', r.status === 400);

  r = await call(c.saveContentDraft, { pageKey: 'about' }, { data: { strings: { 'bad key': { en: 'x' } } } });
  expect('save: invalid data -> 400 with field errors', r.status === 400 && r.json.errors?.length > 0, r.json);

  r = await call(c.saveContentDraft, { pageKey: 'about' }, { data: heroTitle('V1') });
  expect('save: draft saved, has unpublished changes', r.status === 200 && r.json.data.hasUnpublishedChanges === true);
  expect('save: records editor name', r.json.data.draftUpdatedByName === 'Test Admin');

  r = await call(c.getPublishedContent, {});
  expect('public: unpublished draft is NOT visible', !('about' in r.json.data));

  r = await call(c.publishContentPage, { pageKey: 'about' });
  expect('publish: v1', r.status === 200 && r.json.data.version === 1 && r.json.data.hasUnpublishedChanges === false);

  r = await call(c.getPublishedContent, {});
  expect('public: published content visible', r.json.data.about?.strings?.['about.heroTitle']?.en === 'V1', r.json);
  expect('public: cache header set', !!r.headers['Cache-Control']);

  r = await call(c.getPublishedPage, { pageKey: 'about' });
  expect('public page: returns data + version', r.json.meta.version === 1);
  r = await call(c.getPublishedPage, { pageKey: 'nope' });
  expect('public page: unknown key -> 404', r.status === 404);

  // Same content with different key order is not a change
  r = await call(c.saveContentDraft, { pageKey: 'about' }, { data: { strings: { 'about.heroTitle': { bn: 'বাংলা', en: 'V1' } } } });
  expect('save: identical content (reordered) -> no unpublished changes', r.json.data.hasUnpublishedChanges === false);

  await call(c.saveContentDraft, { pageKey: 'about' }, { data: heroTitle('V2') });
  r = await call(c.publishContentPage, { pageKey: 'about' });
  expect('publish: v2', r.json.data.version === 2);

  r = await call(c.listContentRevisions, { pageKey: 'about' });
  expect('revisions: 2 listed newest first, no data payload', r.json.data.length === 2 && r.json.data[0].version === 2 && r.json.data[0].data === undefined);

  r = await call(c.getContentRevision, { pageKey: 'about', version: '1' });
  expect('revision: v1 data retrievable', r.json.data.data.strings['about.heroTitle'].en === 'V1');

  r = await call(c.restoreContentRevision, { pageKey: 'about', version: '1' });
  expect('restore: v1 into draft, flagged unpublished', r.json.data.draft.strings['about.heroTitle'].en === 'V1' && r.json.data.hasUnpublishedChanges === true);
  r = await call(c.getPublishedContent, {});
  expect('restore: live site still shows V2 until publish', r.json.data.about.strings['about.heroTitle'].en === 'V2');

  r = await call(c.discardContentDraft, { pageKey: 'about' });
  expect('discard: draft back to published V2', r.json.data.draft.strings['about.heroTitle'].en === 'V2' && !r.json.data.hasUnpublishedChanges);

  r = await call(c.restoreContentRevision, { pageKey: 'about', version: '99' });
  expect('restore: missing revision -> 404', r.status === 404);

  // Concurrent publishes: exactly one wins
  await call(c.saveContentDraft, { pageKey: 'home' }, { data: { stats: [{ value: { en: '27+' }, label: { en: 'Years' } }] } });
  const [a, b] = await Promise.all([call(c.publishContentPage, { pageKey: 'home' }), call(c.publishContentPage, { pageKey: 'home' })]);
  const statuses = [a.status, b.status].sort();
  expect('concurrent publish: one 200, one 409', statuses[0] === 200 && statuses[1] === 409, statuses);
  expect('concurrent publish: single revision', (await ContentRevision.countDocuments({ pageKey: 'home' })) === 1);

  // Pruning keeps the newest 20
  for (let i = 3; i <= 23; i++) {
    await call(c.saveContentDraft, { pageKey: 'about' }, { data: heroTitle(`V${i}`) });
    await call(c.publishContentPage, { pageKey: 'about' });
  }
  const versions = (await ContentRevision.find({ pageKey: 'about' }).sort({ version: 1 })).map((x) => x.version);
  expect('prune: 20 revisions kept (v4..v23)', versions.length === 20 && versions[0] === 4 && versions[19] === 23, versions);

  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  console.log(failures ? `\n${failures} FAILED` : '\nAll checks passed');
  process.exit(failures ? 1 : 0);
})().catch(async (e) => {
  console.error(e);
  await mongoose.disconnect();
  process.exit(1);
});
