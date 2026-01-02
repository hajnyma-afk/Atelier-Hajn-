import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useParams, useLocation } from 'react-router-dom';
import { Post, ViewMode, Project, SiteContent } from './types';
import { loadPosts, savePosts, loadProjects, saveProjects, loadContent, saveContent, deletePost, deleteProject } from './services/storage';
import { PostList } from './components/PostList';
import { Editor } from './components/Editor';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { Hero } from './components/Hero';
import { ProjectGrid } from './components/ProjectGrid';
import { ProjectGallery } from './components/ProjectGallery';
import { Atelier } from './components/Atelier';
import { Contact } from './components/Contact';
import { Login } from './components/Login';
import { AdminDashboard } from './components/AdminDashboard';
import { ScrollToTop } from './components/ScrollToTop';
import { createSlug } from './utils/slug';

// Inner App component that uses React Router hooks
const AppContent: React.FC = () => {
  // -- Data State --
  const [posts, setPosts] = useState<Post[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [siteContent, setSiteContent] = useState<SiteContent | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // -- Auth State --
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // -- Refs --
  const projectsGridRef = useRef<HTMLDivElement>(null);

  // -- Router hooks --
  const navigate = useNavigate();
  const location = useLocation();

  // Load initial data asynchronously
  useEffect(() => {
    const initData = async () => {
      try {
        const [loadedPosts, loadedProjects, loadedContent] = await Promise.all([
          loadPosts(),
          loadProjects(),
          loadContent()
        ]);
        setPosts(loadedPosts);
        setProjects(loadedProjects);
        setSiteContent(loadedContent);
        setIsLoaded(true);
      } catch (error) {
        console.error("Failed to load data", error);
        // Handle error or set default states if critical
        setIsLoaded(true);
      }
    };
    initData();
  }, []);

  // Persist data when changed, but ONLY after initial load is complete
  useEffect(() => {
    if (!isLoaded) return;
    const timeoutId = setTimeout(async () => {
      try {
        await savePosts(posts);
      } catch (error) {
        console.error('Failed to save posts:', error);
      }
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [posts, isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;
    const timeoutId = setTimeout(async () => {
      try {
        await saveProjects(projects);
      } catch (error) {
        console.error('Failed to save projects:', error);
      }
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [projects, isLoaded]);

  useEffect(() => {
    if (!isLoaded || !siteContent) return;
    const timeoutId = setTimeout(async () => {
      try {
        await saveContent(siteContent);
      } catch (error) {
        console.error('Failed to save content:', error);
      }
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [siteContent, isLoaded]);

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  // Apply Favicon
  useEffect(() => {
    const faviconUrl = siteContent?.branding?.favicon;
    if (faviconUrl) {
      let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = faviconUrl;
    }
  }, [siteContent?.branding?.favicon]);

  // SEO Meta & Title Injection
  useEffect(() => {
    const seo = siteContent?.seo;
    if (seo) {
      // 0. Update Document Title
      if (seo.title) {
        document.title = seo.title;
      }

      // 1. Keywords Meta
      let kwMeta = document.querySelector('meta[name="keywords"]') as HTMLMetaElement;
      if (!kwMeta) {
        kwMeta = document.createElement('meta');
        kwMeta.name = 'keywords';
        document.head.appendChild(kwMeta);
      }
      kwMeta.content = seo.keywords || '';

      // 2. Description Meta
      let descMeta = document.querySelector('meta[name="description"]') as HTMLMetaElement;
      if (!descMeta) {
        descMeta = document.createElement('meta');
        descMeta.name = 'description';
        document.head.appendChild(descMeta);
      }
      descMeta.content = seo.description || '';
    }
  }, [siteContent?.seo]);

  // Google Analytics Injection
  useEffect(() => {
    const gaId = siteContent?.analytics?.googleId;
    if (gaId && gaId.startsWith('G-')) {
      // Remove any existing GA tags to prevent duplication
      const existingScript = document.querySelector(`script[src*="googletagmanager.com/gtag/js?id=${gaId}"]`);
      if (!existingScript) {
        // 1. Inject gtag.js script
        const script = document.createElement('script');
        script.async = true;
        script.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
        document.head.appendChild(script);

        // 2. Initialize gtag
        const inlineScript = document.createElement('script');
        inlineScript.innerHTML = `
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${gaId}');
        `;
        document.head.appendChild(inlineScript);
      }
    }
  }, [siteContent?.analytics?.googleId]);


  // -- Blog / Post Logic --
  const handleCreatePost = () => {
    const newPost: Post = {
      id: crypto.randomUUID(),
      title: '',
      content: '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      published: false,
    };
    setPosts([newPost, ...posts]);
    navigate(`/blog/${newPost.id}`);
  };

  const handleUpdatePost = async (updatedPost: Post) => {
    setPosts(posts.map(p => p.id === updatedPost.id ? updatedPost : p));
    // Save is handled by useEffect, but we can also save immediately
    try {
      await savePosts(posts.map(p => p.id === updatedPost.id ? updatedPost : p));
    } catch (error) {
      console.error('Failed to save post:', error);
    }
  };

  const handleDeletePost = async (id: string) => {
    if (window.confirm('Opravdu chcete tento příběh smazat?')) {
      try {
        await deletePost(id);
        setPosts(posts.filter(p => p.id !== id));
        navigate('/blog');
      } catch (error) {
        console.error('Failed to delete post:', error);
        alert('Nepodařilo se smazat příspěvek.');
      }
    }
  };

  // -- Project Logic --
  const handleSelectProject = (project: Project) => {
    const slug = createSlug(project.title || 'project');
    navigate(`/project/${slug}`);
  };

  // -- Navigation --
  const handleNavigate = (newView: ViewMode) => {
    // Prevent access to admin if not logged in
    if (newView === 'admin' && !isAuthenticated) {
      navigate('/login');
      return;
    }

    // Map ViewMode to routes
    const routeMap: Record<ViewMode, string> = {
      'projects': '/',
      'atelier': '/atelier',
      'contact': '/contact',
      'gallery': '/project', // This will be handled by project ID route
      'login': '/login',
      'admin': '/admin',
      'list': '/blog',
      'editor': '/blog/edit', // This will be handled by post ID route
      'read': '/blog' // This will be handled by post ID route
    };

    navigate(routeMap[newView] || '/');
  };

  const handleLogin = () => {
    setIsAuthenticated(true);
    navigate('/admin');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    navigate('/');
  };

  const handleScrollToProjects = () => {
    projectsGridRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Render loading state or content
  if (!isLoaded || !siteContent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="h-8 w-8 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs uppercase tracking-widest text-gray-400">Načítání ateliéru...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-gray-900 selection:bg-beige-600 selection:text-white flex flex-col">
      <Header
        onNavigate={handleNavigate}
        logo={siteContent.branding?.logo}
      />

      <main className="flex-1 flex flex-col relative">
        <Routes>
          {/* Homepage - Projects View */}
          <Route
            path="/"
            element={
              <>
                <Hero
                  onScrollDown={handleScrollToProjects}
                  onContact={() => navigate('/contact')}
                  content={siteContent.hero}
                />
                <div ref={projectsGridRef}>
                  <ProjectGrid
                    projects={projects}
                    categories={siteContent.categories || []}
                    onSelect={handleSelectProject}
                  />
                </div>
              </>
            }
          />

          {/* Atelier / About View */}
          <Route
            path="/atelier"
            element={<Atelier content={siteContent.atelier} />}
          />

          {/* Contact View */}
          <Route
            path="/contact"
            element={<Contact content={siteContent.contact} />}
          />

          {/* Project Gallery */}
          <Route
            path="/project/:projectSlug"
            element={
              <ProjectGalleryWrapper
                projects={projects}
                onSelect={handleSelectProject}
                onClose={() => navigate('/')}
              />
            }
          />

          {/* Login */}
          <Route
            path="/login"
            element={
              <Login
                onLogin={handleLogin}
                onCancel={() => navigate('/')}
              />
            }
          />

          {/* Admin Dashboard */}
          <Route
            path="/admin/*"
            element={
              isAuthenticated ? (
                <AdminDashboard
                  projects={projects}
                  content={siteContent}
                  onUpdateProjects={setProjects}
                  onUpdateContent={setSiteContent}
                  onLogout={handleLogout}
                />
              ) : (
                <Login
                  onLogin={handleLogin}
                  onCancel={() => navigate('/')}
                />
              )
            }
          />

          {/* Blog/CMS List View */}
          <Route
            path="/blog"
            element={
              <PostList
                posts={posts}
                onSelect={(post) => navigate(`/blog/${post.id}`)}
                onCreate={handleCreatePost}
              />
            }
          />

          {/* Blog Editor */}
          <Route
            path="/blog/:postId"
            element={
              <EditorWrapper
                posts={posts}
                onUpdatePost={handleUpdatePost}
                onDeletePost={handleDeletePost}
                onBack={() => navigate('/blog')}
              />
            }
          />
        </Routes>
      </main>

      <Footer onNavigate={handleNavigate} isAuthenticated={isAuthenticated} />
      <ScrollToTop />
    </div>
  );
};

// Wrapper component for ProjectGallery to access route params
const ProjectGalleryWrapper: React.FC<{
  projects: Project[];
  onSelect: (project: Project) => void;
  onClose: () => void;
}> = ({ projects, onSelect, onClose }) => {
  const { projectSlug } = useParams<{ projectSlug: string }>();
  const project = projects.find(p => {
    const projectSlugFromTitle = createSlug(p.title || 'project');
    return projectSlugFromTitle === projectSlug;
  });

  if (!project) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl mb-4">Projekt nenalezen</h1>
          <button onClick={onClose} className="text-blue-600 hover:underline">
            Zpět na přehled
          </button>
        </div>
      </div>
    );
  }

  return (
    <ProjectGallery
      project={project}
      allProjects={projects}
      onSelect={onSelect}
      onClose={onClose}
    />
  );
};

// Wrapper component for Editor to access route params
const EditorWrapper: React.FC<{
  posts: Post[];
  onUpdatePost: (post: Post) => void;
  onDeletePost: (id: string) => void;
  onBack: () => void;
}> = ({ posts, onUpdatePost, onDeletePost, onBack }) => {
  const { postId } = useParams<{ postId: string }>();
  const post = posts.find(p => p.id === postId);

  if (!post) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl mb-4">Příspěvek nenalezen</h1>
          <button onClick={onBack} className="text-blue-600 hover:underline">
            Zpět na seznam
          </button>
        </div>
      </div>
    );
  }

  return (
    <Editor
      post={post}
      onSave={onUpdatePost}
      onDelete={onDeletePost}
      onBack={onBack}
    />
  );
};

// Main App component with Router
const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
};

export default App;
