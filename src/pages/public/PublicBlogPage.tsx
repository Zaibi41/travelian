import { useCallback, useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import type { BlogPost } from "@/data/models";
import { listBlogPosts } from "@/lib/content-api";
import { getBlogImage } from "@/lib/blog-images";
import { PageHeader } from "@/components/public/PageHeader";
import { BookOpen } from "lucide-react";
import { SEO } from "@/components/SEO";

export default function PublicBlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const loadPosts = useCallback(() => {
    setLoading(true);
    setLoadError(false);
    listBlogPosts("published")
      .then((items) => {
        setPosts(items);
      })
      .catch(() => {
        setPosts([]);
        setLoadError(true);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  // travelian#127: not indexable while there are no articles (still loading, failed or none published).
  const noIndex = loadError || posts.length === 0;

  return (
    <div>
      <SEO breadcrumbs={[{ name: "Travel Guides", path: "/blog" }]}
        title="Travel Guides & Blog | Travelian"
        description="Travel guides for Pakistani travellers: Umrah planning, flight booking tips and hotel recommendations from the Travelian team."
        noIndex={noIndex}
      />
      <PageHeader
        eyebrow="Travel guide"
        icon={<BookOpen className="h-5 w-5" />}
        title="Travelian Travel Blog"
        tagline="Practical guides on flights, Umrah, hotels and destinations — written for Pakistani travellers."
      />


      <div className="travelian-container py-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {!loading && loadError && (
            <div role="status" className="col-span-full rounded-xl border bg-card p-8 text-center">
              <p className="text-sm font-medium text-foreground">Unable to load travel guides right now.</p>
              <p className="mt-1 text-sm text-muted-foreground">Please try again shortly or explore flights and hotels directly.</p>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                <Button type="button" variant="outline" onClick={loadPosts}>Try again</Button>
                <Button asChild><Link to="/flights-search">Search Flights</Link></Button>
              </div>
            </div>
          )}
          {!loading && !loadError && posts.length === 0 && (
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

