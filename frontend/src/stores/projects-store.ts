import { defineStore } from "pinia";
import { ref } from "vue";
import {
  getPublicProject,
  getPublicProjects,
  PROJECT_CATEGORIES,
  categoryBySlug,
  type ProjectCategory,
  type PublicProjectSummary,
} from "@/services/public-cms";

export const useProjectsStore = defineStore("ProjectsStore", () => {
  const projects = ref<PublicProjectSummary[]>([]);
  const isLoading = ref(false);
  const hasFailed = ref(false);
  // "not yet requested" is distinct from "requested and there were none", so an
  // empty list is not shown while the request is still in flight.
  const isLoaded = ref(false);

  async function update() {
    if (isLoading.value) return;
    isLoading.value = true;
    hasFailed.value = false;
    try {
      projects.value = await getPublicProjects();
      isLoaded.value = true;
    } catch (error) {
      // Without this the flag stays true on failure and the page renders its
      // loading state forever, which looks like a slow site rather than a break.
      hasFailed.value = true;
      console.error("Failed to load projects", error);
    } finally {
      isLoading.value = false;
    }
  }

  function findProject(slug: string): PublicProjectSummary | undefined {
    return projects.value.find((p) => p.slug === slug);
  }

  function getProjectsByCategory(category: ProjectCategory): PublicProjectSummary[] {
    return projects.value
      .filter((p) => p.category === category)
      .sort((a, b) => b.year - a.year || a.title.localeCompare(b.title));
  }

  function countForCategory(category: ProjectCategory): number {
    return projects.value.filter((p) => p.category === category).length;
  }

  function getCategories() {
    return PROJECT_CATEGORIES.map((c) => ({
      ...c,
      count: countForCategory(c.category),
    }));
  }

  function categoryForSlug(slug: string) {
    return categoryBySlug(slug);
  }

  return {
    projects,
    isLoading,
    isLoaded,
    hasFailed,
    update,
    findProject,
    getProjectsByCategory,
    countForCategory,
    getCategories,
    categoryForSlug,
    fetchProject: getPublicProject,
  };
});
