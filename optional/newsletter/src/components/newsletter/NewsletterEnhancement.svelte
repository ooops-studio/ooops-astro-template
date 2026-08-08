<script lang="ts">
  export let successMessage = 'Thanks for subscribing.';
  let status = '';

  const handleSubmit = async (event: SubmitEvent) => {
    const form = event.currentTarget as HTMLFormElement;
    if (!form.action) return;
    event.preventDefault();
    status = 'Submitting...';
    const response = await fetch(form.action, {
      method: 'POST',
      body: new FormData(form)
    });
    status = response.ok ? successMessage : 'Something went wrong. Please try again.';
    if (response.ok) form.reset();
  };
</script>

<form class="newsletter-form" method="post" on:submit={handleSubmit}>
  <slot />
  {#if status}<p role="status">{status}</p>{/if}
</form>
