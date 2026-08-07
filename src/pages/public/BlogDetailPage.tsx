import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, User } from "lucide-react";
import type { BlogPost } from "@/data/models";
import { SEO } from "@/components/SEO";
import { getBlogPost } from "@/lib/content-api";
import { getBlogImage } from "@/lib/blog-images";

export default function BlogDetailPage() {
  const { slug } = useParams();
  const [post, setPost] = useState<BlogPost | null | undefined>(undefined);

  useEffect(() => {
    if (!slug) return;
    getBlogPost(slug)
      .then(item => setPost(item && item.status === "published" ? item : null))
      .catch(() => setPost(null));
  }, [slug]);

  if (post === undefined) {
    return <div className="max-w-3xl mx-auto px-4 py-20 text-center text-muted-foreground">Loading article...</div>;
  }

  if (!post) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-bold">Article not found</h1>
        <Link to="/blog"><Button className="mt-6">Back to blog</Button></Link>
      </div>
    );
  }

  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <SEO title={`${post.title} | Travelian Blog`} description={post.excerpt} />
      <Link to="/blog" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4 mr-1" /> All articles
      </Link>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Badge variant="secondary">{post.category}</Badge>
        <span className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" /> {post.publishedAt}</span>
        <span className="text-xs text-muted-foreground flex items-center gap-1"><User className="h-3 w-3" /> {post.author}</span>
      </div>
      <h1 className="text-3xl md:text-4xl font-bold font-display mt-3">{post.title}</h1>
      <p className="text-lg text-muted-foreground mt-3">{post.excerpt}</p>
      <div className="h-64 mt-6 overflow-hidden rounded-2xl bg-muted">
        <img src={getBlogImage(post)} alt={post.title} className="h-full w-full object-cover" />
      </div>
      <div className="prose prose-sm md:prose-base max-w-none mt-8 text-foreground leading-relaxed space-y-4">
        <p>{post.content || post.excerpt}</p>
        <p>
          At Travelian we curate every detail of your journey, from flights and hotels to visas and ground transport.
          This article covers the essentials you need to plan with confidence.
        </p>
        <h2 className="text-xl font-semibold mt-6">Key takeaways</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>Plan early to secure the best rates and availability.</li>
          <li>Keep documents organized and verified before departure.</li>
          <li>Talk to our specialists for tailored recommendations.</li>
        </ul>
      </div>
      <div className="flex flex-wrap gap-2 mt-8">
        {post.tags.map(t => <Badge key={t} variant="outline" className="text-xs">#{t}</Badge>)}
      </div>
    </article>
  );
}

