// A test-site build must never ship the starter's unconfigured contact form.
if (!process.env.PUBLIC_CONTACT_FORM_TOKEN?.trim()) {
  console.error('PUBLIC_CONTACT_FORM_TOKEN must identify the approved published Demo contact form.');
  process.exitCode = 1;
}
