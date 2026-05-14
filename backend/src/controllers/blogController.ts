import { Request, Response } from 'express';
import Blog from '../models/Blog';

interface AuthRequest extends Request {
  user?: any;
}

// ── List blogs (admin: all; public: published only) ─────────────────────────
export const listBlogs = async (req: Request, res: Response) => {
  try {
    const { status, category, page = '1', limit = '20' } = req.query;
    const filter: Record<string, any> = {};
    if (status) filter.status = status;
    if (category) filter.category = category;

    const skip = (Number(page) - 1) * Number(limit);
    const [blogs, total] = await Promise.all([
      Blog.find(filter)
        .select('title slug excerpt category tags status authorName readingTimeMinutes publishedAt coverImageUrl createdAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Blog.countDocuments(filter),
    ]);

    res.json({
      status: 200,
      message: 'Blogs retrieved successfully',
      data: blogs,
      meta: { total, page: Number(page), limit: Number(limit) },
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

    if (title !== undefined) blog.title = title;
    if (excerpt !== undefined) blog.excerpt = excerpt;
    if (category !== undefined) blog.category = category;
    if (tags !== undefined) blog.tags = tags;
    if (blocks !== undefined) blog.blocks = blocks;
    if (status !== undefined) blog.status = status;
    if (coverImageUrl !== undefined) blog.coverImageUrl = coverImageUrl;

    await blog.save();
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
    res.json({ status: 200, message: 'Blog deleted successfully' });
  } catch (error) {
    console.error('Delete blog error:', error);
    res.status(500).json({ status: 500, message: 'Internal server error' });
  }
};
