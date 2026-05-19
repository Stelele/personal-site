import { Blog, Post } from "@/helpers/type";

interface HashnodePostResponse {
  id: string;
  title: string;
  publishDate: string;
  summary: string;
  coverImage: string;
  url: string;
  content: string;
  tags: string[];
}

async function getHashNodePosts(): Promise<HashnodePostResponse[]> {
  return await fetch(`${import.meta.env.VITE_PRIV_API_URL}/hashnode-posts`).then((r) => r.json());
}

export async function getHashNodeFeed(): Promise<Blog> {
  const feedPosts: Post[] = [];
  const posts = await getHashNodePosts();

  for (const post of posts) {
    feedPosts.push({
      id: post.id,
      title: post.title,
      brief: post.summary,
      link: post.url,
      publishDate: post.publishDate,
      updateDate: post.publishDate,
      coverImage: post.coverImage,
      tags: post.tags,
      content: post.content,
    });
  }

  return {
    id: "hashnode",
    name: "Hashnode Blog",
    description: "Exploring web development, JavaScript, programming concepts, and software engineering insights.",
    slug: "hashnode",
    icon: "i-simple-icons:hashnode",
    posts: feedPosts,
    contentType: 'html',
  };
}
