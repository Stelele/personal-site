import { watch, nextTick, onScopeDispose, ref, onMounted, type ComputedRef, type Ref } from "vue";
import Plyr from "plyr";

interface UsePlyrAudioOptions {
  containerRef: Ref<HTMLElement | null>;
  contentChanged: ComputedRef<string>;
}

export function usePlyrAudio({ containerRef, contentChanged }: UsePlyrAudioOptions) {
  let players: Plyr[] = [];
  const initialized = ref(false);

  function destroyPlayers() {
    for (const player of players) {
      player.destroy();
    }
    players = [];
    initialized.value = false;
  }

  async function enhanceAudio() {
    await nextTick();
    await nextTick();
    destroyPlayers();

    const container = containerRef.value;
    if (!container) return;

    const audioElements = container.querySelectorAll<HTMLAudioElement>("audio");
    if (audioElements.length === 0) return;

    for (const audio of audioElements) {
      const player = new Plyr(audio, {
        controls: [
          "play",
          "progress",
          "current-time",
          "duration",
          "mute",
          "volume",
          "settings",
        ],
      });
      players.push(player);
    }
    initialized.value = true;
  }

  watch(contentChanged, enhanceAudio, { flush: "post", immediate: true });

  onScopeDispose(destroyPlayers);
}
