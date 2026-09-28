<template>
  <div class="min-w-full min-h-full p-8">
    <UBreadcrumb :items="breadcrumbLinks" class="mb-4" />
    <UPageHeader
      title="Projects"
      description="Things I have built, and what I learned building them."
      class="mb-8"
    />

    <div v-if="projectsStore.isLoading" class="grid grid-cols-1 sm:grid-cols-3 gap-8">
      <div v-for="i in 3" :key="i" class="bg-[--ui-bg-alt] rounded-lg p-6 space-y-3">
        <USkeleton class="w-2/3 h-6" />
        <USkeleton class="w-full h-4" />
        <USkeleton class="w-1/3 h-4" />
      </div>
    </div>

    <UAlert
      v-else-if="projectsStore.hasFailed"
      color="error"
      variant="subtle"
      icon="i-heroicons-exclamation-triangle"
      title="Projects could not be loaded"
      description="The CMS did not respond. This is usually temporary."
    />

    <template v-else>
      <section v-if="manifesto" class="mb-12 max-w-3xl">
        <h2 class="text-xl font-semibold mb-3">Why I keep projects</h2>
        <!-- eslint-disable-next-line vue/no-v-html -->
        <div class="prose prose-lg prose-slate prose-invert max-w-none" v-html="manifestoHtml" />
      </section>

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-8">
        <UCard
          v-for="category in projectsStore.getCategories()"
          :key="category.slug"
          :to="`/projects/${category.slug}`"
          variant="subtle"
          class="group"
        >
          <h2 class="text-lg font-semibold group-hover:text-primary transition-colors">
            {{ category.label }}
          </h2>
          <p class="text-sm text-muted mt-2">{{ category.description }}</p>
          <p class="text-xs text-dimmed mt-4">
            {{ category.count }} {{ category.count === 1 ? "project" : "projects" }}
          </p>
        </UCard>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useSeoMeta } from "@unhead/vue";
import type { BreadcrumbItem } from "@nuxt/ui";
import MarkdownIt from "markdown-it";
import { useProjectsStore } from "@/stores/projects-store";
import { useSideBarStore } from "@/stores/sidebar-store";
import { useArticlesStore } from "@/stores/aritcles-store";

const md = new MarkdownIt();
const projectsStore = useProjectsStore();
const articlesStore = useArticlesStore();
const sidebarStore = useSideBarStore();

const MANIFESTO_SLUG = "why-i-projects";
const manifesto = ref<{ content: string } | null>(null);

// The manifesto is a post in one of the project blogs, so it is fetched rather
// than duplicated here: editing it in the CMS updates the site.
onMounted(async () => {
  await projectsStore.update();
  try {
    await articlesStore.update();
    const found = articlesStore.blogs
      .find((b) => b.slug.startsWith("game-dev"))
      ?.posts.find((p) => p.link === MANIFESTO_SLUG);
    if (found) manifesto.value = { content: found.content };
  } catch (error) {
    console.error("Failed to load the projects manifesto", error);
  }
});

const manifestoHtml = computed(() => (manifesto.value ? md.render(manifesto.value.content) : ""));

const breadcrumbLinks = computed<BreadcrumbItem[]>(() => [
  { label: "Home", to: "/", onClick: () => sidebarStore.init("/") },
  { label: "Projects" },
]);

useSeoMeta({
  title: "Projects - Gift Mugweni",
  description: "Things I have built, and what I learned building them.",
});
</script>
