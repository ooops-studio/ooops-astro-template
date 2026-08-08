<script lang="ts">
  let hydrated = false;
</script>

<button
  class="island-status"
  type="button"
  aria-pressed={hydrated}
  on:click={() => {
    hydrated = !hydrated;
  }}
>
  <span>{hydrated ? 'Island active' : 'Svelte island'}</span>
</button>

<style>
  .island-status {
    width: fit-content;
    min-height: 36px;
    padding: 0 14px;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-pill);
    background: var(--color-surface);
    color: var(--color-text);
    font: inherit;
    font-size: var(--font-size-body-sm);
    cursor: pointer;
  }

  .island-status[aria-pressed='true'] {
    border-color: var(--color-accent);
    color: var(--color-accent);
  }
</style>
