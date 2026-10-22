import { notFound } from "next/navigation";
import { BlogArticle } from "../../../components/BlogArticle";
import { JsonLd } from "../../../components/JsonLd";
import { getPublishedBlog } from "../../../lib/blogs";
import { blogPostingJsonLd } from "../../../lib/structuredData";

// Rendered on the server (5-minute ISR) so the article text is in the HTML.
// An unknown or unpublished slug is a real 404, not a "not found" message.
export default async function BlogDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const blog = await getPublishedBlog(slug);
  if (!blog) notFound();

  return (
    <>
      <JsonLd data={blogPostingJsonLd(blog)} />
      <BlogArticle blog={blog} />
    </>
  );
}
