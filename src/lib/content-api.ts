import { mockBlogPosts, type BlogPost } from "@/data/mock";

const API_BASE_URL = (import.meta.env.VITE_TRAVELIAN_API_BASE_URL || "https://api.travelian.pk").replace(/\/$/, "");

export async function listBlogPosts(status?: BlogPost["status"]): Promise<BlogPost[]> {
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  const response = await fetch(`${API_BASE_URL}/content/blog-posts${query}`);
  if (!response.ok) throw new Error("Unable to load blog posts");
  const payload = await response.json();
  return payload.items || [];
}

export async function getBlogPost(slug: string): Promise<BlogPost | null> {
  const response = await fetch(`${API_BASE_URL}/content/blog-posts/${encodeURIComponent(slug)}`);
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("Unable to load blog post");
  const payload = await response.json();
  return payload.item || null;
}

export async function saveBlogPost(post: Partial<BlogPost> & { title: string }): Promise<BlogPost> {
  const response = await fetch(`${API_BASE_URL}/content/blog-posts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(post),
  });
  if (!response.ok) throw new Error("Unable to save blog post");
  const payload = await response.json();
  return payload.item;
}

export async function deleteBlogPost(slug: string) {
  const response = await fetch(`${API_BASE_URL}/content/blog-posts/${encodeURIComponent(slug)}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Unable to delete blog post");
}

export function fallbackBlogPosts(status?: BlogPost["status"]) {
  return status ? mockBlogPosts.filter(post => post.status === status) : mockBlogPosts;
}
