import { ref, computed, watch, type ComputedRef, type Ref } from "vue";
import { useSeoMeta, useHead } from "@unhead/vue";
import DOMPurify from "dompurify";
import MarkdownIt from "markdown-it";
import moment from "moment";
import type { Post } from "@/helpers/type";

const md = new MarkdownIt();

function protectAudioBlocks(content: string): [string, string[]] {
  const blocks: string[] = [];
  const protected_ = content.replace(
    /<audio[\s\S]*?<\/audio>/gi,
    (match) => {
      blocks.push(match);
      return `\nAUDIOBLOCK${blocks.length - 1}\n`;
    },
  );
  return [protected_, blocks];
}

function restoreAudioBlocks(html: string, blocks: string[]): string {
  return html.replace(
    /<p>\s*AUDIOBLOCK(\d+)\s*<\/p>/g,
    (_, i: string) => blocks[parseInt(i)],
  );
}

function getAbsoluteImageUrl(image: string | undefined): string {
  const img = image || "/assets/logo.png";
  if (img.startsWith("http")) return img;
  const base = import.meta.env.VITE_SITE_URL ?? "";
  return `${base}${img}`;
}

export interface UsePostRendererInput {
  post: ComputedRef<Post | undefined>;
  contentType: ComputedRef<"markdown" | "html">;
  isDataReady: ComputedRef<boolean>;
}

export interface UsePostRendererReturn {
  augmentedContent: ComputedRef<string>;
  isLoading: Ref<boolean>;
  isNotFound: ComputedRef<boolean>;
  showCanonical: ComputedRef<boolean>;
  formatDate: (date: string) => string;
}

export function usePostRenderer(
  input: UsePostRendererInput,
): UsePostRendererReturn {
  const { post, contentType, isDataReady } = input;
  const isLoading = ref(true);
  const parsedMarkdown = ref("");

  const showCanonical = computed(() => {
    return post.value?.link?.startsWith("https://") ?? false;
  });

  function formatDate(date: string): string {
    if (!moment(date).isValid()) return "Never Published";
    return moment(date).format("MMMM D, YYYY");
  }

  function renderContent() {
    parsedMarkdown.value = "";

    if (!isDataReady.value) {
      isLoading.value = true;
      return;
    }

    if (!post.value) {
      isLoading.value = false;
      return;
    }

    if (contentType.value === "markdown") {
      const [protected_, blocks] = protectAudioBlocks(post.value.content);
      const rendered = md.render(protected_);
      parsedMarkdown.value = restoreAudioBlocks(rendered, blocks);
    }

    isLoading.value = false;
  }

  watch([post, isDataReady, contentType], renderContent, { immediate: true });

  const isNotFound = computed(() => {
    return isDataReady.value && !post.value;
  });

  const augmentedContent = computed(() => {
    if (isLoading.value) return "";

    const rawContent = post.value?.content ?? "";
    let htmlContent: string;

    if (contentType.value === "markdown") {
      htmlContent = parsedMarkdown.value || rawContent;
    } else {
      htmlContent = rawContent;
    }

    const doc = new DOMParser().parseFromString(htmlContent, "text/html");
    doc.querySelectorAll("img").forEach((img) => {
      img.style.display = "block";
      img.style.marginLeft = "auto";
      img.style.marginRight = "auto";
      img.style.maxWidth = "400px";
      img.style.borderRadius = "0.5rem";
    });
    doc.querySelectorAll("figcaption").forEach((caption) => {
      caption.style.textAlign = "center";
    });
    doc.querySelectorAll("audio").forEach((audio) => {
      audio.style.display = "block";
      audio.style.marginLeft = "auto";
      audio.style.marginRight = "auto";
      audio.style.maxWidth = "400px";
      audio.style.width = "100%";
    });

    const serialized = new XMLSerializer().serializeToString(doc);
    return DOMPurify.sanitize(serialized, {
      ADD_TAGS: ["audio"],
      ADD_ATTR: ["src", "controls"],
    });
  });

  useSeoMeta({
    title: () => post.value?.title,
    description: () => post.value?.brief,
    ogTitle: () => post.value?.title,
    ogDescription: () => post.value?.brief,
    ogImage: () => getAbsoluteImageUrl(post.value?.coverImage),
    ogType: "article",
    twitterCard: "summary_large_image",
    twitterTitle: () => post.value?.title,
    twitterDescription: () => post.value?.brief,
    twitterImage: () => getAbsoluteImageUrl(post.value?.coverImage),
  });

  useHead({
    meta: [
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
    ],
  });

  useHead(() => {
    if (!post.value) {
      return;
    }
    return {
      meta: [
        { property: "og:image:alt", content: post.value.title },
        { property: "og:image:secure_url", content: getAbsoluteImageUrl(post.value.coverImage) },
      ],
      script: [
        {
          type: "application/ld+json",
          innerHTML: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: post.value.title,
            image: post.value.coverImage?.length ? [post.value.coverImage] : [],
            datePublished: post.value.publishDate,
            dateModified: post.value.updateDate,
            author: {
              "@type": "Person",
              name: "Gift Mugweni",
            },
            description: post.value.brief,
          }).replace(/</g, "\\u003c"),
        },
      ],
    };
  });

  return { augmentedContent, isLoading, isNotFound, showCanonical, formatDate };
}
