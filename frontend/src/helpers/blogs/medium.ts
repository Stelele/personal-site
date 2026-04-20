import moment from "moment";
import { Blog, Post } from "@/helpers/type";
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

export async function getMediumFeed(): Promise<Blog> {
  const feedPosts: Post[] = [];
  const posts = await getMediumPosts();

  for (const post of posts) {
    feedPosts.push({
      id: generateTitleHash(post.title),
      title: post.title,
      brief: post.subtitle,
      link: post.url,
      publishDate: moment(post.date).isValid() ? moment(post.date).format() : "Never Published",
      updateDate: moment(post.date).isValid() ? moment(post.date).format() : "Never Updated",
      coverImage: post.coverImage,
      tags: [],
      content: post.content,
    });
  }

  return {
    id: "medium",
    name: "Medium Blog",
    description: "Thoughts on technology, personal growth, and the creative journey.",
    slug: "medium",
    icon: "i-simple-icons:medium",
    posts: feedPosts,
  };
}
