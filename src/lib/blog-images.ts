type BlogImageSource = {
  category?: string;
  image?: string;
  slug?: string;
  title?: string;
};

const BLOG_IMAGE_FALLBACKS = {
  umrah: "https://images.unsplash.com/photo-1565330770968-0240c0046ce3?w=1000&h=620&fit=crop&q=80",
  hotels: "https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=1000&h=620&fit=crop&q=80",
  visa: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=1000&h=620&fit=crop&q=80",
  default: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1000&h=620&fit=crop&q=80",
};

export function getBlogImage(post: BlogImageSource) {
  if (post.image) return post.image;
  const key = `${post.category ?? ""} ${post.slug ?? ""} ${post.title ?? ""}`.toLowerCase();
  if (key.includes("umrah") || key.includes("haram") || key.includes("makkah")) return BLOG_IMAGE_FALLBACKS.umrah;
  if (key.includes("hotel")) return BLOG_IMAGE_FALLBACKS.hotels;
  if (key.includes("visa")) return BLOG_IMAGE_FALLBACKS.visa;
  return BLOG_IMAGE_FALLBACKS.default;
}

