import { defineStore } from "pinia";
import { ref } from "vue";

export const usePageScrollStore = defineStore("PageScrollStore", () => {
  const contentRef = ref<HTMLElement | null>(null);
  const scrollPositions = new Map<string, number>();

  function setRef(el: HTMLElement | null) {
    contentRef.value = el;
  }

  function saveScrollPosition(key: string) {
    if (contentRef.value) {
      scrollPositions.set(key, contentRef.value.scrollTop);
    }
  }

  function restoreScrollPosition(key: string) {
    const position = scrollPositions.get(key);
    if (contentRef.value && position !== undefined) {
      contentRef.value.scrollTop = position;
      return true;
    }
    return false;
  }

  function scrollToTop() {
    if (contentRef.value) {
      contentRef.value.scrollTop = 0;
    }
  }

  return {
    contentRef,
    setRef,
    saveScrollPosition,
    restoreScrollPosition,
    scrollToTop,
  };
});
