import { Post } from "@/helpers/type";
import { getHashNodeFeed } from "@/helpers/blogs/hashnode";
import moment from "moment";
import { getMediumFeed } from "./blogs/medium";

export async function getBlogFeeds() {
  const [mediumFeed, hashNodeFeed] = await Promise.all([getMediumFeed(), getHashNodeFeed()]);

  const posts: Post[] = [...mediumFeed, ...hashNodeFeed];

  posts.sort((a, b) => (moment(a.publishDate).isBefore(moment(b.publishDate)) ? 1 : -1));

  return posts;
}
