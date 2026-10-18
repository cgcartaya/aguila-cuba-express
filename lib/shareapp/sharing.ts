// URL is a separate Web Share field, as in the storefront product button.
// Never pass an image File for this action: that creates a media post instead.
export function publicationShareData(title: string, body: string, url: string) {
  return { title, text: body.split(url).join("").trim(), url };
}
export function publicationShareText(body: string, url: string) {
  return `${body.split(url).join("").trim()}\n\n${url}`.trim();
}
