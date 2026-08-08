<script lang="ts">
  import { searchItems, type SearchIndexItem } from '../../lib/search/headless';

  export let items: SearchIndexItem[] = [];
  let query = '';
  $: results = searchItems(items, query);
</script>

<label>
  <span>Search</span>
  <input bind:value={query} type="search" autocomplete="off" />
</label>

<ul aria-live="polite">
  {#each results as item}
    <li><a href={item.url}>{item.title}</a></li>
  {/each}
</ul>
