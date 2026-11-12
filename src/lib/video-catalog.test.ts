import assert from "node:assert/strict";
import test from "node:test";
import { bilibiliHits, boardResponse, plainText, rankVideos, type VideoBoardPayload, type VideoHit } from "./video-catalog";

function hit(partial: Partial<VideoHit> & Pick<VideoHit, "id" | "query">): VideoHit {
  return {
    title: partial.id,
    channel: "channel",
    url: `https://example.com/${partial.id}`,
    likes: 0,
    ...partial,
  };
}

test("rank puts repeated videos ahead of a higher like count", () => {
  const ranked = rankVideos([
    hit({ id: "once", query: "q1", likes: 999, title: "Once" }),
    hit({ id: "twice", query: "q1", likes: 10, title: "Twice" }),
    hit({ id: "twice", query: "q2", likes: 12, title: "Twice" }),
  ]);
  assert.deepEqual(ranked.map((item) => item.id), ["twice", "once"]);
  assert.equal(ranked[0].appearances, 2);
  assert.equal(ranked[0].likes, 12);
  assert.equal(ranked[1].appearances, 1);
});

test("the same keyword does not count as a repeat", () => {
  const ranked = rankVideos([
    hit({ id: "a", query: "q1", likes: 3 }),
    hit({ id: "a", query: "q1", likes: 8 }),
  ]);
  assert.equal(ranked.length, 1);
  assert.equal(ranked[0].appearances, 1);
  assert.equal(ranked[0].likes, 8);
});

test("equal appearances fall back to likes", () => {
  const ranked = rankVideos([
    hit({ id: "low", query: "q1", likes: 2, title: "Low" }),
    hit({ id: "high", query: "q1", likes: 20, title: "High" }),
  ]);
  assert.deepEqual(ranked.map((item) => item.id), ["high", "low"]);
});

test("plain text drops search highlight tags", () => {
  assert.equal(plainText("梦然-《<em class=\"keyword\">少年</em>》"), "梦然-《少年》");
});

test("bilibili hits keep id, likes, and a video link", () => {
  const hits = bilibiliHits("人工智能", [
    {
      type: "video",
      bvid: "BV1xx",
      title: "<em class=\"keyword\">人工智能</em> 入门",
      author: "示例频道",
      like: 42,
    },
    { type: "live", bvid: "BV1live", title: "直播", author: "某人", like: 1 },
  ], 8);
  assert.equal(hits.length, 1);
  assert.equal(hits[0].id, "BV1xx");
  assert.equal(hits[0].title, "人工智能 入门");
  assert.equal(hits[0].likes, 42);
  assert.equal(hits[0].url, "https://www.bilibili.com/video/BV1xx");
  assert.equal(hits[0].query, "人工智能");
});

test("an empty failed board is an error and a real list is not", () => {
  const empty: VideoBoardPayload = {
    platform: "bilibili",
    source: "source",
    rules: [],
    categories: [{ id: "ai", label: "AI", queries: ["AI"], items: [], message: "Bilibili 拦截了服务器请求，没有拿到视频。" }],
  };
  const failed = boardResponse(empty);
  assert.equal(failed.status, 502);
  assert.equal(failed.body.message, "Bilibili 拦截了服务器请求，没有拿到视频。");

  const filled = boardResponse({
    ...empty,
    categories: [{
      id: "ai",
      label: "AI",
      queries: ["AI"],
      items: [{ id: "BV1", title: "标题", channel: "频道", url: "https://www.bilibili.com/video/BV1", likes: 3, appearances: 1 }],
    }],
  });
  assert.equal(filled.status, 200);
  assert.equal(filled.body.message, undefined);
});
