import { defineCollection, z } from "astro:content";

const thoughts = defineCollection({
  type: "content",
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string(),
      pubDate: z.coerce.date(),
      updatedDate: z.coerce.date().optional(),
      draft: z.boolean().default(false),
      tags: z.array(z.string()).default([]),
      cover: image().optional(),
    }),
});

const stuff = defineCollection({
  type: "content",
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string(),
      pubDate: z.coerce.date(),
      github: z.string().url().optional(),
      demo: z.string().url().optional(),
      tech: z.array(z.string()).default([]),
      collaborators: z
        .array(
          z.object({
            name: z.string(),
            url: z.string().url().optional(),
          })
        )
        .default([]),
      role: z
        .enum(["owner", "maintainer", "contributor", "client-work"])
        .default("owner"),
      lastTouched: z.coerce.date().optional(),
      cover: image().optional(),
    }),
});

export const collections = { thoughts, stuff };
