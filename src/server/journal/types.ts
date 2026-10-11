export type ArticleStatus = "draft" | "published" | "archived";

export interface ArticleAuthor {
  id: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  role: string;
  bio?: string | null;
}

export interface JournalArticle {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  coverImageUrl: string | null;
  content: Record<string, unknown>;
  authorId: string;
  categoryId: string | null;
  categoryName: string | null;
  categoryColor: string | null;
  tags: string[];
  status: ArticleStatus;
  readingTimeMinutes: number;
  featured: boolean;
  publishedAt: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  createdAt: string;
  updatedAt: string;
  author: ArticleAuthor;
}

export interface SaveArticleInput {
  id?: string;
  title: string;
  slug?: string;
  excerpt?: string | null;
  coverImageUrl?: string | null;
  content: Record<string, unknown>;
  categoryId?: string | null;
  tags?: string[];
  status?: ArticleStatus;
  featured?: boolean;
  seoTitle?: string | null;
  seoDescription?: string | null;
}
