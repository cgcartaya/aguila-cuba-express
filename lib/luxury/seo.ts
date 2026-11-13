import { luxuryOrigin } from './hosts';

export function luxuryLanguageUrls(path: string) {
  const en = luxuryOrigin + '/en' + path;
  return { en, es: luxuryOrigin + '/es' + path, 'x-default': en };
}
