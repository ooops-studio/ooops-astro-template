import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const projectDir = await mkdtemp(join(tmpdir(), 'ooops-analytics-consumer-'));

const files = {
  'pnpm-workspace.yaml': `minimumReleaseAge: 0

allowBuilds:
  esbuild: true
`,
  'package.json': JSON.stringify({
    name: 'ooops-analytics-published-consumer-fixture',
    private: true,
    type: 'module',
    scripts: { build: 'astro check && astro build' },
    dependencies: {
      '@ooopsstudio/analytics-consent': '0.3.0',
      '@ooopsstudio/analytics-consent-astro': '0.3.0',
      astro: '^7.1.0'
    },
    devDependencies: {}
  }, null, 2),
  'src/pages/index.astro': `---
import CookieBanner from '@ooopsstudio/analytics-consent-astro/CookieBanner.astro';
import AnalyticsRuntime from '@ooopsstudio/analytics-consent-astro/AnalyticsRuntime.astro';
---

<html lang="en">
  <body>
    <h1>Published analytics consumer</h1>
    <AnalyticsRuntime
      enabled={true}
      src="https://analytics.example/script.js"
      websiteId="published-consumer"
      noticeVersion="consent-v3"
      policyVersion="privacy-v1"
      respectDoNotTrack={true}
    />
    <CookieBanner
      enabled={true}
      privacyHref="/privacy"
      consentDurationDays={180}
      noticeVersion="consent-v3"
      policyVersion="privacy-v1"
    />
  </body>
</html>
`,
  'src/pages/privacy.astro': `---
import PrivacyNotice from '@ooopsstudio/analytics-consent-astro/PrivacyNotice.astro';
---

<PrivacyNotice config={{
  locale: 'en',
  effectiveDate: '2026-08-12',
  policyVersion: 'privacy-v1',
  noticeVersion: 'consent-v3',
  consentDurationDays: 180,
  site: {
    organizationName: 'Fixture controller',
    registeredAddress: 'Fixture address',
    privacyEmail: 'privacy@example.test',
    supervisoryAuthority: { name: 'Fixture authority', complaintHref: 'https://example.test/privacy' }
  },
  providers: []
}} />
`
};

const run = (command, args) => {
  const result = spawnSync(command, args, {
    cwd: projectDir,
    encoding: 'utf8',
    stdio: 'pipe'
  });
  if (result.status === 0) return;
  throw new Error(`${command} ${args.join(' ')} failed\n${result.stdout}\n${result.stderr}`);
};

try {
  await Promise.all(Object.entries(files).map(async ([path, content]) => {
    const absolutePath = join(projectDir, path);
    const directory = absolutePath.slice(0, absolutePath.lastIndexOf('/'));
    await import('node:fs/promises').then(({ mkdir }) => mkdir(directory, { recursive: true }));
    await writeFile(absolutePath, content);
  }));

  run('pnpm', ['install', '--lockfile-only', '--config.minimumReleaseAge=0']);
  run('pnpm', ['install', '--frozen-lockfile', '--config.minimumReleaseAge=0', '--ignore-scripts']);
  run('pnpm', ['build']);
  console.log('[analytics:consumer] Published 0.3.0 packages installed and built from a clean consumer fixture.');
} finally {
  await rm(projectDir, { recursive: true, force: true });
}
