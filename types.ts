
export interface Post {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
  published: boolean;
}

export interface Project {
  id: string;
  title: string;
  thumbnail: string;
  images: string[];
  description?: string;
  year?: string;
  location?: string;
  category?: string;
}

export interface SiteContent {
  branding: {
    logo: string;
    favicon?: string;
  };
  analytics?: {
    googleId: string;
  };
  seo?: {
    title: string;
    keywords: string;
    description: string;
  };
  hero: {
    title: string;
    subtitle: string;
    image: string;
    video?: string;
    buttonText: string;
    textPosition?: 
      | 'top-left' | 'top-center' | 'top-right' 
      | 'middle-left' | 'center' | 'middle-right' 
      | 'bottom-left' | 'bottom-center' | 'bottom-right';
    textSize?: 'sm' | 'md' | 'lg';
    textColor?: string;
  };
  atelier: {
    title: string;
    intro: string;
    philosophy: string;
    services: string[];
    image: string;
  };
  contact: {
    address: string;
    email: string;
    phone: string;
  };
}

export type ViewMode = 'list' | 'editor' | 'read' | 'projects' | 'gallery' | 'atelier' | 'contact' | 'login' | 'admin';
