import test from "node:test";
import assert from "node:assert/strict";
import {
  publicationShareData,
  publicationShareText,
} from "../../lib/shareapp/sharing";
test("native sharing sends the gestor URL as a link, never as an image attachment", () => {
  const url = "https://example.com/r/" + "a".repeat(48);
  const data = publicationShareData("Cerveza", `Precio: 13 USD\n${url}`, url);
  assert.deepEqual(data, { title: "Cerveza", text: "Precio: 13 USD", url });
  assert.equal("files" in data, false);
  assert.equal(
    publicationShareText(`Precio: 13 USD\n${url}`, url),
    `Precio: 13 USD\n\n${url}`,
  );
});
