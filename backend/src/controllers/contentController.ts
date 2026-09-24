import { Request, Response } from 'express';
import ContentPage, { IContentPage } from '../models/ContentPage';
import ContentRevision from '../models/ContentRevision';
import { CONTENT_PAGE_KEYS, ContentPageKey, contentPageSchemas, isContentPageKey } from '../config/contentSchemas';
import { formatZodIssues } from '../middleware/validation';
import { notifyContentPublished } from '../utils/revalidate';

interface AuthRequest extends Request {
  user?: any;
}

const MAX_REVISIONS_PER_PAGE = 20;

// Key-order-independent JSON, used to decide whether draft differs from published
const stableStringify = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => a.localeCompare(b));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(',')}}`;
  }
  return JSON.stringify(value);
};

const isSameContent = (a: unknown, b: unknown) => stableStringify(a ?? {}) === stableStringify(b ?? {});

const serializePage = (key: ContentPageKey, page: IContentPage | null) => ({
  key,
  draft: page?.draft ?? {},
  published: page?.published ?? {},
  version: page?.version ?? 0,
  hasUnpublishedChanges: page?.hasUnpublishedChanges ?? false,
  draftUpdatedAt: page?.draftUpdatedAt ?? null,
  draftUpdatedByName: page?.draftUpdatedByName ?? null,
  publishedAt: page?.publishedAt ?? null,
  publishedByName: page?.publishedByName ?? null,
});

const validatePageData = (key: ContentPageKey, data: unknown) => contentPageSchemas[key].safeParse(data);

// ── Public: all published content, keyed by page ────────────────────────────
export const getPublishedContent = async (_req: Request, res: Response) => {
  try {
    const pages = await ContentPage.find({ version: { $gt: 0 } }).select('key published version');

    const data: Record<string, unknown> = {};
    const versions: Record<string, number> = {};
    for (const page of pages) {
      data[page.key] = page.published;
      versions[page.key] = page.version;
    }

    res.set('Cache-Control', 'public, max-age=30, stale-while-revalidate=120');
    res.json({ status: 200, message: 'Content retrieved successfully', data, meta: { versions } });
  } catch (error) {
    console.error('Get published content error:', error);
    res.status(500).json({ status: 500, message: 'Internal server error' });
  }
};

// ── Public: one page's published content ────────────────────────────────────
export const getPublishedPage = async (req: Request, res: Response) => {
  try {
    const pageKey = String(req.params.pageKey);
    if (!isContentPageKey(pageKey)) return res.status(404).json({ status: 404, message: 'Page not found' });

    const page = await ContentPage.findOne({ key: pageKey, version: { $gt: 0 } }).select('published version');

    res.set('Cache-Control', 'public, max-age=30, stale-while-revalidate=120');
    res.json({
      status: 200,
      message: 'Content retrieved successfully',
      data: page?.published ?? {},
      meta: { version: page?.version ?? 0 },
    });
  } catch (error) {
    console.error('Get published page error:', error);
    res.status(500).json({ status: 500, message: 'Internal server error' });
  }
};

// ── Admin: list every CMS page with its publish status ──────────────────────
// Includes the draft (sparse, small) so the admin page list can show Bangla
// completeness without one request per page.
export const listContentPages = async (_req: Request, res: Response) => {
  try {
    const pages = await ContentPage.find().select('-published');
    const byKey = new Map(pages.map((p) => [p.key, p]));

    const data = CONTENT_PAGE_KEYS.map((key) => {
      const page = byKey.get(key) ?? null;
      const { published, ...rest } = serializePage(key, page);
      return rest;
    });

    res.json({ status: 200, message: 'Content pages retrieved successfully', data });
  } catch (error) {
    console.error('List content pages error:', error);
    res.status(500).json({ status: 500, message: 'Internal server error' });
  }
};

// ── Admin: one page with draft + published data ─────────────────────────────
export const getContentPageAdmin = async (req: Request, res: Response) => {
  try {
    const pageKey = req.params.pageKey as ContentPageKey;
    const page = await ContentPage.findOne({ key: pageKey });
    res.json({ status: 200, message: 'Content page retrieved', data: serializePage(pageKey, page) });
  } catch (error) {
    console.error('Get content page error:', error);
    res.status(500).json({ status: 500, message: 'Internal server error' });
  }
};

// ── Admin: save draft (replaces the whole draft) ─────────────────────────────
export const saveContentDraft = async (req: AuthRequest, res: Response) => {
  try {
    const pageKey = req.params.pageKey as ContentPageKey;

    const parsed = validatePageData(pageKey, req.body.data);
    if (!parsed.success) {
      return res.status(400).json({ message: 'Validation failed', errors: formatZodIssues(parsed.error) });
    }

    const existing = await ContentPage.findOne({ key: pageKey }).select('published');
    const page = await ContentPage.findOneAndUpdate(
      { key: pageKey },
      {
        $set: {
          draft: parsed.data,
          hasUnpublishedChanges: !isSameContent(parsed.data, existing?.published),
          draftUpdatedAt: new Date(),
          draftUpdatedBy: req.user._id,
          draftUpdatedByName: req.user.name,
        },
      },
      { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true }
    );

    res.json({ status: 200, message: 'Draft saved successfully', data: serializePage(pageKey, page) });
  } catch (error) {
    console.error('Save content draft error:', error);
    res.status(500).json({ status: 500, message: 'Internal server error' });
  }
};

// ── Admin: publish the current draft ─────────────────────────────────────────
export const publishContentPage = async (req: AuthRequest, res: Response) => {
  try {
    const pageKey = req.params.pageKey as ContentPageKey;

    const page = await ContentPage.findOne({ key: pageKey });
    if (!page || !page.hasUnpublishedChanges) {
      return res.status(400).json({ status: 400, message: 'There are no unpublished changes' });
    }

    // Re-validate: the schema may have changed since the draft was saved
    const parsed = validatePageData(pageKey, page.draft);
    if (!parsed.success) {
      return res.status(400).json({ message: 'Validation failed', errors: formatZodIssues(parsed.error) });
    }

    const nextVersion = page.version + 1;
    const now = new Date();

    // Conditional on the version we read, so two concurrent publishes can't both win
    const updated = await ContentPage.findOneAndUpdate(
      { _id: page._id, version: page.version },
      {
        $set: {
          draft: parsed.data,
          published: parsed.data,
          version: nextVersion,
          hasUnpublishedChanges: false,
          publishedAt: now,
          publishedBy: req.user._id,
          publishedByName: req.user.name,
        },
      },
      { returnDocument: 'after' }
    );
    if (!updated) {
      return res.status(409).json({ status: 409, message: 'This page was just published by someone else. Reload and try again.' });
    }

    await ContentRevision.create({
      pageKey,
      version: nextVersion,
      data: parsed.data,
      publishedBy: req.user._id,
      publishedByName: req.user.name,
    });

    // Keep only the most recent revisions
    const stale = await ContentRevision.find({ pageKey })
      .sort({ version: -1 })
      .skip(MAX_REVISIONS_PER_PAGE)
      .select('_id');
    if (stale.length) await ContentRevision.deleteMany({ _id: { $in: stale.map((r) => r._id) } });

    void notifyContentPublished(pageKey);

    res.json({ status: 200, message: 'Page published successfully', data: serializePage(pageKey, updated) });
  } catch (error) {
    console.error('Publish content page error:', error);
    res.status(500).json({ status: 500, message: 'Internal server error' });
  }
};

// ── Admin: discard draft changes (draft ← published) ────────────────────────
export const discardContentDraft = async (req: AuthRequest, res: Response) => {
  try {
    const pageKey = req.params.pageKey as ContentPageKey;

    const page = await ContentPage.findOne({ key: pageKey });
    if (!page || !page.hasUnpublishedChanges) {
      return res.status(400).json({ status: 400, message: 'There are no unpublished changes' });
    }

    page.draft = page.published ?? {};
    page.hasUnpublishedChanges = false;
    page.draftUpdatedAt = new Date();
    page.draftUpdatedBy = req.user._id;
    page.draftUpdatedByName = req.user.name;
    page.markModified('draft');
    await page.save();

    res.json({ status: 200, message: 'Draft changes discarded', data: serializePage(pageKey, page) });
  } catch (error) {
    console.error('Discard content draft error:', error);
    res.status(500).json({ status: 500, message: 'Internal server error' });
  }
};

// ── Admin: revision history (metadata only) ─────────────────────────────────
export const listContentRevisions = async (req: Request, res: Response) => {
  try {
    const pageKey = req.params.pageKey as ContentPageKey;
    const revisions = await ContentRevision.find({ pageKey })
      .select('version publishedByName createdAt')
      .sort({ version: -1 });

    res.json({ status: 200, message: 'Revisions retrieved successfully', data: revisions });
  } catch (error) {
    console.error('List content revisions error:', error);
    res.status(500).json({ status: 500, message: 'Internal server error' });
  }
};

// ── Admin: one revision with its data (for preview / compare) ───────────────
export const getContentRevision = async (req: Request, res: Response) => {
  try {
    const pageKey = req.params.pageKey as ContentPageKey;
    const revision = await ContentRevision.findOne({ pageKey, version: Number(req.params.version) });
    if (!revision) return res.status(404).json({ status: 404, message: 'Revision not found' });

    res.json({ status: 200, message: 'Revision retrieved', data: revision });
  } catch (error) {
    console.error('Get content revision error:', error);
    res.status(500).json({ status: 500, message: 'Internal server error' });
  }
};

// ── Admin: restore a revision into the draft (publish separately) ───────────
export const restoreContentRevision = async (req: AuthRequest, res: Response) => {
  try {
    const pageKey = req.params.pageKey as ContentPageKey;
    const revision = await ContentRevision.findOne({ pageKey, version: Number(req.params.version) });
    if (!revision) return res.status(404).json({ status: 404, message: 'Revision not found' });

    const parsed = validatePageData(pageKey, revision.data);
    if (!parsed.success) {
      return res.status(400).json({
        message: 'This revision no longer matches the current content format',
        errors: formatZodIssues(parsed.error),
      });
    }

    const existing = await ContentPage.findOne({ key: pageKey }).select('published');
    const page = await ContentPage.findOneAndUpdate(
      { key: pageKey },
      {
        $set: {
          draft: parsed.data,
          hasUnpublishedChanges: !isSameContent(parsed.data, existing?.published),
          draftUpdatedAt: new Date(),
          draftUpdatedBy: req.user._id,
          draftUpdatedByName: req.user.name,
        },
      },
      { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true }
    );

    res.json({
      status: 200,
      message: `Version ${revision.version} restored to draft. Publish to make it live.`,
      data: serializePage(pageKey, page),
    });
  } catch (error) {
    console.error('Restore content revision error:', error);
    res.status(500).json({ status: 500, message: 'Internal server error' });
  }
};
