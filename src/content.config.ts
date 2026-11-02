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
      hidden: z.boolean().default(false),
    }),
  }),
  games: defineCollection({
    loader: glob({ pattern: '**/*.md', base: './src/content/games' }),
    schema: z.object({
      title: z.string(),
      description: z.object({ en: z.string(), es: z.string() }),
      demo: z.url(),
      repo: z.url(),
      players: z.string(),
      deck: z.object({ en: z.string(), es: z.string() }),
      accent: z.object({
        light: z.string().regex(/^#[0-9a-fA-F]{6}$/),
        dark: z.string().regex(/^#[0-9a-fA-F]{6}$/),
      }),
      status: z.enum(['live', 'soon']),
      order: z.number(),
      hidden: z.boolean().default(false),
      tags: z.array(z.string()).default([]),
    }),
  }),
  packages: defineCollection({
    loader: glob({ pattern: '**/*.md', base: './src/content/packages' }),
    schema: z.object({
      title: z.string(),
      package: z.string(),
      description: z.object({ en: z.string(), es: z.string() }),
      npm: z.url(),
      repo: z.url().optional(),
      demo: z.url().optional(),
      tool: z.string().optional(),
      tags: z.array(z.string()).default([]),
      order: z.number().default(0),
      hidden: z.boolean().default(false),
    }),
  }),
};
