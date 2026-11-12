import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { cache } from 'react';
import { dmcHost, localized, pages, sections, type Locale, type Section } from '@/lib/luxury/dmc/content';
import { getDmcStateIndex } from '@/lib/luxury/dmc/destinations';
import { DmcInquiryForm } from '@/components/landing/luxury/DmcInquiryForm';
import { DmcLanguageLinks } from '@/components/landing/luxury/DmcLanguageLinks';
import s from '@/components/landing/luxury/dmc.module.css';

type Props = {
  params: Promise<{ locale: string; section: string; state?: string[] }>;
  searchParams: Promise<{ q?: string | string[]; destination?: string | string[] }>;
};

const catalog = cache(getDmcStateIndex);

async function resolve(params: Props['params']) {
  const { locale, section, state } = await params;
  const host = (await headers()).get('host')?.split(':')[0].toLowerCase();
  if (host !== dmcHost || (locale !== 'en' && locale !== 'es') ||
    !sections.includes(section as Section) ||
    (state && (section !== 'destinations' || state.length !== 1))) notFound();

  const key = section as Section;
  const states = key === 'destinations' ? await catalog() : [];
  const destinations = states.flatMap(({ name, slug, content }) => content ? [{ name, slug, ...content }] : []);
  const destination = state ? destinations.find((item) => item.slug === state[0]) : undefined;
  if (state && !destination) notFound();
  const path = '/' + key + (destination ? '/' + destination.slug : '');
  return { locale: locale as Locale, key, page: pages[key], states, destination, path };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, page, destination, path } = await resolve(params);
  const origin = 'https://' + dmcHost;
  const url = origin + '/' + locale + path;
  const title = (destination?.seoTitle[locale] ?? localized(page.label, locale)) + ' | Luxury Travel Point';
  const description = destination?.seoDescription[locale] ?? localized(page.description, locale);
  const image = destination?.image ?? origin + page.image;
  return {
    title: { absolute: title },
    description,
    alternates: {
      canonical: url,
      languages: { en: origin + '/en' + path, es: origin + '/es' + path, 'x-default': origin + '/en' + path },
    },
    openGraph: { title, description, url, images: [image], locale: locale === 'es' ? 'es_US' : 'en_US', type: 'website' },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
  };
}

export default async function DmcPage({ params, searchParams }: Props) {
  const { locale, key, page, states, destination, path } = await resolve(params);
  const t = (en: string, es: string) => localized([en, es], locale);
  const base = '/' + locale;
  const { q: search, destination: selected } = await searchParams;
  const requestedState = states.find((item) => item.name === selected)?.name;
  const query = typeof search === 'string' ? search.trim().slice(0, 100) : '';
  const matching = states.filter((item) =>
    [item.name, ...(item.content?.cities ?? [])].some((value) => value.toLowerCase().includes(query.toLowerCase())),
  );

  return (
    <div className={s.root} lang={locale}>
      <header className={s.header}>
        <Link className={s.brand} href="/" aria-label="Luxury Travel Point">
          <Image src="/luxury/original-logo.webp" width={96} height={80} alt="Luxury Travel Point" />
          <span>DMC</span>
        </Link>
        <nav aria-label={t('Main navigation', 'Navegación principal')}>
          <Link href="/">{t('Home', 'Inicio')}</Link>
          {sections.map((section) => (
            <Link key={section} href={base + '/' + section} aria-current={key === section && !destination ? 'page' : undefined}>
              {localized(pages[section].label, locale)}
            </Link>
          ))}
        </nav>
        <DmcLanguageLinks locale={locale} path={path} />
      </header>

      <main>
        <section className={s.hero}>
          <Image src={destination?.image ?? page.image} alt="" fill sizes="100vw" preload />
          <div className={s.heroCopy}>
            <p>{localized(page.label, locale)}</p>
            <h1>{destination?.name ?? localized(page.title, locale)}</h1>
            <p>{destination?.description[locale] ?? localized(page.description, locale)}</p>
            <div className={s.actions}>
              <Link className={s.button} href="#proposal">
                {key === 'mice-events' ? t('Request an event proposal', 'Solicita una propuesta para tu evento') : t('Request a travel proposal', 'Solicita una propuesta de viaje')}
              </Link>
              {key === 'mice-events' && <Link className={s.secondary} href={base + '/our-services'}>{t('Explore our services', 'Explora nuestros servicios')}</Link>}
              {destination && <Link className={s.secondary} href={base + '/destinations'}>{t('All destinations', 'Todos los destinos')}</Link>}
            </div>
          </div>
        </section>

        {page.features.length > 0 && (
          <section className={s.section}>
            <h2>{key === 'mice-events' ? t('Corporate programs', 'Programas corporativos') : t('Services for every stage of your trip', 'Servicios para cada etapa del viaje')}</h2>
            <div className={s.grid}>
              {page.features.map(([title, description], index) => (
                <article className={s.card} key={title[0]}>
                   {key === 'our-services' && <Image className={s.cardImage} src={['/luxury/miami.webp', '/luxury/airplane.webp', '/luxury/caribe.webp', '/luxury/nyc.webp', '/luxury/orlando.webp'][index]} alt="" width={480} height={240} sizes="(max-width: 700px) 90vw, 33vw" />}
                  <h3>{localized(title, locale)}</h3>
                  <p>{localized(description, locale)}</p>
                  {title[0] === 'MICE & Corporate Events' && <Link href={base + '/mice-events'}>{t('Explore MICE & Events', 'Explora MICE y eventos')}</Link>}
                </article>
              ))}
            </div>
          </section>
        )}

        {key === 'mice-events' && (
          <section className={s.section}>
            <h2>{t('How we plan your event', 'Cómo organizamos tu evento')}</h2>
            <ol className={s.process}>
              {[t('Consultation', 'Consulta'), t('Custom proposal', 'Propuesta personalizada'), t('Planning & coordination', 'Planificación y coordinación'), t('Event execution', 'Ejecución del evento')].map((step) => <li key={step}>{step}</li>)}
            </ol>
          </section>
        )}

        {key === 'destinations' && !destination && states.length > 0 && (
          <section className={s.section}>
            <h2>{t('Ideas for your next program', 'Ideas para tu próximo programa')}</h2>
            <div className={s.grid}>
              {[
                ['Florida', '/luxury/miami.webp', t('Consider Miami for a waterfront reception or Orlando for an incentive trip.', 'Considera Miami para una recepción junto al agua u Orlando para un viaje de incentivo.')],
                ['New York', '/luxury/nyc.webp', t('Consider New York City for a meeting paired with a cultural outing.', 'Considera Nueva York para una reunión acompañada de una salida cultural.')],
                ['Nevada', '/luxury/vegas.webp', t('Consider Las Vegas for a convention or an evening program centered on entertainment.', 'Considera Las Vegas para una convención o un programa nocturno de entretenimiento.')],
              ].map(([state, image, description]) => (
                <article className={s.card} key={state}>
                  <Image className={s.cardImage} src={image} alt="" width={480} height={240} sizes="(max-width: 700px) 90vw, 33vw" />
                  <h3>{state}</h3>
                  <p>{description}</p>
                  <Link href={base + '/destinations?destination=' + encodeURIComponent(state) + '#proposal'}>{t('Request availability', 'Consulta disponibilidad')}</Link>
                </article>
              ))}
            </div>
          </section>
        )}

        {key === 'destinations' && !destination && (
          <section className={s.section}>
            <h2>{t('Explore by state', 'Explora por estado')}</h2>
            <p>{t('Use this directory for inspiration. Ask us to confirm availability for your destination and dates.', 'Usa este directorio como inspiración. Consúltanos para confirmar disponibilidad en tu destino y fechas.')}</p>
            {states.length > 0 && (
              <form className={s.search} action={base + '/destinations'}>
                <label htmlFor="destination-search">{t('Search by state or city', 'Busca por estado o ciudad')}</label>
                <input id="destination-search" name="q" defaultValue={query} maxLength={100} />
                <button className={s.button}>{t('Search', 'Buscar')}</button>
              </form>
            )}
            {matching.length ? (
              <div className={s.grid}>{matching.map((item) => (
                <article className={s.card} key={item.slug}>
                  <h3>{item.content ? <Link href={base + '/destinations/' + item.slug}>{item.name}</Link> : item.name}</h3>
                  {item.content ? <p>{item.content.seoDescription[locale]}</p> : <Link href={base + '/destinations?destination=' + encodeURIComponent(item.name) + '#proposal'}>{t('Ask about this state', 'Consulta por este estado')}</Link>}
                </article>
              ))}</div>
            ) : <p>{states.length ? t('No destinations match your search.', 'No encontramos destinos para tu búsqueda.') : t('Destinations will appear as they are confirmed for publication.', 'Los destinos aparecerán a medida que se confirme su publicación.')}</p>}
          </section>
        )}

        {destination && (
          <section className={s.section}>
            {destination.cities.length > 0 && <><h2>{t('Cities', 'Ciudades')}</h2><ul>{destination.cities.map((city) => <li key={city}>{city}</li>)}</ul></>}
            {destination.experiences.length > 0 && <><h2>{t('Experiences', 'Experiencias')}</h2><ul>{destination.experiences.map((experience) => <li key={experience.en}>{experience[locale]}</li>)}</ul></>}
          </section>
        )}
        <DmcInquiryForm key={destination?.name ?? requestedState ?? key} locale={locale} kind={key === 'mice-events' ? 'event' : key === 'our-services' ? 'services' : 'destination'} destination={destination?.name ?? requestedState} />
      </main>
      <footer className={s.footer}>
        <Link href="/">Luxury Travel Point</Link>
        <Link href="/#contacto">{t('Contact', 'Contacto')}</Link>
      </footer>
    </div>
  );
}
