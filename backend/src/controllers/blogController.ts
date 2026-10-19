import { Request, Response } from 'express';
import Blog from '../models/Blog';
import { parsePagination, toCountMap } from '../utils/pagination';
import { recordAudit } from '../utils/audit';

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

interface AuthRequest extends Request {
  user?: any;
}

// ── List blogs (admin: all; public: published only) ─────────────────────────
export const listBlogs = async (req: Request, res: Response) => {
  try {
    const { status, category } = req.query;
    // The sitemap asks for every published post in one request
    const { page, limit, skip } = parsePagination(req.query, { maxLimit: 1000 });
    const search = typeof req.query.search === 'string' ? req.query.search.trim().slice(0, 100) : '';

    const scope: Record<string, any> = {};
    // The public route has no req.user; only admins may list drafts
    const isAdmin = (req as Request & { user?: { role?: string } }).user?.role === 'admin';
    if (!isAdmin) scope.status = 'published';
    if (typeof category === 'string' && category && category !== 'all') scope.category = category;
    if (search) {
      const rx = new RegExp(escapeRegex(search), 'i');
      scope.$or = [{ title: rx }, { excerpt: rx }, { tags: rx }];
    }
    const filter: Record<string, any> =
      isAdmin && typeof status === 'string' && status ? { ...scope, status } : scope;

    const [blogs, total, byStatus] = await Promise.all([
      Blog.find(filter)
        .select('title slug excerpt category tags status authorName readingTimeMinutes publishedAt coverImageUrl createdAt')
        .sort({ createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit),
      Blog.countDocuments(filter),
      // Admin stat cards: per-status totals that ignore the status filter
      isAdmin ? Blog.aggregate<{ _id: string; n: number }>([{ $match: scope }, { $group: { _id: '$status', n: { $sum: 1 } } }]) : [],
    ]);

    const counts = toCountMap(byStatus);

    res.json({
      status: 200,
      message: 'Blogs retrieved successfully',
      data: blogs,
      meta: {
        total,
        page,
        limit,
        ...(isAdmin ? { counts: { all: Object.values(counts).reduce((a, b) => a + b, 0), ...counts } } : {}),
      },
    });
  } catch (error) {
    console.error('List blogs error:', error);
    res.status(500).json({ status: 500, message: 'Internal server error' });
  }
};

// ── Get single blog by ID (admin) ────────────────────────────────────────────
export const getBlogById = async (req: Request, res: Response) => {
  try {
    const blog = await Blog.findById(req.params.blogId);
    if (!blog) return res.status(404).json({ status: 404, message: 'Blog not found' });
    res.json({ status: 200, message: 'Blog retrieved', data: blog });
  } catch (error) {
    console.error('Get blog error:', error);
    res.status(500).json({ status: 500, message: 'Internal server error' });
  }
};

// ── Get single blog by slug (public) ─────────────────────────────────────────
export const getBlogBySlug = async (req: Request, res: Response) => {
  try {
    const blog = await Blog.findOne({ slug: req.params.slug, status: 'published' });
    if (!blog) return res.status(404).json({ status: 404, message: 'Blog not found' });
    res.json({ status: 200, message: 'Blog retrieved', data: blog });
  } catch (error) {
    console.error('Get blog by slug error:', error);
    res.status(500).json({ status: 500, message: 'Internal server error' });
  }
};

// ── Create blog ───────────────────────────────────────────────────────────────
export const createBlog = async (req: AuthRequest, res: Response) => {
  try {
    const { title, excerpt, category, tags, blocks, status, coverImageUrl } = req.body;

    if (!title || !excerpt || !category) {
      return res.status(400).json({ status: 400, message: 'title, excerpt, and category are required' });
    }

    const blog = new Blog({
      title,
      excerpt,
      category,
      tags: tags ?? [],
      blocks: blocks ?? [],
      status: status ?? 'draft',
      coverImageUrl: coverImageUrl ?? undefined,
      authorId: req.user._id,
      authorName: req.user.name,
    });

    await blog.save();
    recordAudit(req, {
      action: 'blog.created',
      category: 'blog',
      targetType: 'blog',
      targetId: blog._id,
      targetLabel: blog.title,
      summary: `Created ${blog.status} blog post "${blog.title}"`,
      metadata: { status: blog.status },
    });
    res.status(201).json({ status: 201, message: 'Blog created successfully', data: blog });
  } catch (error) {
    console.error('Create blog error:', error);
    res.status(500).json({ status: 500, message: 'Internal server error' });
  }
};

// ── Update blog ───────────────────────────────────────────────────────────────
export const updateBlog = async (req: AuthRequest, res: Response) => {
  try {
    const { blogId } = req.params;
    const { title, excerpt, category, tags, blocks, status, coverImageUrl } = req.body;

    const blog = await Blog.findById(blogId);
    if (!blog) return res.status(404).json({ status: 404, message: 'Blog not found' });
    const previousStatus = blog.status;

    if (title !== undefined) blog.title = title;
    if (excerpt !== undefined) blog.excerpt = excerpt;
    if (category !== undefined) blog.category = category;
    if (tags !== undefined) blog.tags = tags;
    if (blocks !== undefined) blog.blocks = blocks;
    if (status !== undefined) blog.status = status;
    if (coverImageUrl !== undefined) blog.coverImageUrl = coverImageUrl;

    const changed = blog.modifiedPaths().filter((p) => !p.includes('.'));
    const statusChanged = blog.isModified('status');
    await blog.save();
    const published = statusChanged && blog.status === 'published';
    recordAudit(req, {
      action: published ? 'blog.published' : statusChanged ? 'blog.status_changed' : 'blog.updated',
      category: 'blog',
      targetType: 'blog',
      targetId: blog._id,
      targetLabel: blog.title,
      summary: published
        ? `Published blog post "${blog.title}"`
        : statusChanged
          ? `Changed blog post "${blog.title}" to ${blog.status}`
          : `Updated blog post "${blog.title}"`,
      metadata: { fields: changed, ...(statusChanged ? { from: previousStatus, to: blog.status } : {}) },
    });
    res.json({ status: 200, message: 'Blog updated successfully', data: blog });
  } catch (error) {
    console.error('Update blog error:', error);
    res.status(500).json({ status: 500, message: 'Internal server error' });
  }
};

// ── Delete blog ───────────────────────────────────────────────────────────────
export const deleteBlog = async (req: AuthRequest, res: Response) => {
  try {
    const blog = await Blog.findByIdAndDelete(req.params.blogId);
    if (!blog) return res.status(404).json({ status: 404, message: 'Blog not found' });
    recordAudit(req, {
      action: 'blog.deleted',
      category: 'blog',
      targetType: 'blog',
      targetId: blog._id,
      targetLabel: blog.title,
      summary: `Deleted blog post "${blog.title}"`,
    });
    res.json({ status: 200, message: 'Blog deleted successfully' });
  } catch (error) {
    console.error('Delete blog error:', error);
    res.status(500).json({ status: 500, message: 'Internal server error' });
  }
};
