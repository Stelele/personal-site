import { NavigationMenuItem, TreeItem } from "@nuxt/ui";
import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import { useArticlesStore } from "@/stores/aritcles-store";

interface Detail {
  title: string;
  icon: string;
  path: string;
  children: { name: string; path: string }[];
}

export const useSideBarStore = defineStore("SideBarStore", () => {
  const router = useRouter();
  const articlesStore = useArticlesStore();
  const show = ref(false);
  const currentLink = ref<TreeItem | undefined>();

  const blogNavs = computed<Detail[]>(() => {
    const medium: Detail = {
      title: "Medium Blog",
      icon: "i-simple-icons:medium",
      path: "/blog/medium",
      children: [],
    };

    const hashnode: Detail = {
      title: "Hashnode Blog",
      icon: "i-simple-icons:hashnode",
      path: "/blog/hashnode",
      children: [],
    };

    for (const post of articlesStore.posts) {
      const section = post.blogSite === "medium" ? medium : hashnode;

      section.children.push({
        name: post.title,
        path: `/blog/${post.blogSite}/${post.id}`,
      });
    }
    return [medium, hashnode];
  });

  const links = computed<NavigationMenuItem[]>(() => [
    {
      label: "Home",
      icon: "i-heroicons-user",
      defaultOpen: true,
      children: [
        {
          label: "Overview",
          active: currentLink.value?.path === "/",
          path: "/",
          onSelect: () => navigateTo("/"),
        },
        {
          label: "Professional Experience",
          active: currentLink.value?.path === "/cv",
          path: "/cv",
          onSelect: () => navigateTo("/cv"),
        },
      ],
    },
    {
      label: "Blog",
      icon: "i-heroicons-document-text",
      defaultOpen: true,
      children: [
        {
          label: "Why I blog",
          icon: "i-heroicons-question-mark-circle",
          path: "/blog",
          active: currentLink.value?.path === "/blog",
          onSelect: () => navigateTo("/blog"),
        },
        ...blogNavs.value.map((detail) => ({
          label: detail.title,
          icon: detail.icon,
          path: detail.path,
          active: currentLink.value?.path === detail.path,
          onSelect: () => navigateTo(detail.path),
        })),
      ],
    },
    {
      label: "Projects",
      icon: "i-heroicons-code-bracket",
      defaultOpen: true,
      children: [
        {
          label: "Why I do projects",
          icon: "i-heroicons-question-mark-circle",
          path: "/projects",
          active: currentLink.value?.path === "/projects",
          onSelect: () => navigateTo("/projects"),
        },
        {
          label: "Business Case Projects",
          icon: "i-heroicons-briefcase",
          path: "/projects/business-case",
          active: currentLink.value?.path === "/projects/business-case",
          onSelect: () => navigateTo("/projects/business-case"),
        },
        {
          label: "Graphics Projects",
          icon: "i-ph-polygon",
          path: "/projects/graphics",
          active: currentLink.value?.path === "/projects/graphics",
          onSelect: () => navigateTo("/projects/graphics"),
        },
        {
          label: "Game Dev Projects",
          icon: "i-ph-game-controller",
          path: "/projects/game-dev",
          active: currentLink.value?.path === "/projects/game-dev",
          onSelect: () => navigateTo("/projects/game-dev"),
        },
      ],
    },
    {
      label: "Reviews of Books",
      icon: "i-heroicons-book-open",
      defaultOpen: false,
      children: [
        {
          label: "Why I read books",
          icon: "i-heroicons-question-mark-circle",
          path: "/books",
          active: currentLink.value?.path === "/books",
          onSelect: () => navigateTo("/books"),
        },
        {
          label: "Fantasy",
          icon: "i-mdi-wizard-hat",
          path: "/books/fantasy",
          active: currentLink.value?.path === "/books/fantasy",
          onSelect: () => navigateTo("/books/fantasy"),
        },
        {
          label: "Isekai",
          icon: "i-mdi-book-open-variant",
          path: "/books/isekai",
          active: currentLink.value?.path === "/books/isekai",
          onSelect: () => navigateTo("/books/isekai"),
        },
        {
          label: "LitRPG",
          icon: "i-mdi-dice-d20",
          path: "/books/litrpg",
          active: currentLink.value?.path === "/books/litrpg",
          onSelect: () => navigateTo("/books/litrpg"),
        },

        {
          label: "Programming",
          icon: "i-heroicons-command-line",
          path: "/books/programming",
          active: currentLink.value?.path === "/books/programming",
          onSelect: () => navigateTo("/books/programming"),
        },

        {
          label: "Science Fiction",
          icon: "i-mdi-robot-outline",
          path: "/books/science-fiction",
          active: currentLink.value?.path === "/books/science-fiction",
          onSelect: () => navigateTo("/books/science-fiction"),
        },

        {
          label: "Self Help",
          icon: "i-heroicons-light-bulb",
          path: "/books/self-help",
          active: currentLink.value?.path === "/books/self-help",
          onSelect: () => navigateTo("/books/self-help"),
        },
        {
          label: "Wuxia Books",
          icon: "i-heroicons-fire",
          path: "/books/wuxia",
          active: currentLink.value?.path === "/books/wuxia",
          onSelect: () => navigateTo("/books/wuxia"),
        },
      ],
    },
  ]);

  function init(path: string) {
    const matches: Array<[number, TreeItem]> = [];
    for (const link of links.value) {
      const child = link.children?.filter((child) => path.startsWith(child.path));
      if (child?.length) {
        matches.push(...child.map((child) => [child.path.length, child] as [number, TreeItem]));
      }
    }
    currentLink.value = matches.sort((a, b) => b[0] - a[0])[0]?.[1];
  }

  function navigateTo(path: string) {
    router.push(path);
    init(path);
  }

  return {
    show,
    links,
    blogNavs,
    navigateTo,
    init,
  };
});
