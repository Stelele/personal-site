  <template>
  <div class="min-w-full min-h-full lg:p-8">
    <UContainer class="lg:max-w-9/10">
      <UBreadcrumb :items="breadcrumbs" class="mb-4" />
      <PostSkeleton v-if="isLoading" />
      <UCard v-else-if="post" variant="ghost" class="w-full">
        <template #header>
          <h1 class="text-2xl md:text-3xl font-bold">
            {{ post.title }}
          </h1>
          <p v-if="post?.publishDate" class="text-lg font-medium text-muted mt-1">
            {{ formatDate(post.publishDate) }}
          </p>
          <img
            v-if="post?.coverImage"
            :src="post.coverImage"
            :alt="post.title"
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
      <UCard v-else-if="isNotFound" variant="ghost" class="w-full">
        <p class="text-muted text-center py-8">The requested page could not be found.</p>
      </UCard>
    </UContainer>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref } from "vue";
import { useArticlesStore } from "@/stores/aritcles-store";
import { useSideBarStore } from "@/stores/sidebar-store";
import { usePostRenderer } from "@/composables/usePostRenderer";
import { usePlyrAudio } from "@/composables/usePlyrAudio";
import PostSkeleton from "@/components/PostSkeleton.vue";
import type { BreadcrumbItem } from "@nuxt/ui";
import "plyr/dist/plyr.css";

const articlesStore = useArticlesStore();
const sidebarStore = useSideBarStore();

const post = computed(() => articlesStore.findPostBySlug("special", "why-i-blog"));

const contentType = computed<"markdown" | "html">(() => {
  return articlesStore.findBlog("special")?.contentType ?? "markdown";
});

const isDataReady = computed(() => !articlesStore.isDownloading);

const { augmentedContent, isLoading, isNotFound, formatDate } = usePostRenderer({
  post,
  contentType,
  isDataReady,
});

const contentRef = ref<HTMLElement | null>(null);
usePlyrAudio({
  containerRef: contentRef,
  contentChanged: augmentedContent,
});

const breadcrumbs = computed<BreadcrumbItem[]>(() => [
  { label: "Home", to: "/", onClick: () => sidebarStore.init("/") },
  { label: post.value?.title ?? "Why I blog" },
]);
</script>
