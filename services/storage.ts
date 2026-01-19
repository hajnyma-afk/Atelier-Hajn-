
import { Post, Project, SiteContent, AtelierBlock } from '../types';

// In production (served from same domain), use relative URLs
// In development, use VITE_API_URL or default to localhost
const getApiBaseUrl = () => {
  // If VITE_API_URL is explicitly set, use it
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  // In production (when served from same server), use relative URL
  if (import.meta.env.PROD || window.location.hostname !== 'localhost') {
    return '/api';
  }

  // Development fallback
  return 'http://localhost:3001/api';
};

const STORAGE_KEYS = {
  POSTS: 'zencms_posts',
  PROJECTS: 'zencms_projects_v5',
  CONTENT: 'zencms_content_v3', // Updated key for new atelier structure
  PASSWORD: 'zencms_password'
};

const API_BASE_URL = getApiBaseUrl();

// Default content structure
const DEFAULT_CONTENT: SiteContent = {
  branding: {
    logo: '',
    favicon: ''
  },
  analytics: {
    googleId: ''
  },
  seo: {
    title: 'ATELIER HAJNÝ | Moderní architektura a design',
    keywords: 'architektura, design, minimalismus, atelier hajny, projekty vily',
    description: 'ATELIER HAJNÝ se zaměřuje na architekturu ticha a prostoru. Věříme, že prázdnota není absencí, ale příležitostí.'
  },
  categories: ["Bydlení", "Občanské stavby", "Veřejný prostor", "Interiéry", "Urbanismus", "Ostatní"],
  hero: {
    title: "Architektura ticha \n a prostoru",
    subtitle: "Tvoříme místa, která dýchají. Hledáme rovnováhu mezi světlem, hmotou a prázdnotou.",
    image: "",
    video: "",
    buttonText: "",
    textPosition: 'center',
    textSize: 'lg',
    textColor: '#000000'
  },
  atelier: {
    title: "Atelier",
    leftColumn: [
      {
        id: '1',
        type: 'image',
        content: 'https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=2940&auto=format&fit=crop'
      },
      {
        id: '2',
        type: 'text',
        content: "ATELIER HAJNÝ se zaměřuje na architekturu ticha a prostoru. Věříme, že prázdnota není absencí, ale příležitostí. Naše projekty hledají rovnováhu mezi funkčností a estetikou minimalismu."
      }
    ],
    rightColumn: [
      {
        id: '3',
        type: 'text',
        content: "Filosofie\n\nMéně, ale lépe. Odstranění nepodstatného, aby vyniklo to důležité. Pracujeme s přirozeným světlem, surovými materiály a kontextem krajiny. Každá čára má svůj význam, každý detail svůj důvod."
      },
      {
        id: '4',
        type: 'text',
        content: "Služby\n\n• Architektonické studie\n• Interiérový design\n• Urbanismus\n• Konzultace"
      }
    ]
  },
  contact: {
    address: "Nitranská 19, 130 00 Praha 3, Česká Republika",
    email: "hello@zencms.studio",
    phone: "+420 123 456 789",
    info: ""
  }
};

// Helper function for API calls
async function apiCall(endpoint: string, options: RequestInit = {}) {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`API call failed: ${endpoint}`, error);
    throw error;
  }
}

// -- Projects --
export const saveProjects = async (projects: Project[]): Promise<void> => {
  try {
    // Save each project individually
    for (let i = 0; i < projects.length; i++) {
      const project = projects[i];
      // Extract filename from URL if it's already uploaded (remove domain, /api/images/, /uploads/)
      const extractFileName = (url: string | null | undefined): string | null => {
        if (!url) return null;
        // Handle both full URLs and relative paths
        // Remove protocol and domain
        let cleaned = url.replace(/^https?:\/\/[^\/]+/, '');
        // Remove /api/images/ prefix (FTP proxy endpoint)
        cleaned = cleaned.replace(/^\/api\/images\//, '');
        // Remove /uploads/ prefix (legacy local storage)
        cleaned = cleaned.replace(/^\/uploads\//, '').replace(/^uploads\//, '');
        // Return just the filename
        return cleaned || null;
      };

      await apiCall('/projects', {
        method: 'POST',
        body: JSON.stringify({
          ...project,
          display_order: i,
          thumbnail: extractFileName(project.thumbnail),
          images: project.images?.map(img => extractFileName(img)).filter(Boolean) || []
        }),
      });
    }
  } catch (e) {
    console.error('Failed to save projects', e);
    throw e;
  }
};

export const loadProjects = async (): Promise<Project[]> => {
  try {
    const projects = await apiCall('/projects');
    return projects || [];
  } catch (e) {
    console.error('Failed to load projects', e);
    return [];
  }
};

export const loadProject = async (id: string): Promise<Project | null> => {
  try {
    const project = await apiCall(`/projects/${id}`);
    return project || null;
  } catch (e) {
    console.error('Failed to load project', e);
    return null;
  }
};

export const deleteProject = async (id: string): Promise<void> => {
  try {
    await apiCall(`/projects/${id}`, { method: 'DELETE' });
  } catch (e) {
    console.error('Failed to delete project', e);
    throw e;
  }
};

export const reorderProjects = async (projectIds: string[]): Promise<void> => {
  try {
    await apiCall('/projects/reorder', {
      method: 'POST',
      body: JSON.stringify({ projectIds }),
    });
  } catch (e) {
    console.error('Failed to reorder projects', e);
    throw e;
  }
};

// -- Site Content --
export const saveContent = async (content: SiteContent): Promise<void> => {
  try {
    // Flatten the content structure for storage
    const flattened: Record<string, any> = {};

    Object.entries(content).forEach(([key, value]) => {
      flattened[key] = value;
    });

    await apiCall('/content', {
      method: 'POST',
      body: JSON.stringify(flattened),
    });
  } catch (e) {
    console.error('Failed to save content', e);
    throw e;
  }
};

export const loadContent = async (): Promise<SiteContent> => {
  try {
    const content = await apiCall('/content');

    if (!content || Object.keys(content).length === 0) {
      return DEFAULT_CONTENT;
    }

    // Migration Logic for Atelier structure (legacy check)
    // Only migrate if atelier exists and is in old format
    let atelier = content.atelier;
    if (atelier && typeof atelier === 'object') {
      // Check if it's in old format (no leftColumn/rightColumn)
      if (!atelier.leftColumn && !atelier.rightColumn && (atelier.image || atelier.intro || atelier.philosophy || atelier.services)) {
        // Migrate old format to new format
        const oldAtelier = atelier as any;
        atelier = {
          title: oldAtelier.title || "Atelier",
          leftColumn: oldAtelier.image ? [
            { id: 'mig-1', type: 'image', content: oldAtelier.image }
          ] : [],
          rightColumn: [
            { id: 'mig-2', type: 'text', content: oldAtelier.intro || '' },
            { id: 'mig-3', type: 'text', content: `Filosofie\n${oldAtelier.philosophy || ''}` },
            { id: 'mig-4', type: 'text', content: `Služby\n${(oldAtelier.services || []).join('\n')}` }
          ]
        };
      }
    }
    // Only use defaults if atelier is truly missing (undefined/null)
    if (!atelier || (typeof atelier === 'object' && Object.keys(atelier).length === 0)) {
      atelier = DEFAULT_CONTENT.atelier;
    }

    // Reconstruct the SiteContent structure
    // IMPORTANT: Only use defaults if content is actually missing, not if it's an empty object
    // This prevents overwriting existing content with defaults
    return {
      ...DEFAULT_CONTENT,
      ...content,
      branding: {
        ...DEFAULT_CONTENT.branding,
        ...(content.branding || {})
      },
      analytics: {
        ...DEFAULT_CONTENT.analytics,
        ...(content.analytics || {})
      },
      seo: {
        ...DEFAULT_CONTENT.seo,
        ...(content.seo || {})
      },
      categories: content.categories || DEFAULT_CONTENT.categories,
      // Merge hero content with defaults, but only if hero actually exists
      // If hero is undefined/null, use defaults. If hero exists, merge with defaults for missing fields
      hero: content.hero && typeof content.hero === 'object'
        ? {
            ...DEFAULT_CONTENT.hero,
            ...content.hero,
            // Ensure textColor has a fallback if missing
            textColor: content.hero.textColor || DEFAULT_CONTENT.hero.textColor
          }
        : DEFAULT_CONTENT.hero,
      atelier: atelier,
      // Only use defaults if contact is truly missing (undefined/null), not if it's an empty object
      contact: content.contact && typeof content.contact === 'object' && Object.keys(content.contact).length > 0
        ? {
            ...DEFAULT_CONTENT.contact,
            ...content.contact,
            info: content.contact.info || ''
          }
        : (content.contact || DEFAULT_CONTENT.contact),
    };
  } catch (e) {
    console.error('Failed to load content', e);
    return DEFAULT_CONTENT;
  }
};

// -- Posts --
export const savePosts = async (posts: Post[]): Promise<void> => {
  try {
    // Save each post individually
    for (const post of posts) {
      await apiCall('/posts', {
        method: 'POST',
        body: JSON.stringify(post),
      });
    }
  } catch (e) {
    console.error('Failed to save posts', e);
    throw e;
  }
};

export const loadPosts = async (): Promise<Post[]> => {
  try {
    const posts = await apiCall('/posts');
    return posts || [];
  } catch (e) {
    console.error('Failed to load posts', e);
    return [];
  }
};

export const deletePost = async (id: string): Promise<void> => {
  try {
    await apiCall(`/posts/${id}`, { method: 'DELETE' });
  } catch (e) {
    console.error('Failed to delete post', e);
    throw e;
  }
};

// -- Auth --
export const savePassword = async (password: string): Promise<void> => {
  try {
    await apiCall('/settings/password', {
      method: 'POST',
      body: JSON.stringify({ value: password }),
    });
  } catch (e) {
    console.error('Failed to save password', e);
    throw e;
  }
};

export const loadPassword = async (): Promise<string | null> => {
  try {
    const result = await apiCall('/settings/password');
    return result?.value || null;
  } catch (e) {
    console.error('Failed to load password', e);
    return null;
  }
};

// -- File Upload --
export const uploadFile = async (file: File): Promise<string> => {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    const result = await response.json();
    return result.url;
  } catch (e) {
    console.error('Failed to upload file', e);
    throw e;
  }
};

export const uploadMultipleFiles = async (files: File[]): Promise<string[]> => {
  try {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });

    const response = await fetch(`${API_BASE_URL}/upload/multiple`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    const result = await response.json();
    return result.files.map((f: { url: string }) => f.url);
  } catch (e) {
    console.error('Failed to upload files', e);
    throw e;
  }
};

export const submitContactForm = async (name: string, email: string, message: string): Promise<void> => {
  try {
    const response = await fetch(`${API_BASE_URL}/contact`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name, email, message }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `Failed to send message: ${response.statusText}`);
    }
  } catch (e) {
    console.error('Failed to submit contact form', e);
    throw e;
  }
};
