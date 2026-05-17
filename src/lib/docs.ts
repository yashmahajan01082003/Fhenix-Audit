import fs from 'fs';
import path from 'path';

// Root directory for all audit readmes
const docsDirectory = path.join(process.cwd(), 'readme_audits');

export type DocMetadata = {
  slug: string;
  title: string;
  type: 'executive' | 'deep-dive' | 'security' | 'ui-ux' | 'other';
  rawFile: string;
};

// Map file prefixes to category types
function determineType(filename: string): DocMetadata['type'] {
  const upper = filename.toUpperCase();
  if (upper.includes('COMPREHENSIVE')) return 'executive';
  if (upper.includes('DEEP_DIVE')) return 'deep-dive';
  if (upper.includes('SECURITY')) return 'security';
  if (upper.includes('UI') || upper.includes('UX')) return 'ui-ux';
  return 'other';
}

// Read the first # Heading 1 to use as the document title
function extractTitleFromMarkdown(markdown: string, fallback: string): string {
  const match = markdown.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : fallback;
}

export function getAllDocs(): DocMetadata[] {
  if (!fs.existsSync(docsDirectory)) return [];

  const fileNames = fs.readdirSync(docsDirectory);
  
  const allDocsData = fileNames
    .filter(fileName => fileName.endsWith('.md'))
    .map(fileName => {
      const slug = fileName.replace(/\.md$/, '');
      const fullPath = path.join(docsDirectory, fileName);
      const fileContents = fs.readFileSync(fullPath, 'utf8');
      
      const readableSlugTitle = slug.replace(/_/g, ' ').replace(/-/g, ' ');

      return {
        slug,
        title: extractTitleFromMarkdown(fileContents, readableSlugTitle),
        type: determineType(fileName),
        rawFile: fileName,
      };
    });

  // Sort them loosely: COMPREHENSIVE first, then ordered
  return allDocsData.sort((a, b) => {
    if (a.type === 'executive') return -1;
    if (b.type === 'executive') return 1;
    return a.title.localeCompare(b.title);
  });
}

export function getDocBySlug(slug: string) {
  const fullPath = path.join(docsDirectory, `${slug}.md`);
  if (!fs.existsSync(fullPath)) return null;

  const fileContents = fs.readFileSync(fullPath, 'utf8');
  const readableSlugTitle = slug.replace(/_/g, ' ').replace(/-/g, ' ');

  return {
    slug,
    title: extractTitleFromMarkdown(fileContents, readableSlugTitle),
    type: determineType(`${slug}.md`) as DocMetadata['type'],
    content: fileContents,
  };
}

