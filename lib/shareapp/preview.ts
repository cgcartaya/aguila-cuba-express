function escape(value: string) {
  return value.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
}
export function previewHtml(data: {
  title: string;
  description: string;
  url: string;
  image: string | null;
  destination: string;
  siteName?: string;
}) {
  const { title, description, url, image, destination, siteName } =
    Object.fromEntries(
      Object.entries(data).map(([key, value]) => [
        key,
        value ? escape(value) : "",
      ]),
    );
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${title}</title><meta name="description" content="${description}"><meta property="og:type" content="website"><meta property="og:title" content="${title}"><meta property="og:description" content="${description}"><meta property="og:url" content="${url}"><meta property="og:site_name" content="${siteName || ""}">${image ? `<meta property="og:image" content="${image}"><meta property="og:image:secure_url" content="${image}"><meta property="og:image:alt" content="${title}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${title}"><meta name="twitter:description" content="${description}"><meta name="twitter:image" content="${image}">` : ""}</head><body><a href="${destination}">${title}</a></body></html>`;
}
// Accept only this project's public Storage. Never fetch arbitrary DB/request URLs.
export function storageImageUrl(value: string, supabaseUrl: string) {
  try {
    const url = new URL(value),
      project = new URL(supabaseUrl);
    return url.protocol === "https:" &&
      url.origin === project.origin &&
      !url.username &&
      !url.password &&
      url.pathname.startsWith("/storage/v1/object/public/")
      ? url
      : null;
  } catch {
    return null;
  }
}
