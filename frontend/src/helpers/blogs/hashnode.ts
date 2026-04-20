import moment from "moment";
import { Blog, HashnodeFeed, Post } from "@/helpers/type";

async function getHashNodePosts() {
  const query = `
    query publication {
        publication(host: "giftmugweni.hashnode.dev") {
            id
            isTeam
            title
            posts(first: 50) {
                edges {
                    node {
                        id
                        title
                        brief
                        publishedAt
                        updatedAt
                        url
                      	coverImage {
                           url
                         }
                        tags {
                        name
                        }
                        content {
                        html
                        }
                    }
                }
            }
        }
    }`;

  const response = await fetch("https://gql.hashnode.com", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  }).then((response) => response.json());

  return response as HashnodeFeed;
}

export async function getHashNodeFeed(): Promise<Blog> {
  const hashnodeFeed = await getHashNodePosts();
  const posts: Post[] = [];

  for (const edge of hashnodeFeed.data.publication.posts.edges) {
    posts.push({
      id: edge.node.id,
      title: edge.node.title,
      brief: edge.node.brief,
      link: edge.node.url,
      coverImage: edge?.node?.coverImage?.url || undefined,
      publishDate: moment(edge.node.publishedAt).format(),
      updateDate: moment(edge.node.updatedAt).format(),
      tags: edge.node.tags.map((x) => x.name),
      content: edge.node.content.html,
    });
  }

  return {
    id: "hashnode",
    name: "Hashnode Blog",
    description: "Exploring web development, JavaScript, programming concepts, and software engineering insights.",
    slug: "hashnode",
    icon: "i-simple-icons:hashnode",
    posts: posts,
  };
}
