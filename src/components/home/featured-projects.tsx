import Link from "next/link";
import { ArrowRight, FolderGit2, Sparkles, ThumbsUp } from "lucide-react";
import type { Project } from "@/lib/supabase-data";

export function FeaturedProjectsSection({
  projects,
  title = "Featured Projects",
  eyebrow = "Built by the Community",
  description = "Real products, experiments, and open-source tools shipped by DropOut College members.",
}: {
  projects: Project[];
  title?: string;
  eyebrow?: string;
  description?: string;
}) {
  if (!projects || projects.length === 0) {
    return null;
  }

  return (
    <section className="section home-projects-section" aria-label="Featured Community Projects">
      <div className="section-heading">
        <div>
          <div className="eyebrow">
            <Sparkles size={11} className="home-hero-sparkle" /> {eyebrow}
          </div>
          <h2>{title}</h2>
          {description && <p className="section-description">{description}</p>}
        </div>
        <Link href="/projects" className="section-link">
          <span>Explore All Projects</span> <ArrowRight size={13} />
        </Link>
      </div>

      <div className="home-projects-grid">
        {projects.map((project) => {
          const creatorInitial = (project.creatorName || "M").charAt(0).toUpperCase();

          return (
            <article key={project.id} className="home-project-card">
              <Link href={`/projects/${project.id}`} className="home-project-cover-wrap">
                {project.coverImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={project.coverImageUrl}
                    alt={project.name}
                    className="home-project-img"
                    loading="lazy"
                  />
                ) : (
                  <div className="home-project-fallback">
                    <FolderGit2 size={32} />
                    <span>D/PROJECT</span>
                  </div>
                )}
                <div className="home-project-status-pill">
                  {project.status || "Launched"}
                </div>
              </Link>

              <div className="home-project-content">
                <div className="home-project-cat-row">
                  <span className="home-project-category">
                    {project.categoryName || "Community"}
                  </span>
                  {project.upvoteCount !== undefined && project.upvoteCount > 0 && (
                    <span className="home-project-upvotes">
                      <ThumbsUp size={11} /> {project.upvoteCount}
                    </span>
                  )}
                </div>

                <h3 className="home-project-title">
                  <Link href={`/projects/${project.id}`}>{project.name}</Link>
                </h3>

                <p className="home-project-description">{project.description}</p>

                {project.technologies && project.technologies.length > 0 && (
                  <div className="home-project-tech-pills">
                    {project.technologies.slice(0, 4).map((tech) => (
                      <span key={tech} className="home-tech-pill">
                        {tech}
                      </span>
                    ))}
                    {project.technologies.length > 4 && (
                      <span className="home-tech-pill more">
                        +{project.technologies.length - 4}
                      </span>
                    )}
                  </div>
                )}

                <div className="home-project-footer">
                  <div className="home-project-creator">
                    <span className="home-creator-avatar">
                      {project.creatorAvatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={project.creatorAvatar} alt="" />
                      ) : (
                        creatorInitial
                      )}
                    </span>
                    <span className="home-creator-name">
                      {project.creatorName || "Community Member"}
                    </span>
                  </div>

                  <Link href={`/projects/${project.id}`} className="home-project-cta">
                    <span>View Project</span>
                    <ArrowRight size={12} />
                  </Link>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
