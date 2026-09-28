<template>
  <div class="min-w-full min-h-full lg:p-8">
    <UContainer class="lg:max-w-9/10">
      <UBreadcrumb :items="breadcrumbLinks" class="mb-4" />
      <PostSkeleton v-if="isLoading" />

      <UCard v-else-if="isNotFound" variant="ghost" class="w-full">
        <p class="text-muted text-center py-8">The requested project could not be found.</p>
      </UCard>

      <UCard v-else-if="project" variant="ghost" class="w-full">
        <template #header>
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 class="text-2xl md:text-3xl font-bold">{{ project.title }}</h1>
              <div class="flex flex-wrap items-center gap-2 mt-3">
                <UBadge :color="statusColor" variant="subtle">
                  {{ project.status === "Active" ? "Active" : "Archived" }}
                </UBadge>
                <UBadge color="neutral" variant="subtle">{{ project.year }}</UBadge>
                <UBadge
                  v-for="item in project.stack"
                  :key="item"
                  color="neutral"
                  variant="subtle"
                >
                  {{ item }}
                </UBadge>
              </div>
            </div>
            <div v-if="links.length" class="flex flex-wrap gap-2">
              <UButton
                v-for="link in links"
                :key="link.url"
                :label="link.label"
                :to="link.url"
                target="_blank"
                variant="outline"
                color="neutral"
                size="sm"
                icon="i-heroicons-arrow-top-right-on-square-20-solid"
              />
            </div>
          </div>
          <img
            v-if="project.coverImageUrl"
            :src="project.coverImageUrl"
            :alt="project.title"
            class="w-full mt-4 rounded-lg"
          />
        </template>

        <div ref="contentRef" class="post-body">
          <!-- eslint-disable-next-line vue/no-v-html -->
          <article
            class="prose prose-xl prose-slate prose-invert max-w-none text-justify leading-relaxed"
            v-html="augmentedContent"
          />
        </div>
      </UCard>
    </UContainer>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { useSeoMeta } from "@unhead/vue";
import type { BreadcrumbItem } from "@nuxt/ui";
import { useProjectsStore } from "@/stores/projects-store";
import { useSideBarStore } from "@/stores/sidebar-store";
import { usePostRenderer } from "@/composables/usePostRenderer";
import { usePlyrAudio } from "@/composables/usePlyrAudio";
import PostSkeleton from "@/components/PostSkeleton.vue";
import type { Post } from "@/helpers/type";
import "plyr/dist/plyr.css";

const route = useRoute();
const projectsStore = useProjectsStore();
const sidebarStore = useSideBarStore();

const slug = computed(() => route.params.id as string);
const typeSlug = computed(() => route.params.type as string);

const category = computed(() => projectsStore.categoryForSlug(typeSlug.value));
const project = ref<Awaited<ReturnType<typeof projectsStore.fetchProject>>>(null);
const isFetching = ref(true);

async function load() {
  isFetching.value = true;
  project.value = null;
  try {
    project.value = await projectsStore.fetchProject(slug.value);
  } catch (error) {
    console.error(`Failed to load project ${slug.value}`, error);
  } finally {
    isFetching.value = false;
  }
}

watch([slug, typeSlug], load, { immediate: true });

// The renderer works on the shared Post shape, so a project is adapted rather
// than the renderer being taught a second type.
const asPost = computed<Post | undefined>(() => {
  const p = project.value;
  if (!p) return undefined;
  return {
    id: p.id,
    title: p.title,
    brief: p.description ?? "",
    link: p.slug,
    coverImage: p.coverImageUrl ?? undefined,
    publishDate: p.publishedOn ?? "",
    updateDate: p.publishedOn ?? "",
    tags: [category.value?.label ?? ""],
    content: p.content,
  };
});

const contentType = computed<"markdown" | "html">(() => "markdown");
const isDataReady = computed(() => !isFetching.value);

const { augmentedContent, isLoading, isNotFound, showCanonical, formatDate } = usePostRenderer({
  post: asPost,
  contentType,
  isDataReady,
});

const contentRef = ref<HTMLElement | null>(null);
usePlyrAudio({ containerRef: contentRef, contentChanged: augmentedContent });

const links = computed(() =>
  (project.value?.links ?? []).filter(
    (l): l is { label: string; url: string } => !!l.label && !!l.url,
  ),
);

const statusColor = computed(() => (project.value?.status === "Active" ? "success" : "neutral"));

const breadcrumbLinks = computed<BreadcrumbItem[]>(() => [
  { label: "Home", to: "/", onClick: () => sidebarStore.init("/") },
  { label: "Projects", to: "/projects", onClick: () => sidebarStore.init("/projects") },
  ...(category.value
    ? [
        {
          label: category.value.label,
          to: `/projects/${category.value.slug}`,
          onClick: () => sidebarStore.init(`/projects/${category.value?.slug}`),
        },
      ]
    : []),
  { label: project.value?.title || "" },
]);

useSeoMeta({
  title: () => (project.value ? `${project.value.title} - Projects` : "Projects"),
  description: () => project.value?.description ?? "A project write-up.",
});
</script>
