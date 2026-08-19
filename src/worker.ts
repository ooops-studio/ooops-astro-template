import { handle } from '@astrojs/cloudflare/handler';
import { DurableObject } from 'cloudflare:workers';

import { handleCmsRebuildRequest, type CmsRebuildWorkerEnv } from './lib/cms-rebuild/handler';

type ReplayRecord = {
  expiresAt: number;
  status: 'completed' | 'in_progress';
};

export class CmsRebuildReplayGuard extends DurableObject<Env> {
  async fetch(request: Request) {
    if (request.method !== 'POST') return new Response('Method not allowed.', { status: 405 });
    const operation = new URL(request.url).pathname;

    if (operation === '/release') {
      await this.ctx.storage.delete('event');
      return Response.json({ ok: true });
    }

    const body = (await request.json()) as { expiresAt?: unknown };
    const expiresAt = Number(body.expiresAt);
    if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
      return Response.json({ error: 'Invalid replay expiry.' }, { status: 400 });
    }

    if (operation === '/claim') {
      const state = await this.ctx.storage.transaction(async (transaction) => {
        const current = await transaction.get<ReplayRecord>('event');
        if (current && current.expiresAt > Date.now()) return current.status;
        if (current) await transaction.delete('event');
        await transaction.put<ReplayRecord>('event', { status: 'in_progress', expiresAt });
        return 'claimed' as const;
      });
      if (state !== 'claimed') return Response.json({ state });
      await this.ctx.storage.setAlarm(expiresAt);
      return Response.json({ state: 'claimed' });
    }

    if (operation === '/complete') {
      await this.ctx.storage.put<ReplayRecord>('event', { status: 'completed', expiresAt });
      await this.ctx.storage.setAlarm(expiresAt);
      return Response.json({ ok: true });
    }

    return new Response('Not found.', { status: 404 });
  }

  async alarm() {
    await this.ctx.storage.deleteAll();
  }
}

export default {
  async fetch(request: Request, env: Env, context: ExecutionContext) {
    const url = new URL(request.url);
    if (url.pathname === '/api/cms/rebuild') {
      return handleCmsRebuildRequest(request, env as unknown as CmsRebuildWorkerEnv);
    }
    return handle(request, env, context);
  }
} satisfies ExportedHandler<Env>;
