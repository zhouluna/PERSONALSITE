import assert from "node:assert/strict";
import test from "node:test";
import { mixinKey, signWbi, wbiKeyFromUrl } from "./bilibili-wbi";

const IMG_KEY = "7cd084941338484aae1ad9425b84077c";
const SUB_KEY = "4932caff0ff746eab6f01bf08b70ac45";

test("mixin key matches the published example", () => {
  assert.equal(mixinKey(IMG_KEY, SUB_KEY), "ea1db124af3c7062474693fa704f4ff8");
});

test("w_rid matches the documented parameter set", () => {
  const signed = signWbi({ foo: "114", bar: "514", zab: "1919810" }, IMG_KEY, SUB_KEY, 1702204169);
  assert.equal(signed, "bar=514&foo=114&wts=1702204169&zab=1919810&w_rid=8f6f2b5b3d485fe1886cec6a0be8c5d4");
});

test("spaces are encoded as %20 and filtered characters are removed", () => {
  const signed = signWbi({ keyword: "AI hardware!" }, IMG_KEY, SUB_KEY, 1702204169);
  assert.match(signed, /^keyword=AI%20hardware&wts=1702204169&w_rid=[0-9a-f]{32}$/);
});

test("wbi image urls reduce to the file id", () => {
  assert.equal(
    wbiKeyFromUrl("https://i0.hdslb.com/bfs/wbi/7cd084941338484aae1ad9425b84077c.png"),
    IMG_KEY,
  );
});
