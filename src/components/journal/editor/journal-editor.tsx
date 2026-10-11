"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { getEditorExtensions } from "./extensions";
import { EditorToolbar } from "./editor-toolbar";
import { SlashMenu } from "./slash-menu";
import { MathModal } from "./math-modal";
import { CalloutModal } from "./callout-modal";
import { VideoModal } from "./video-modal";
import { ImageModal } from "./image-modal";
import { StudioHeader } from "./studio-header";
import { ArticleSettingsDrawer } from "./article-settings-drawer";
import { ArticleRenderer } from "../renderer/article-renderer";
import { TableOfContents, extractTocFromDoc } from "../renderer/table-of-contents";
import type { JournalArticle, ArticleStatus } from "@/server/journal/types";
import type { CalloutVariant } from "../renderer/callout-block";
import { slugify } from "@/server/journal/validation";

interface JournalEditorProps {
  initialArticle?: JournalArticle | null;
  isAdmin?: boolean;
}

export function JournalEditor({ initialArticle, isAdmin = false }: JournalEditorProps) {
  const router = useRouter();

  // Article state
  const [articleId, setArticleId] = useState<string | undefined>(initialArticle?.id);
  const [title, setTitle] = useState(initialArticle?.title || "");
  const [slug, setSlug] = useState(initialArticle?.slug || "");
  const [excerpt, setExcerpt] = useState(initialArticle?.excerpt || "");
  const [categoryId, setCategoryId] = useState(initialArticle?.categoryId || "");
  const [tags, setTags] = useState<string[]>(initialArticle?.tags || []);
  const [coverImageUrl, setCoverImageUrl] = useState(initialArticle?.coverImageUrl || "");
  const [status, setStatus] = useState<ArticleStatus>(initialArticle?.status || "draft");
  const [featured, setFeatured] = useState(Boolean(initialArticle?.featured));
  const [seoTitle, setSeoTitle] = useState(initialArticle?.seoTitle || "");
  const [seoDescription, setSeoDescription] = useState(initialArticle?.seoDescription || "");

  // UI state
  const [isPreview, setIsPreview] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved" | "error">("saved");
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Modals state
  const [mathModalOpen, setMathModalOpen] = useState(false);
  const [calloutModalOpen, setCalloutModalOpen] = useState(false);
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [slashMenuOpen, setSlashMenuOpen] = useState(false);

  // TipTap Editor instance
  const editor = useEditor({
    immediatelyRender: false,
    extensions: getEditorExtensions(),
    content: initialArticle?.content || {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "" }],
        },
      ],
    },
    onUpdate: () => {
      setSaveStatus("unsaved");
    },
  });

  // Track key down for slash command
  useEffect(() => {
    if (!editor) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "/" && !slashMenuOpen) {
        // Check if cursor is on an empty line or space
        const { selection } = editor.state;
        const textBefore = editor.state.doc.textBetween(
          Math.max(0, selection.from - 1),
          selection.from,
          "\n"
        );
        if (textBefore === "" || textBefore === "\n" || textBefore === " ") {
          setTimeout(() => setSlashMenuOpen(true), 50);
        }
      }
    };

    const dom = editor.view.dom;
    dom.addEventListener("keydown", handleKeyDown);
    return () => dom.removeEventListener("keydown", handleKeyDown);
  }, [editor, slashMenuOpen]);

  // Unsaved changes protection
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (saveStatus === "unsaved") {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [saveStatus]);

  // Save handler
  const saveArticlePayload = useCallback(
    async (targetStatus?: ArticleStatus): Promise<JournalArticle | null> => {
      if (!editor) return null;
      if (!title.trim()) {
        setErrorMessage("Please enter an article title.");
        return null;
      }

      setErrorMessage("");
      setSaveStatus("saving");
      setIsSaving(true);

      const resolvedStatus = targetStatus || status;
      const content = editor.getJSON();
      const resolvedSlug = slug.trim() || slugify(title);

      const payload = {
        id: articleId,
        title: title.trim(),
        slug: resolvedSlug,
        excerpt: excerpt.trim() || undefined,
        categoryId: categoryId || undefined,
        tags,
        coverImageUrl: coverImageUrl || undefined,
        status: resolvedStatus,
        featured,
        seoTitle: seoTitle.trim() || undefined,
        seoDescription: seoDescription.trim() || undefined,
        content,
      };

      try {
        const url = articleId ? `/api/v1/journal/articles/${articleId}` : "/api/v1/journal/articles";
        const method = articleId ? "PATCH" : "POST";

        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error?.message || "Failed to save article.");
        }

        const saved = json.data as JournalArticle;
        if (!articleId && saved?.id) {
          setArticleId(saved.id);
          window.history.replaceState(null, "", `/journal/studio/${saved.id}`);
        }
        setStatus(saved.status);
        setSlug(saved.slug);
        setSaveStatus("saved");
        return saved;
      } catch (err: unknown) {
        setSaveStatus("error");
        const msg = err instanceof Error ? err.message : "Failed to save article.";
        setErrorMessage(msg);
        return null;
      } finally {
        setIsSaving(false);
      }
    },
    [
      editor,
      title,
      slug,
      excerpt,
      categoryId,
      tags,
      coverImageUrl,
      status,
      featured,
      seoTitle,
      seoDescription,
      articleId,
    ]
  );

  // Debounced autosave (after 2 seconds of inactivity)
  const autosaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (saveStatus !== "unsaved") return;

    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(() => {
      if (title.trim()) {
        void saveArticlePayload();
      }
    }, 2500);

    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
  }, [saveStatus, title, saveArticlePayload]);

  async function handlePublish() {
    const saved = await saveArticlePayload("published");
    if (saved) {
      setSuccessMessage("Article published successfully!");
      setTimeout(() => setSuccessMessage(""), 4000);
    }
  }

  async function handleUnpublish() {
    const saved = await saveArticlePayload("draft");
    if (saved) {
      setSuccessMessage("Article moved back to drafts.");
      setTimeout(() => setSuccessMessage(""), 4000);
    }
  }

  async function handleDelete() {
    if (!articleId) return;
    const confirm = window.confirm("Are you sure you want to delete this article? This action cannot be undone.");
    if (!confirm) return;

    try {
      const res = await fetch(`/api/v1/journal/articles/${articleId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete article.");
      router.push("/journal");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete article.";
      setErrorMessage(msg);
    }
  }

  // Block insertion helpers
  function insertMath(latex: string, displayMode: boolean) {
    if (!editor) return;
    editor
      .chain()
      .focus()
      .insertContent({
        type: "equation",
        attrs: { latex, displayMode },
      })
      .run();
  }

  function insertCallout(variant: CalloutVariant, title: string) {
    if (!editor) return;
    editor
      .chain()
      .focus()
      .insertContent({
        type: "callout",
        attrs: { variant, title },
        content: [{ type: "paragraph", content: [{ type: "text", text: "Add your callout text here..." }] }],
      })
      .run();
  }

  function insertVideo(src: string, videoTitle?: string, caption?: string) {
    if (!editor) return;
    editor
      .chain()
      .focus()
      .insertContent({
        type: "videoEmbed",
        attrs: { src, title: videoTitle, caption },
      })
      .run();
  }

  function insertImage(src: string, alt?: string, caption?: string) {
    if (!editor) return;
    editor
      .chain()
      .focus()
      .insertContent({
        type: "image",
        attrs: { src, alt: alt || "", caption: caption || "" },
      })
      .run();
  }

  const currentDocJson = editor?.getJSON() || { type: "doc", content: [] };
  const tocItems = extractTocFromDoc(currentDocJson);

  return (
    <div className="journal-studio-root">
      <StudioHeader
        status={status}
        saveStatus={saveStatus}
        isPreview={isPreview}
        onTogglePreview={() => setIsPreview((v) => !v)}
        onOpenSettings={() => setSettingsOpen(true)}
        onSaveDraft={() => void saveArticlePayload("draft")}
        onPublish={handlePublish}
        onUnpublish={handleUnpublish}
        onDelete={handleDelete}
        isSaving={isSaving}
        canDelete={Boolean(articleId)}
      />

      {/* Messages */}
      {errorMessage && (
        <div className="journal-banner journal-banner-error" role="alert">
          <span>{errorMessage}</span>
          <button type="button" onClick={() => setErrorMessage("")}>Dismiss</button>
        </div>
      )}
      {successMessage && (
        <div className="journal-banner journal-banner-success" role="status">
          <span>{successMessage}</span>
          <button type="button" onClick={() => setSuccessMessage("")}>Dismiss</button>
        </div>
      )}

      {isPreview ? (
        /* ================= PREVIEW MODE ================= */
        <main className="journal-reading-layout journal-preview-mode">
          <div className="journal-reading-container">
            <div className="journal-reader-header">
              <div className="journal-meta-row">
                <span className="journal-category-badge">Preview</span>
                <span className="journal-reading-time">Live reader simulation</span>
              </div>
              <h1 className="journal-reader-title">{title || "Untitled Article"}</h1>
              {excerpt && <p className="journal-reader-excerpt">{excerpt}</p>}
            </div>

            {coverImageUrl && (
              <figure className="journal-reader-cover">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={coverImageUrl} alt={title} />
              </figure>
            )}

            <div className="journal-reading-split">
              <aside className="journal-reading-sidebar">
                <TableOfContents items={tocItems} />
              </aside>
              <div className="journal-reading-main">
                <ArticleRenderer content={currentDocJson} />
              </div>
            </div>
          </div>
        </main>
      ) : (
        /* ================= EDIT MODE ================= */
        <div className="journal-studio-canvas">
          <div className="journal-studio-container">
            {/* Title Input */}
            <div className="journal-title-row">
              <input
                type="text"
                className="journal-title-input"
                placeholder="Article Title..."
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setSaveStatus("unsaved");
                  if (!slug) {
                    setSlug(slugify(e.target.value));
                  }
                }}
              />
            </div>

            {/* Quick Excerpt Preview / Add */}
            <div className="journal-subtitle-row">
              <input
                type="text"
                className="journal-subtitle-input"
                placeholder="Short subtitle or excerpt..."
                value={excerpt}
                onChange={(e) => {
                  setExcerpt(e.target.value);
                  setSaveStatus("unsaved");
                }}
              />
            </div>

            {/* Formatting Toolbar */}
            <EditorToolbar
              editor={editor}
              onOpenMath={() => setMathModalOpen(true)}
              onOpenCallout={() => setCalloutModalOpen(true)}
              onOpenImage={() => setImageModalOpen(true)}
              onOpenVideo={() => setVideoModalOpen(true)}
              onOpenAddBlock={() => setSlashMenuOpen(true)}
            />

            {/* Rich Editor Canvas */}
            <div className="journal-editor-canvas-wrapper" onClick={() => setSlashMenuOpen(false)}>
              <EditorContent editor={editor} className="journal-tiptap-content" />

              {/* Add Block Button floating in canvas */}
              <button
                type="button"
                className="journal-add-block-float"
                onClick={(e) => {
                  e.stopPropagation();
                  setSlashMenuOpen((v) => !v);
                }}
                title="Add Block (or type /)"
              >
                <Plus size={16} />
                <span>Add Block</span>
              </button>

              {/* Slash Command Menu */}
              <SlashMenu
                editor={editor}
                isOpen={slashMenuOpen}
                onClose={() => setSlashMenuOpen(false)}
                onOpenMath={() => setMathModalOpen(true)}
                onOpenCallout={() => setCalloutModalOpen(true)}
                onOpenImage={() => setImageModalOpen(true)}
                onOpenVideo={() => setVideoModalOpen(true)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Settings Drawer */}
      <ArticleSettingsDrawer
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        title={title}
        slug={slug}
        onSlugChange={(val) => {
          setSlug(val);
          setSaveStatus("unsaved");
        }}
        excerpt={excerpt}
        onExcerptChange={(val) => {
          setExcerpt(val);
          setSaveStatus("unsaved");
        }}
        categoryId={categoryId}
        onCategoryChange={(val) => {
          setCategoryId(val);
          setSaveStatus("unsaved");
        }}
        tags={tags}
        onTagsChange={(val) => {
          setTags(val);
          setSaveStatus("unsaved");
        }}
        coverImageUrl={coverImageUrl}
        onCoverImageChange={(val) => {
          setCoverImageUrl(val);
          setSaveStatus("unsaved");
        }}
        featured={featured}
        onFeaturedChange={(val) => {
          setFeatured(val);
          setSaveStatus("unsaved");
        }}
        seoTitle={seoTitle}
        onSeoTitleChange={(val) => {
          setSeoTitle(val);
          setSaveStatus("unsaved");
        }}
        seoDescription={seoDescription}
        onSeoDescriptionChange={(val) => {
          setSeoDescription(val);
          setSaveStatus("unsaved");
        }}
        isAdmin={isAdmin}
      />

      {/* Modals */}
      <MathModal
        isOpen={mathModalOpen}
        onClose={() => setMathModalOpen(false)}
        onInsert={insertMath}
      />
      <CalloutModal
        isOpen={calloutModalOpen}
        onClose={() => setCalloutModalOpen(false)}
        onInsert={insertCallout}
      />
      <VideoModal
        isOpen={videoModalOpen}
        onClose={() => setVideoModalOpen(false)}
        onInsert={insertVideo}
      />
      <ImageModal
        isOpen={imageModalOpen}
        onClose={() => setImageModalOpen(false)}
        onInsert={insertImage}
      />
    </div>
  );
}
