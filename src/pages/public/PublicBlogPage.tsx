import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import type { BlogPost } from "@/data/mock";
import { listBlogPosts } from "@/lib/content-api";
import { getBlogImage } from "@/lib/blog-images";

export default function PublicBlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listBlogPosts("published")
      .then(setPosts)
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <section className="bg-gradient-to-br from-sidebar to-sidebar-accent py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-3xl md:text-4xl font-bold font-display text-sidebar-accent-foreground mb-2">Travel Blog</h1>
          <p className="text-sidebar-muted">Tips, guides, and inspiration for your next adventure</p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {!loading && posts.length === 0 && (
            <div className="col-span-full rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
              No published articles are available yet.
            </div>
          )}
          {posts.map(post => (
            <Link key={post.postId} to={`/blog/${post.slug}`} aria-label={post.title}>
              <Card className="overflow-hidden hover:shadow-elevated transition-all group cursor-pointer h-full">
                <div className="h-48 overflow-hidden bg-muted">
                  <img
                    src={getBlogImage(post)}
                    alt={post.title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                </div>
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="secondary" className="text-xs">{post.category}</Badge>
                    <span className="text-xs text-muted-foreground">{post.publishedAt}</span>
                  </div>
                  <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">{post.title}</h3>
                  <p className="text-sm text-muted-foreground mt-2 line-clamp-3">{post.excerpt}</p>
                  <div className="flex flex-wrap gap-1 mt-3">
                    {post.tags.map(tag => <Badge key={tag} variant="outline" className="text-xs">#{tag}</Badge>)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-4">By {post.author}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

