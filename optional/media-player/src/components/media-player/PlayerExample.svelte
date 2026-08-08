<script lang="ts">
  import { nextPlaylistIndex, type PlaylistItem } from '../../lib/media-player/headless';

  export let playlist: PlaylistItem[] = [];
  let index = 0;
  $: current = playlist[index];
</script>

{#if current}
  <section aria-label="Media player">
    <p>{current.title}</p>
    <audio src={current.src} controls />
    <button type="button" on:click={() => (index = nextPlaylistIndex(index, playlist.length, -1))}>Previous</button>
    <button type="button" on:click={() => (index = nextPlaylistIndex(index, playlist.length, 1))}>Next</button>
  </section>
{/if}
