<template>
  <SideBar
    class="w-full"
    :details="barDetails"
    @on-group-selected="onGroupSelect"
  >
    <slot></slot>
  </SideBar>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import SideBar, { Detail } from "./SideBar.vue";
import * as details from "./details";
import { useArticlesStore } from "../../stores/aritcles-store";

const articlesStore = useArticlesStore();

const barDetails = ref<Detail[]>(details.AboutMeDetails);

const blogNavs = computed<Detail[]>(() => {
  const medium: Detail = {
    title: "Medium Blog",
    iconOn: "fa-door-open",
    iconOff: "fa-door-closed",
    children: [],
  };

  const hashnode: Detail = {
    title: "Hashnode Blog",
    iconOn: "fa-door-open",
    iconOff: "fa-door-closed",
    children: [],
  };

  for (const post of articlesStore.posts) {
    if (medium.children.length >= 10 && hashnode.children.length >= 10) break;

    const section = post.blogSite === "medium" ? medium : hashnode;
    if (section.children.length >= 10) continue;

    section.children.push({
      name: post.title,
      path: `/blog/${post.blogSite}/${post.id}`,
    });
  }

  if (medium.children.length >= 10) {
    medium.children.push({
      name: "See more articles",
      path: `/blog/medium`,
    });
  }
  if (hashnode.children.length >= 10) {
    hashnode.children.push({
      name: "See more articles",
      path: `/blog/hashnode`,
    });
  }

  return [medium, hashnode];
});

onMounted(() => {
  const path = window.location.pathname.slice(1).split("/")[0];

  switch (path) {
    case "":
      onGroupSelect("home");
      break;
    case "blog":
      onGroupSelect("blog");
      break;
    case "projects":
      onGroupSelect("projects");
      break;
    case "book-recommendations":
      onGroupSelect("book-recommendations");
      break;
    default:
      onGroupSelect("home");
      break;
  }
});

function onGroupSelect(groupId: string) {
  switch (groupId) {
    case "home": {
      barDetails.value = details.AboutMeDetails;
      break;
    }
    case "blog": {
      barDetails.value = blogNavs.value;
      const blogs = blogNavs.value
        .map((detail) => detail.children.length)
        .reduce((sum, cur) => sum + cur, 0);
      if (blogs <= 0) {
        setTimeout(onGroupSelect, 500, "blog");
        return;
      }
      break;
    }
    case "projects": {
      barDetails.value = details.ProjectDetails;
      break;
    }
    case "book-recommendations": {
      barDetails.value = details.BooksDetails;
      break;
    }
  }
}
</script>
