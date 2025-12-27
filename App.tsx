
import React, { useState, useEffect, useRef } from 'react';
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

const App: React.FC = () => {
  // -- Data State --
  const [posts, setPosts] = useState<Post[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [siteContent, setSiteContent] = useState<SiteContent | null>(null);

  // -- View State --
  const [view, setView] = useState<ViewMode>('projects');
  const [activePostId, setActivePostId] = useState<string | null>(null);
  const [activeProject, setActiveProject] = useState<Project | null>(null);

  // -- Auth State --
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // -- Refs --
  const projectsGridRef = useRef<HTMLDivElement>(null);

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        const [loadedPosts, loadedProjects, loadedContent] = await Promise.all([
          loadPosts(),
          loadProjects(),
          loadContent()
        ]);
        setPosts(loadedPosts);
        setProjects(loadedProjects);
        setSiteContent(loadedContent);
      } catch (error) {
        console.error('Failed to load initial data:', error);
      }
    };
    loadData();
  }, []);

  // Persist data when changed (debounced)
  useEffect(() => {
    if (posts.length === 0) return;
    const timeoutId = setTimeout(async () => {
      try {
        await savePosts(posts);
      } catch (error) {
        console.error('Failed to save posts:', error);
      }
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [posts]);

  useEffect(() => {
    if (projects.length === 0) return;
    const timeoutId = setTimeout(async () => {
      try {
        await saveProjects(projects);
      } catch (error) {
        console.error('Failed to save projects:', error);
      }
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [projects]);

  useEffect(() => {
    if (!siteContent) return;
    const timeoutId = setTimeout(async () => {
      try {
        await saveContent(siteContent);
      } catch (error) {
        console.error('Failed to save content:', error);
      }
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [siteContent]);

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
    setActivePostId(newPost.id);
    setView('editor');
  };

  const handleSelectPost = (post: Post) => {
    setActivePostId(post.id);
    setView('editor');
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
        setView('list');
        setActivePostId(null);
      } catch (error) {
        console.error('Failed to delete post:', error);
        alert('Nepodařilo se smazat příspěvek.');
      }
    }
  };

  // -- Project Logic --
  const handleSelectProject = (project: Project) => {
    setActiveProject(project);
    setView('gallery');
  };

  // -- Navigation --
  const handleNavigate = (newView: ViewMode) => {
    // Prevent access to admin if not logged in
    if (newView === 'admin' && !isAuthenticated) {
      setView('login');
      return;
    }
    setView(newView);
    // Clear active selections when navigating top level
    if (newView !== 'gallery') {
      setActiveProject(null);
    }
    if (newView !== 'editor') {
      setActivePostId(null);
    }
  };

  const handleLogin = () => {
    setIsAuthenticated(true);
    setView('admin');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setView('projects');
  };

  const handleScrollToProjects = () => {
    projectsGridRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Ensure content is loaded before rendering
  if (!siteContent) return null;

  const activePost = posts.find(p => p.id === activePostId);

  return (
    <div className="min-h-screen bg-white text-gray-900 selection:bg-beige-600 selection:text-white flex flex-col">
      <Header
        onNavigate={handleNavigate}
        logo={siteContent.branding?.logo}
      />

      <main className="flex-1 flex flex-col relative">
        {/* Projects View (Default Homepage) */}
        {view === 'projects' && (
          <>
            <Hero
              onScrollDown={handleScrollToProjects}
              onContact={() => setView('contact')}
              content={siteContent.hero}
            />
            <div ref={projectsGridRef}>
              <ProjectGrid
                projects={projects}
                onSelect={handleSelectProject}
              />
            </div>
          </>
        )}

        {/* Atelier / About View */}
        {view === 'atelier' && <Atelier content={siteContent.atelier} />}

        {/* Contact View */}
        {view === 'contact' && <Contact content={siteContent.contact} />}

        {/* Project Gallery Overlay */}
        {view === 'gallery' && activeProject && (
          <ProjectGallery
            project={activeProject}
            allProjects={projects}
            onSelect={handleSelectProject}
            onClose={() => setView('projects')}
          />
        )}

        {/* Login */}
        {view === 'login' && (
          <Login onLogin={handleLogin} onCancel={() => setView('projects')} />
        )}

        {/* Admin Dashboard */}
        {view === 'admin' && isAuthenticated && (
          <AdminDashboard
            projects={projects}
            content={siteContent}
            onUpdateProjects={setProjects}
            onUpdateContent={setSiteContent}
            onLogout={handleLogout}
          />
        )}

        {/* Blog/CMS List View - keeping legacy functionality hidden/optional or integrated if needed */}
        {view === 'list' && (
          <PostList
            posts={posts}
            onSelect={handleSelectPost}
            onCreate={handleCreatePost}
          />
        )}

        {/* Blog Editor */}
        {view === 'editor' && activePost && (
          <Editor
            post={activePost}
            onSave={handleUpdatePost}
            onDelete={handleDeletePost}
            onBack={() => setView('list')}
          />
        )}
      </main>

      <Footer onNavigate={handleNavigate} isAuthenticated={isAuthenticated} />
      <ScrollToTop />
    </div>
  );
};

export default App;
