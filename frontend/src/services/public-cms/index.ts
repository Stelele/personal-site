/**
 * Client for the CMS's anonymous /public endpoints.
 *
 * The existing CmsService talks to the Go backend under /cms and needs the
 * read-only M2M token. The projects section is served by the CMS directly, and
 * its public routes require no token, so it gets its own client rather than
 * borrowing an authenticated one for content that is public by definition.
 */
export type ProjectCategory = "GameDev" | "Graphics" | "BusinessCase";
export type ProjectStatus = "Active" | "Archived";

export interface PublicProjectLink {
  label?: string | null;
  url?: string | null;
}

export interface PublicProjectSummary {
  id: string;
  blogId: string;
  slug: string;
  title: string;
  description?: string | null;
  category: ProjectCategory;
  stack: string[];
  year: number;
  lastPushedAt?: string | null;
  links: PublicProjectLink[];
  coverImageUrl?: string | null;
  publishedOn?: string | null;
  status: ProjectStatus;
}

export interface PublicProject extends PublicProjectSummary {
  content: string;
  canonicalUrl?: string | null;
}

export interface PublicProjectCategory {
  slug: string;
  label: string;
  category: ProjectCategory;
  description: string;
}

/**
 * The three project categories, mirroring the CMS's ProjectBlogs. The CMS is the
 * authority and re-checks the mapping on every write; this copy exists so the
 * site can render the category index without an extra request, and so a category
 * that does not exist has no card rather than an empty one.
 */
export const PROJECT_CATEGORIES: readonly PublicProjectCategory[] = [
  {
    slug: "game-dev",
    label: "Game Dev",
    category: "GameDev",
    description: "Games and interactive experiments, mostly built for the joy of building them.",
  },
  {
    slug: "graphics",
    label: "Graphics",
    category: "Graphics",
    description: "Visual work: shaders, rendering and generative art.",
  },
  {
    slug: "business-case",
    label: "Business Case",
    category: "BusinessCase",
    description: "The unglamorous side: the small tools and systems that make the rest possible.",
  },
] as const;

export function categoryBySlug(slug: string): PublicProjectCategory | undefined {
  return PROJECT_CATEGORIES.find((c) => c.slug === slug);
}

function baseUrl(): string {
  // The CMS directly, not the Go backend: it serves these anonymously and
  // allows giftmugweni.com in CORS, so no token and no proxy are needed. The
  // Go backend has no /cms/public route to proxy through.
  // VITE_CMS_API_URL, not VITE_CMS_URL: the latter is the Go backend's /cms
  // proxy, which has no /public route to forward to.
  const configured = import.meta.env.VITE_CMS_API_URL as string | undefined;
  if (!configured) {
    throw new Error("VITE_CMS_API_URL is not set, so projects cannot be fetched.");
  }
  return `${configured.replace(/\/+$/, "")}/public`;
}

export async function getPublicProjects(): Promise<PublicProjectSummary[]> {
  const response = await fetch(`${baseUrl()}/projects`, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`GET /public/projects failed with ${response.status}`);
  }
  return (await response.json()) as PublicProjectSummary[];
}

export async function getPublicProject(slug: string): Promise<PublicProject | null> {
  const response = await fetch(`${baseUrl()}/projects/${encodeURIComponent(slug)}`, {
    headers: { Accept: "application/json" },
  });
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`GET /public/projects/${slug} failed with ${response.status}`);
  }
  return (await response.json()) as PublicProject;
}
