// URL is a separate Web Share field, as in the storefront product button.
// Never pass an image File for this action: that creates a media post instead.
export function publicationShareData(title: string, body: string, url: string) {
  return { title, text: body.split(url).join("").trim(), url };
}

export function publicationShareText(body: string, url: string) {
  return `${body.split(url).join("").trim()}\n\n${url}`.trim();
}

export type ShareNetwork = "whatsapp" | "facebook" | "telegram";

export function publicationNetworkUrl(
  network: ShareNetwork,
  body: string,
  url: string,
) {
  const text = publicationShareText(body, url);
  if (network === "whatsapp")
    return `https://wa.me/?text=${encodeURIComponent(text)}`;
  if (network === "facebook")
    return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
  return `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(
    body.split(url).join("").trim(),
  )}`;
}
