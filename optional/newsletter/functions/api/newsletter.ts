import { handleNewsletterRequest, type NewsletterWorkerEnv } from '../../src/lib/newsletter/handler';

type PagesContext = {
  request: Request;
  env: NewsletterWorkerEnv;
};

export const onRequest = ({ request, env }: PagesContext) => handleNewsletterRequest(request, env);
