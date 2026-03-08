import moment from "moment";
import { Post } from "@/helpers/type";
import { generateTitleHash } from "@/helpers/generate-title-hash";

interface MediumDetail {
  title: string;
  subtitle: string;
  date: string;
  summary: string;
  coverImage: string;
  url: string;
  content: string;
}

async function getMediumPosts(): Promise<MediumDetail[]> {
  return await fetch(`${import.meta.env.VITE_PRIV_API_URL}/medium-posts`).then((r) => r.json());
}

export async function getMediumFeed() {
  const feedPosts: Post[] = [];
  const posts = await getMediumPosts();

  for (const post of posts) {
    feedPosts.push({
      id: generateTitleHash(post.title),
      title: post.title,
      brief: post.subtitle,
      link: post.url,
      publishDate: moment(post.date).format(),
      updateDate: moment(post.date).format(),
      blogSite: "medium",
      coverImage: post.coverImage,
      tags: [],
      content: post.content,
    });
  }

  return feedPosts;
}
