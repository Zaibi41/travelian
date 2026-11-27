import { PageHeading } from "@/components/admin/TabbedAdminPage";
import { useEffect, useState } from "react";
import { BlogPost } from "@/data/models";
import { Card, CardContent } from "@/components/admin/ui/card";
import { Button } from "@/components/admin/ui/button";
import { Input } from "@/components/admin/ui/field";
import { StatusBadge } from "@/components/StatusBadge";
import { Plus, Search, Pencil, Trash2, PenTool, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/admin/ui/dialog";
import { Label } from "@/components/admin/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/admin/ui/field";
import { useRole } from "@/contexts/RoleContext";
import { toast } from "sonner";
import { deleteBlogPost, listBlogPosts, saveBlogPost } from "@/lib/content-api";

export default function BlogPage() {
  const { currentRole } = useRole();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<BlogPost | null>(null);
  const [form, setForm] = useState({ title: '', slug: '', excerpt: '', content: '', category: '', status: 'draft' as BlogPost['status'], tags: [] as string[] });
  const [tagInput, setTagInput] = useState('');

  const canEdit = currentRole === 'super_admin' || currentRole === 'admin';
  const filtered = posts.filter(p => p.title.toLowerCase().includes(search.toLowerCase()));

  useEffect(() => {
    listBlogPosts()
      .then(setPosts)
      .catch(() => toast.error("Unable to load blog posts from database"));
  }, []);

  const openAdd = () => { setEditing(null); setForm({ title: '', slug: '', excerpt: '', content: '', category: '', status: 'draft', tags: [] }); setDialogOpen(true); };
  const openEdit = (p: BlogPost) => { setEditing(p); setForm(p); setDialogOpen(true); };

  const handleSave = async () => {
    if (!form.title) { toast.error("Title is required"); return; }
    const slug = form.slug || form.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    try {
      const saved = await saveBlogPost({
        ...form,
        slug,
        postId: editing?.postId,
        author: editing?.author || "Admin",
        publishedAt: form.status === 'published' ? (editing?.publishedAt || new Date().toISOString().split('T')[0]) : '',
      });
      if (editing) {
        setPosts(prev => prev.map(p => p.postId === editing.postId ? saved : p));
      } else {
        setPosts(prev => [saved, ...prev]);
      }
      setDialogOpen(false);
      toast.success(editing ? "Post updated" : "Post created");
    } catch {
      toast.error("Unable to save post");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <PageHeading className="text-page-title font-bold font-display">Blog Management</PageHeading>
          <p className="text-body text-muted-foreground">Manage blog posts and articles for the website</p>
        </div>
        {canEdit && <Button onClick={openAdd} className="gradient-primary text-primary-foreground gap-2"><Plus className="h-4 w-4" /> New Post</Button>}
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search posts..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map(post => (
          <Card key={post.postId} className="shadow-card hover:shadow-elevated transition-shadow">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-lg bg-accent flex items-center justify-center shrink-0 mt-0.5">
                    <PenTool className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-display font-bold text-body">{post.title}</p>
                    <p className="text-helper text-muted-foreground mt-0.5">{post.excerpt}</p>
                  </div>
                </div>
                <StatusBadge status={post.status} />
              </div>
              <div className="flex items-center justify-between text-helper text-muted-foreground">
                <span>By {post.author}</span>
                <span>{post.publishedAt || 'Not published'}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex flex-wrap gap-1">
                  <Badge variant="outline" className="text-helper">{post.category}</Badge>
                  {post.tags.slice(0, 2).map(t => <Badge key={t} variant="secondary" className="text-helper">{t}</Badge>)}
                </div>
                {canEdit && (
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm"><Eye className="h-3 w-3" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => openEdit(post)}><Pencil className="h-3 w-3" /></Button>
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={async () => {
                      try {
                        await deleteBlogPost(post.slug);
                        setPosts(prev => prev.filter(p => p.postId !== post.postId));
                        toast.success("Post deleted");
                      } catch {
                        toast.error("Unable to delete post");
                      }
                    }}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-display">{editing ? 'Edit Post' : 'New Blog Post'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Title *</Label><Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Slug</Label><Input value={form.slug} onChange={e => setForm(p => ({ ...p, slug: e.target.value }))} placeholder="auto-generated-from-title" /></div>
            <div className="space-y-2"><Label>Excerpt</Label><Textarea value={form.excerpt} onChange={e => setForm(p => ({ ...p, excerpt: e.target.value }))} rows={2} /></div>
            <div className="space-y-2"><Label>Content</Label><Textarea value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} rows={6} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Category</Label><Input value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} placeholder="e.g. Umrah, Hotels" /></div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v as BlogPost['status'] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Tags</Label>
              <div className="flex gap-2">
                <Input value={tagInput} onChange={e => setTagInput(e.target.value)} placeholder="Add tag" onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (tagInput.trim()) { setForm(p => ({ ...p, tags: [...p.tags, tagInput.trim()] })); setTagInput(''); } } }} />
                <Button variant="outline" type="button" onClick={() => { if (tagInput.trim()) { setForm(p => ({ ...p, tags: [...p.tags, tagInput.trim()] })); setTagInput(''); } }}>Add</Button>
              </div>
              <div className="flex flex-wrap gap-1">{form.tags.map((t, i) => <Badge key={i} variant="secondary" className="gap-1">{t}<button onClick={() => setForm(p => ({ ...p, tags: p.tags.filter((_, idx) => idx !== i) }))}>×</button></Badge>)}</div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={handleSave} className="flex-1 gradient-primary text-primary-foreground">{editing ? 'Update' : 'Create Post'}</Button>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
