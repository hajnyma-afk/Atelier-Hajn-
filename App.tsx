import React, { useState, useEffect, useRef } from 'react';
import { Post, ViewMode, Project, SiteContent } from './types';
import { loadPosts, savePosts, loadProjects, saveProjects, loadContent, saveContent } from './services/storage';
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
  const [isLoaded, setIsLoaded] = useState(false);

  // -- View State --
  const [view, setView] = useState<ViewMode>('projects');
  const [activePostId, setActivePostId] = useState<string | null>(null);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  
  // -- Auth State --
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // -- Refs --
  const projectsGridRef = useRef<HTMLDivElement>(null);

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
    if (isLoaded) savePosts(posts);
  }, [posts, isLoaded]);

  useEffect(() => {
    if (isLoaded) saveProjects(projects);
  }, [projects, isLoaded]);
  
  useEffect(() => {
    if (isLoaded && siteContent) saveContent(siteContent);
  }, [siteContent, isLoaded]);

  // Scroll to top on view change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [view]);

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

  const handleUpdatePost = (updatedPost: Post) => {
    setPosts(posts.map(p => p.id === updatedPost.id ? updatedPost : p));
  };

  const handleDeletePost = (id: string) => {
    if (window.confirm('Opravdu chcete tento příběh smazat?')) {
      setPosts(posts.filter(p => p.id !== id));
      setView('list');
      setActivePostId(null);
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
                categories={siteContent.categories}
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

        {/* Blog/CMS List View */}
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