<template>
  <div
    class="drawer w-full overflow-x-clip z-50 lg:drawer-open"
    :class="{
      'sm:drawer-open': sideBarStore.show,
    }"
  >
    <input
      ref="toggleBar"
      id="toggleBar"
      type="checkbox"
      class="drawer-toggle"
    />
    <div class="drawer-content">
      <slot></slot>
    </div>
    <div class="drawer-side">
      <div
        class="menu m-0 p-0 bg-base-100 w-full overflow-x-hidden grid grid-cols-6 gap-[2px]"
      >
        <div
          class="bg-base-200 p-4 gap-6 flex flex-col items-center w-10 transition-all duration-100 ease-out"
        >
          <div v-for="(group, idx) in groups" :key="idx">
            <div
              class="hover:cursor-pointer swap"
              @click="selectGroup(idx, group)"
            >
              <input type="checkbox" :checked="idx === selectedGroup" />
              <OhVueIcon
                class="swap-on selected"
                :name="group.icon"
                :scale="1.5"
              />
              <OhVueIcon class="swap-off" :name="group.icon" :scale="1.5" />
            </div>
          </div>
        </div>
        <div class="bg-base-200 col-span-5 flex-grow p-4">
          <details :open="idx === 0" v-for="(detail, idx) in props.details">
            <summary
              class="group hover:cursor-pointer items-center"
              @click="toggleChecked(`swap-${idx}`)"
            >
              <div class="swap h-fit">
                <input
                  :id="`swap-${idx}`"
                  type="checkbox"
                  :checked="idx === 0"
                />
                <OhVueIcon class="swap-on" :name="detail.iconOn" />
                <OhVueIcon class="swap-off" :name="detail.iconOff" />
              </div>
              <span class="pl-1">{{ detail.title }}</span>
            </summary>
            <ul>
              <li v-for="child in detail.children">
                <ul>
                  <li>
                    <RouterLink :to="child.path" class="group">
                      <span>{{
                        child.name.length < 16
                          ? child.name
                          : `${child.name.slice(0, 13)}...`
                      }}</span>
                    </RouterLink>
                  </li>
                </ul>
              </li>
            </ul>
          </details>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { OhVueIcon } from "oh-vue-icons";
import { onMounted, ref } from "vue";
import { RouterLink } from "vue-router";
import { useSideBarStore } from "../../stores/sidebar-store";

const sideBarStore = useSideBarStore();

const emit = defineEmits(["onGroupSelected"]);

export interface Detail {
  iconOn: string;
  iconOff: string;
  title: string;
  children: Array<{
    name: string;
    path: string;
  }>;
}
export interface Props {
  details?: Array<Detail>;
}

const props = withDefaults(defineProps<Props>(), {
  details: () => [],
});

export interface Group {
  icon: string;
  id: string;
}
const groups = ref<Group[]>([
  { icon: "fa-user", id: "home" },
  { icon: "fa-blog", id: "blog" },
  { icon: "bi-person-workspace", id: "projects" },
  { icon: "fa-book-open", id: "book-recommendations" },
]);
const selectedGroup = ref(0);

onMounted(() => {
  const path = window.location.pathname.slice(1).split("/")[0];

  switch (path) {
    case "":
      selectedGroup.value = 0;
      break;
    case "blog":
      selectedGroup.value = 1;
      break;
    default:
      selectedGroup.value = 0;
      break;
  }
});

function selectGroup(groupIdx: number, group: Group) {
  selectedGroup.value = groupIdx;
  emit("onGroupSelected", group.id);
}

function toggleChecked(id: string) {
  const element = document.getElementById(id) as HTMLInputElement;
  element.checked = !element.checked;
}
</script>

<style>
.selected {
  color: oklch(var(--p) / 1);
}
</style>
