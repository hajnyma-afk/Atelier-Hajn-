/**
 * Creates a URL-friendly slug from a project title
 * Handles Czech characters and special characters
 */
export const createSlug = (title: string): string => {
  return title
    .toLowerCase()
    // Replace Czech characters
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[áàäâ]/g, 'a')
    .replace(/[éèëê]/g, 'e')
    .replace(/[íìïî]/g, 'i')
    .replace(/[óòöô]/g, 'o')
    .replace(/[úùüû]/g, 'u')
    .replace(/[ýÿ]/g, 'y')
    .replace(/[č]/g, 'c')
    .replace(/[ď]/g, 'd')
    .replace(/[ň]/g, 'n')
    .replace(/[ř]/g, 'r')
    .replace(/[š]/g, 's')
    .replace(/[ť]/g, 't')
    .replace(/[ž]/g, 'z')
    // Replace spaces and special characters with hyphens
    .replace(/[^a-z0-9]+/g, '-')
    // Remove leading/trailing hyphens
    .replace(/^-+|-+$/g, '')
    // Limit length
    .substring(0, 100);
};

