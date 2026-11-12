import data from './state-guides.json';

type City = { name: string; slug: string; place: string };
type StateGuide = { name: string; cities: City[] };

export const stateGuides: Readonly<Record<string, StateGuide>> = data;

export function getStateGuide(slug: string) {
  return Object.hasOwn(stateGuides, slug) ? stateGuides[slug] : undefined;
}
