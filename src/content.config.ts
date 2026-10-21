import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { docsLoader } from '@astrojs/starlight/loaders';
import { docsSchema } from '@astrojs/starlight/schema';

export const collections = {
  docs: defineCollection({ loader: docsLoader(), schema: docsSchema() }),
  projects: defineCollection({
    loader: glob({ pattern: '**/*.md', base: './src/content/projects' }),
    schema: z.object({
      title: z.string(),
      description: z.object({ en: z.string(), es: z.string() }),
      repo: z.url().optional(),
      demo: z.url().optional(),
      tags: z.array(z.string()).default([]),
      order: z.number().default(0),
    }),
  }),
};
