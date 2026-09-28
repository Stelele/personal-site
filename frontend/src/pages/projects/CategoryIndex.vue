<template>
  <div class="min-w-full min-h-full p-8">
    <UBreadcrumb :items="breadcrumbLinks" class="mb-4" />

    <UAlert
      v-if="!category"
      color="error"
      variant="subtle"
      icon="i-heroicons-exclamation-triangle"
      title="Unknown project category"
      description="That category does not exist."
    />

    <template v-else>
      <UPageHeader
        :title="category.label"
        :description="category.description"
        class="mb-8"
      />

      <div v-if="projectsStore.isLoading" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        <div v-for="i in 6" :key="i" class="bg-[--ui-bg-alt] rounded-lg overflow-hidden">
          <USkeleton class="w-full h-40" />
          <div class="p-4 space-y-3">
            <USkeleton class="w-3/4 h-5" />
            <USkeleton class="w-1/2 h-4" />
          </div>
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

      <UCard v-else-if="!projects.length" variant="ghost" class="w-full">
        <p class="text-muted text-center py-8">Nothing published here yet.</p>
      </UCard>

      <UBlogPosts
        v-else
        orientation="vertical"
        class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8"
      >
        <UBlogPost
          v-for="project in projects"
          :key="project.id"
          :title="project.title"
          :description="project.description ?? ''"
          :image="project.coverImageUrl || '/blog-empty.jpg'"
          :badge="{
            label: `${project.year} · ${project.status === 'Active' ? 'Active' : 'Archived'}`,
            color: project.status === 'Active' ? 'success' : 'neutral',
            variant: 'subtle',
          }"
          :to="`/projects/${category.slug}/${project.slug}`"
        >
          <template #footer>
            <div v-if="project.stack.length" class="flex flex-wrap gap-1">
              <UBadge
                v-for="item in project.stack.slice(0, 4)"
                :key="item"
                color="neutral"
                variant="subtle"
                size="sm"
              >
                {{ item }}
              </UBadge>
            </div>
          </template>
        </UBlogPost>
      </UBlogPosts>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from "vue";
import { useRoute } from "vue-router";
import { useSeoMeta } from "@unhead/vue";
import type { BreadcrumbItem } from "@nuxt/ui";
import { useProjectsStore } from "@/stores/projects-store";
import { useSideBarStore } from "@/stores/sidebar-store";

const route = useRoute();
const projectsStore = useProjectsStore();
const sidebarStore = useSideBarStore();

const category = computed(() => projectsStore.categoryForSlug(route.params.type as string));

const projects = computed(() =>
  category.value ? projectsStore.getProjectsByCategory(category.value.category) : [],
);

onMounted(() => {
  if (!projectsStore.isLoaded) projectsStore.update();
});

const breadcrumbLinks = computed<BreadcrumbItem[]>(() => [
  { label: "Home", to: "/", onClick: () => sidebarStore.init("/") },
  { label: "Projects", to: "/projects", onClick: () => sidebarStore.init("/projects") },
  ...(category.value ? [{ label: category.value.label }] : []),
]);

useSeoMeta({
  title: () => (category.value ? `${category.value.label} - Projects` : "Projects"),
  description: () => category.value?.description ?? "Projects",
});
</script>
