import { useRouter } from "vue-router";

export function navigateTo(path: string) {
  const router = useRouter();
  router.push(path);
}
