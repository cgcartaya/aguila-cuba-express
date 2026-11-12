import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { cache } from 'react';
import { dmcHost, localized, pages, sections, type Locale, type Section } from '@/lib/luxury/dmc/content';
import { getDmcDestinations } from '@/lib/luxury/dmc/destinations';
import { DmcLanguageLinks } from '@/components/landing/luxury/DmcLanguageLinks';
import s from '@/components/landing/luxury/dmc.module.css';

type Props = {
  params: Promise<{ locale: string; section: string; state?: string[] }>;
  searchParams: Promise<{ q?: string | string[] }>;
};

const catalog = cache(getDmcDestinations);

async function resolve(params: Props['params']) {
  const { locale, section, state } = await params;
  const host = (await headers()).get('host')?.split(':')[0].toLowerCase();
  if (host !== dmcHost || (locale !== 'en' && locale !== 'es') ||
    !sections.includes(section as Section) ||
    (state && (section !== 'destinations' || state.length !== 1))) notFound();

  const key = section as Section;
  const destinations = key === 'destinations' ? await catalog() : [];
  const destination = state ? destinations.find((item) => item.slug === state[0]) : undefined;
  if (state && !destination) notFound();
  const path = '/' + key + (destination ? '/' + destination.slug : '');
  return { locale, key, page: pages[key], destinations, destination, path };
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
  const { locale, key, page, destinations, destination, path } = await resolve(params);
  const t = (en: string, es: string) => localized([en, es], locale);
  const base = '/' + locale;
  const search = (await searchParams).q;
  const query = typeof search === 'string' ? search.trim().slice(0, 100) : '';
  const matching = destinations.filter((item) =>
    [item.name, ...item.cities].some((value) => value.toLowerCase().includes(query.toLowerCase())),
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
        <DmcLanguageLinks locale={locale as Locale} path={path} />
      </header>

      <main>
        <section className={s.hero}>
          <Image src={destination?.image ?? page.image} alt="" fill sizes="100vw" preload />
          <div className={s.heroCopy}>
            <p>{localized(page.label, locale)}</p>
            <h1>{destination?.name ?? localized(page.title, locale)}</h1>
            <p>{destination?.description[locale] ?? localized(page.description, locale)}</p>
            <div className={s.actions}>
              <Link className={s.button} href="/#contacto">
                {key === 'mice-events' ? t('Discuss your event', 'Conversemos sobre tu evento') : t('Discuss your trip', 'Conversemos sobre tu viaje')}
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
              {page.features.map(([title, description]) => (
                <article className={s.card} key={title[0]}>
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

        {key === 'destinations' && !destination && (
          <section className={s.section}>
            <h2>{t('Published destinations', 'Destinos publicados')}</h2>
            {destinations.length > 0 && (
              <form className={s.search} action={base + '/destinations'}>
                <label htmlFor="destination-search">{t('Search by state or city', 'Busca por estado o ciudad')}</label>
                <input id="destination-search" name="q" defaultValue={query} maxLength={100} />
                <button className={s.button}>{t('Search', 'Buscar')}</button>
              </form>
            )}
            {matching.length ? (
              <div className={s.grid}>{matching.map((item) => (
                <article className={s.card} key={item.slug}>
                  <h3><Link href={base + '/destinations/' + item.slug}>{item.name}</Link></h3>
                  <p>{item.seoDescription[locale]}</p>
                </article>
              ))}</div>
            ) : <p>{destinations.length ? t('No destinations match your search.', 'No encontramos destinos para tu búsqueda.') : t('Destinations will appear as they are confirmed for publication.', 'Los destinos aparecerán a medida que se confirme su publicación.')}</p>}
          </section>
        )}

        {destination && (
          <section className={s.section}>
            {destination.cities.length > 0 && <><h2>{t('Cities', 'Ciudades')}</h2><ul>{destination.cities.map((city) => <li key={city}>{city}</li>)}</ul></>}
            {destination.experiences.length > 0 && <><h2>{t('Experiences', 'Experiencias')}</h2><ul>{destination.experiences.map((experience) => <li key={experience.en}>{experience[locale]}</li>)}</ul></>}
          </section>
        )}
      </main>
      <footer className={s.footer}>
        <Link href="/">Luxury Travel Point</Link>
        <Link href="/#contacto">{t('Contact', 'Contacto')}</Link>
      </footer>
    </div>
  );
}
