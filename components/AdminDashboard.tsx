import React, { useState, useEffect } from 'react';
import { Project, SiteContent } from '../types';
import { Plus, Trash2, Edit2, LogOut, X, Upload, Image as ImageIcon, Crop, GripHorizontal, GripVertical, FileVideo, BarChart, Search, Tag, Video } from 'lucide-react';
import { Button } from './Button';
import { savePassword, uploadFile, uploadMultipleFiles } from '../services/storage';
import { ImageCropper } from './ImageCropper';

interface AdminDashboardProps {
  projects: Project[];
  content: SiteContent;
  onUpdateProjects: (projects: Project[]) => void;
  onUpdateContent: (content: SiteContent) => void;
  onLogout: () => void;
}

type Tab = 'projects' | 'atelier' | 'contact' | 'settings' | 'home' | 'seo';

const CATEGORIES = ["Bydlení", "Občanské stavby", "Veřejný prostor", "Interiéry", "Urbanismus", "Ostatní"];

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  projects,
  content,
  onUpdateProjects,
  onUpdateContent,
  onLogout
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('home');

  // -- Project State --
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  // -- Content State --
  const [atelierForm, setAtelierForm] = useState(content.atelier);
  const [contactForm, setContactForm] = useState(content.contact);
  const [heroForm, setHeroForm] = useState(content.hero);

  // -- Settings State --
  const [newPassword, setNewPassword] = useState('');
  const [brandingForm, setBrandingForm] = useState(content.branding || { logo: '', favicon: '' });
  const [analyticsForm, setAnalyticsForm] = useState(content.analytics || { googleId: '' });

  // -- SEO State --
  const [seoForm, setSeoForm] = useState(content.seo || { title: '', keywords: '', description: '' });
  const [newKeyword, setNewKeyword] = useState('');

  // -- Cropper State --
  const [cropper, setCropper] = useState<{
    isOpen: boolean;
    imageSrc: string;
    target: 'thumbnail' | 'atelier' | 'hero';
    aspectRatio: number;
  } | null>(null);

  // -- Drag & Drop State (Gallery) --
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // -- Drag & Drop State (Projects List) --
  const [draggedProjectIndex, setDraggedProjectIndex] = useState<number | null>(null);

  useEffect(() => {
    setAtelierForm(content.atelier);
    setContactForm(content.contact);
    setBrandingForm(content.branding || { logo: '', favicon: '' });
    setHeroForm(content.hero);
    setAnalyticsForm(content.analytics || { googleId: '' });
    setSeoForm(content.seo || { title: '', keywords: '', description: '' });
  }, [content]);

  /**
   * Process and upload image:
   * 1. Resizes image if it exceeds targetMaxWidth (to save storage space)
   * 2. Automatically converts to .webp format for better compression
   * 3. Uploads to server and returns URL
   */
  const processAndUploadImage = (file: File, targetMaxWidth: number | 'original' = 1920): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = async (e) => {
        const img = new Image();
        img.onload = async () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Resize based on horizontal side (width) if not 'original'
          if (targetMaxWidth !== 'original') {
            if (width > targetMaxWidth) {
              height *= targetMaxWidth / width;
              width = targetMaxWidth;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) return reject('Canvas context failed');

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);

          // Convert to Blob and upload
          canvas.toBlob(async (blob) => {
            if (!blob) return reject('Failed to create blob');

            try {
              const webpFile = new File([blob], file.name.replace(/\.[^/.]+$/, '.webp'), { type: 'image/webp' });
              const url = await uploadFile(webpFile);
              resolve(url);
            } catch (error) {
              reject(error);
            }
          }, 'image/webp', 0.8);
        };
        img.onerror = () => reject('Image load failed');
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject('File read failed');
      reader.readAsDataURL(file);
    });
  };

  const processAndUploadVideo = async (file: File): Promise<string> => {
    if (file.size > 20 * 1024 * 1024) {
      throw new Error("Video je příliš velké. Maximální velikost je 20MB.");
    }

    try {
      const url = await uploadFile(file);
      return url;
    } catch (error) {
      throw new Error('Failed to upload video');
    }
  };

  // Helper to check if a source string is a video
  const isVideoSource = (src: string) => src.startsWith('data:video/') || src.endsWith('.mp4') || src.endsWith('.webm');

  // -- Handlers: Projects --
  const handleSaveProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject) return;

    const existingIndex = projects.findIndex(p => p.id === editingProject.id);
    let newProjects = [...projects];

    if (existingIndex >= 0) {
      newProjects[existingIndex] = editingProject;
    } else {
      newProjects = [editingProject, ...projects];
    }

    onUpdateProjects(newProjects);
    setEditingProject(null);
  };

  const handleDeleteProject = (id: string) => {
    if (window.confirm('Opravdu chcete tento projekt smazat?')) {
      onUpdateProjects(projects.filter(p => p.id !== id));
    }
  };

  const createNewProject = () => {
    setEditingProject({
      id: crypto.randomUUID(),
      title: '',
      year: new Date().getFullYear().toString(),
      location: '',
      description: '',
      thumbnail: '',
      category: '',
      images: []
    });
  };

  // -- Handlers: Project Reordering (Drag & Drop) --
  const handleProjectDragStart = (e: React.DragEvent, index: number) => {
    setDraggedProjectIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleProjectDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleProjectDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedProjectIndex === null) return;

    if (draggedProjectIndex !== dropIndex) {
      const newProjects = [...projects];
      const [draggedItem] = newProjects.splice(draggedProjectIndex, 1);
      newProjects.splice(dropIndex, 0, draggedItem);
      onUpdateProjects(newProjects);
    }
    setDraggedProjectIndex(null);
  };

  // -- Handlers: Hero Video Upload --
  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      try {
        const videoUrl = await processAndUploadVideo(e.target.files[0]);
        setHeroForm(prev => ({ ...prev, video: videoUrl }));
        e.target.value = '';
      } catch (error) {
        alert(typeof error === 'string' ? error : "Chyba při nahrávání videa.");
      }
    }
  };

  const handleRemoveVideo = () => {
    setHeroForm(prev => ({ ...prev, video: undefined }));
  };

  // -- Handlers: Image Uploads --
  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      try {
        const imageUrl = await processAndUploadImage(e.target.files[0]);
        setCropper({
          isOpen: true,
          imageSrc: imageUrl,
          target: 'thumbnail',
          aspectRatio: 3 / 2
        });
        e.target.value = '';
      } catch (error) {
        alert("Chyba při nahrávání a konverzi obrázku.");
      }
    }
  };

  const openThumbnailCropper = () => {
    if (editingProject?.thumbnail) {
      setCropper({
        isOpen: true,
        imageSrc: editingProject.thumbnail,
        target: 'thumbnail',
        aspectRatio: 3 / 2
      });
    }
  };

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && editingProject) {
      try {
        const fileList = Array.from(e.target.files) as File[];
        // Limit project gallery images to 2500px on the horizontal side (width)
        const processedImages = await Promise.all(fileList.map(file => processAndUploadImage(file, 2500)));

        setEditingProject({
          ...editingProject,
          images: [...editingProject.images, ...processedImages]
        });
        e.target.value = '';
      } catch (error) {
        alert("Chyba při nahrávání obrázků.");
      }
    }
  };

  const handleGalleryVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && editingProject) {
      try {
        const fileList = Array.from(e.target.files) as File[];
        const uploadedUrls = await Promise.all(fileList.map(file => processAndUploadVideo(file)));

        setEditingProject({
          ...editingProject,
          images: [...editingProject.images, ...uploadedUrls]
        });
        e.target.value = '';
      } catch (error) {
        alert(typeof error === 'string' ? error : "Chyba při nahrávání videí.");
      }
    }
  };

  const removeGalleryImage = (indexToRemove: number) => {
    if (editingProject) {
      setEditingProject({
        ...editingProject,
        images: editingProject.images.filter((_, index) => index !== indexToRemove)
      });
    }
  };

  // -- Drag & Drop Handlers (Gallery) --
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || !editingProject) return;
    if (draggedIndex === dropIndex) {
      setDraggedIndex(null);
      return;
    }

    const newImages = [...editingProject.images];
    const [draggedItem] = newImages.splice(draggedIndex, 1);
    newImages.splice(dropIndex, 0, draggedItem);

    setEditingProject({
      ...editingProject,
      images: newImages
    });
    setDraggedIndex(null);
  };

  // -- Handlers: Content --
  const handleAtelierImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      try {
        const imageUrl = await processAndUploadImage(e.target.files[0]);
        setCropper({
          isOpen: true,
          imageSrc: imageUrl,
          target: 'atelier',
          aspectRatio: 3 / 4 // 3:4 Portrait
        });
         e.target.value = '';
      } catch (error) {
        alert("Chyba při nahrávání obrázku.");
      }
    }
  };

  const handleHeroImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      try {
        // Skip resizing for hero images to preserve original resolution
        const imageUrl = await processAndUploadImage(e.target.files[0], 'original');
        setCropper({
          isOpen: true,
          imageSrc: imageUrl,
          target: 'hero',
          aspectRatio: 16 / 9
        });
         e.target.value = '';
      } catch (error) {
        alert("Chyba při nahrávání obrázků.");
      }
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      try {
        const imageUrl = await processAndUploadImage(e.target.files[0]);
        const newBranding = { ...brandingForm, logo: imageUrl };
        setBrandingForm(newBranding);
        onUpdateContent({
          ...content,
          branding: newBranding
        });
        e.target.value = '';
      } catch (error) {
        alert("Chyba při nahrávání loga.");
      }
    }
  };

  const handleFaviconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      try {
        const imageUrl = await processAndUploadImage(e.target.files[0]);
        const newBranding = { ...brandingForm, favicon: imageUrl };
        setBrandingForm(newBranding);
        onUpdateContent({
          ...content,
          branding: newBranding
        });
        e.target.value = '';
      } catch (error) {
        alert("Chyba při nahrávání faviconu.");
      }
    }
  };

  const handleRemoveLogo = () => {
    const newBranding = { ...brandingForm, logo: '' };
    setBrandingForm(newBranding);
    onUpdateContent({
      ...content,
      branding: newBranding
    });
  };

  const handleRemoveFavicon = () => {
    const newBranding = { ...brandingForm, favicon: '' };
    setBrandingForm(newBranding);
    onUpdateContent({
      ...content,
      branding: newBranding
    });
  };

  // -- Handlers: Crop Completion --
  const handleCropComplete = async (croppedImageUrl: string) => {
    if (!cropper) return;

    // If it's a base64 data URL, we need to upload it first
    if (croppedImageUrl.startsWith('data:')) {
      try {
        // Convert base64 to blob and upload
        const response = await fetch(croppedImageUrl);
        const blob = await response.blob();
        const file = new File([blob], 'cropped.webp', { type: 'image/webp' });
        croppedImageUrl = await uploadFile(file);
      } catch (error) {
        console.error('Failed to upload cropped image:', error);
        alert('Chyba při nahrávání oříznutého obrázku.');
        return;
      }
    }

    if (cropper.target === 'thumbnail' && editingProject) {
      setEditingProject({ ...editingProject, thumbnail: croppedImageUrl });
    } else if (cropper.target === 'atelier') {
      setAtelierForm({ ...atelierForm, image: croppedImageUrl });
    } else if (cropper.target === 'hero') {
      setHeroForm({ ...heroForm, image: croppedImageUrl });
    }

    setCropper(null);
  };

  const handleSaveContent = () => {
    onUpdateContent({
      atelier: atelierForm,
      contact: contactForm,
      branding: brandingForm,
      hero: heroForm,
      analytics: analyticsForm,
      seo: seoForm
    });
    alert('Obsah uložen');
  };

  // -- Handlers: SEO Keywords --
  const keywordsList = seoForm.keywords ? seoForm.keywords.split(',').map(k => k.trim()).filter(k => k !== '') : [];

  const addKeyword = () => {
    const trimmed = newKeyword.trim().toLowerCase();
    if (trimmed && !keywordsList.includes(trimmed)) {
      const newList = [...keywordsList, trimmed];
      setSeoForm({ ...seoForm, keywords: newList.join(', ') });
      setNewKeyword('');
    }
  };

  const removeKeyword = (kw: string) => {
    const newList = keywordsList.filter(k => k !== kw);
    setSeoForm({ ...seoForm, keywords: newList.join(', ') });
  };

  const handleKeywordKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addKeyword();
    }
  };

  // -- Handlers: Settings --
  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.trim().length < 4) {
      alert("Heslo musí mít alespoň 4 znaky.");
      return;
    }
    savePassword(newPassword);
    alert("Heslo bylo úspěšně změněno.");
    setNewPassword('');
  };

  const positionsGrid = [
    ['top-left', 'top-center', 'top-right'],
    ['middle-left', 'center', 'middle-right'],
    ['bottom-left', 'bottom-center', 'bottom-right']
  ];

  // Common input styles for light grey background
  const inputBaseStyle = "w-full bg-gray-50 border-b border-gray-300 px-3 py-2 focus:border-black focus:bg-white focus:outline-none transition-all";

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* CROPPER MODAL */}
      {cropper && cropper.isOpen && (
        <ImageCropper
          imageSrc={cropper.imageSrc}
          aspectRatio={cropper.aspectRatio}
          onCrop={handleCropComplete}
          onCancel={() => setCropper(null)}
        />
      )}

      {/* Admin Header - Stick below global header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center sticky top-20 z-20">
        <h1 className="text-lg font-medium">Administrace</h1>
        <button onClick={onLogout} className="flex items-center gap-2 text-sm text-gray-500 hover:text-red-600">
          <LogOut size={16} /> Odhlásit
        </button>
      </div>

      <div className="max-w-[95%] md:max-w-[75%] mx-auto px-1 py-8">
        {/* Tabs */}
        <div className="flex gap-1 mb-8 border-b border-gray-200 flex-wrap">
          <button
            onClick={() => setActiveTab('home')}
            className={`px-4 py-2 text-sm uppercase tracking-widest ${activeTab === 'home' ? 'border-b-2 border-black text-black' : 'text-gray-400 hover:text-gray-600'}`}
          >
            Úvod
          </button>
          <button
            onClick={() => setActiveTab('projects')}
            className={`px-4 py-2 text-sm uppercase tracking-widest ${activeTab === 'projects' ? 'border-b-2 border-black text-black' : 'text-gray-400 hover:text-gray-600'}`}
          >
            Projekty
          </button>
          <button
            onClick={() => setActiveTab('atelier')}
            className={`px-4 py-2 text-sm uppercase tracking-widest ${activeTab === 'atelier' ? 'border-b-2 border-black text-black' : 'text-gray-400 hover:text-gray-600'}`}
          >
            Atelier
          </button>
          <button
            onClick={() => setActiveTab('contact')}
            className={`px-4 py-2 text-sm uppercase tracking-widest ${activeTab === 'contact' ? 'border-b-2 border-black text-black' : 'text-gray-400 hover:text-gray-600'}`}
          >
            Kontakt
          </button>
          <button
            onClick={() => setActiveTab('seo')}
            className={`px-4 py-2 text-sm uppercase tracking-widest ${activeTab === 'seo' ? 'border-b-2 border-black text-black' : 'text-gray-400 hover:text-gray-600'}`}
          >
            SEO
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 text-sm uppercase tracking-widest ${activeTab === 'settings' ? 'border-b-2 border-black text-black' : 'text-gray-400 hover:text-gray-600'}`}
          >
            Nastavení
          </button>
        </div>

        {/* --- HOME / INTRO TAB --- */}
        {activeTab === 'home' && (
           <div className="bg-white p-8 rounded shadow-sm border border-gray-200">
             <h2 className="text-xl mb-8">Editace: Úvodní obrazovka</h2>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
               <div className="space-y-8">
                 <div className="space-y-6">
                    {/* Text Inputs */}
                    <div className="space-y-1">
                      <label className="text-xs uppercase tracking-widest text-gray-500">Hlavní nadpis</label>
                      <textarea
                        rows={2}
                        className={`${inputBaseStyle} resize-none`}
                        value={heroForm.title}
                        onChange={e => setHeroForm({...heroForm, title: e.target.value})}
                        placeholder="Zadejte nadpis..."
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs uppercase tracking-widest text-gray-500">Podnadpis</label>
                      <textarea
                        rows={2}
                        className={`${inputBaseStyle} resize-none`}
                        value={heroForm.subtitle}
                        onChange={e => setHeroForm({...heroForm, subtitle: e.target.value})}
                        placeholder="Zadejte podnadpis..."
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-8">
                       {/* Position Selector (3x3 Grid) */}
                       <div className="space-y-2">
                         <label className="text-xs uppercase tracking-widest text-gray-500">Pozice textu</label>
                         <div className="grid grid-cols-3 gap-1 w-fit border border-gray-200 p-1 rounded">
                           {positionsGrid.flat().map((pos) => (
                              <button
                                key={pos}
                                onClick={() => setHeroForm({...heroForm, textPosition: pos as any})}
                                className={`w-8 h-8 rounded-sm text-[10px] flex items-center justify-center transition-colors ${heroForm.textPosition === pos ? 'bg-black text-white' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}
                                title={pos}
                              >
                                ●
                              </button>
                           ))}
                         </div>
                       </div>

                       {/* Size Selector */}
                       <div className="space-y-4">
                          <div className="space-y-2">
                            <label className="text-xs uppercase tracking-widest text-gray-500">Velikost písma</label>
                            <div className="flex flex-col gap-2">
                              <button
                                onClick={() => setHeroForm({...heroForm, textSize: 'sm'})}
                                className={`px-3 py-2 border rounded text-sm ${heroForm.textSize === 'sm' ? 'bg-black text-white border-black' : 'bg-white text-gray-500 border-gray-200'}`}
                              >
                                Malé
                              </button>
                              <button
                                onClick={() => setHeroForm({...heroForm, textSize: 'md'})}
                                className={`px-3 py-2 border rounded text-sm ${heroForm.textSize === 'md' ? 'bg-black text-white border-black' : 'bg-white text-gray-500 border-gray-200'}`}
                              >
                                Střední
                              </button>
                              <button
                                onClick={() => setHeroForm({...heroForm, textSize: 'lg'})}
                                className={`px-3 py-2 border rounded text-sm ${heroForm.textSize === 'lg' ? 'bg-black text-white border-black' : 'bg-white text-gray-500 border-gray-200'}`}
                              >
                                Velké
                              </button>
                            </div>
                          </div>

                          <div className="space-y-2">
                             <label className="text-xs uppercase tracking-widest text-gray-500">Barva textu</label>
                             <div className="flex items-center gap-2">
                                <input
                                  type="color"
                                  value={heroForm.textColor || '#000000'}
                                  onChange={(e) => setHeroForm({...heroForm, textColor: e.target.value})}
                                  className="w-8 h-8 p-0 border-0 rounded cursor-pointer"
                                />
                                <span className="text-xs text-gray-500 uppercase">{heroForm.textColor || '#000000'}</span>
                             </div>
                          </div>
                       </div>
                    </div>
                  </div>
               </div>

               <div className="space-y-8">
                  <div className="space-y-4">
                    <label className="text-xs uppercase tracking-widest text-gray-500">Média v pozadí (Hero Media)</label>

                    {/* Hero Image / Placeholder Section - ALWAYS SHOWN BEFORE VIDEO */}
                    <div className="bg-gray-50 p-6 rounded border border-gray-100 space-y-4">
                      <div className="flex items-center gap-3 mb-2">
                        <ImageIcon size={18} className="text-beige-600" />
                        <h3 className="text-sm font-medium uppercase tracking-widest">Úvodní obrázek (Placeholder)</h3>
                      </div>

                      <div className="relative group w-full aspect-video bg-white border-2 border-dashed border-gray-300 rounded flex flex-col items-center justify-center cursor-pointer hover:border-black hover:bg-gray-100 transition-colors overflow-hidden">
                        {heroForm.image ? (
                          <img src={heroForm.image} alt="Hero Background" className="w-full h-full object-cover" />
                        ) : (
                          <div className="text-center p-4 text-gray-400">
                            <Upload size={24} className="mx-auto mb-2" />
                            <span className="text-xs">Nahrát statický obrázek</span>
                            <p className="text-[10px] mt-2 text-gray-400">Doporučený poměr 16:9. Tento obrázek se zobrazí vždy jako první.</p>
                          </div>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleHeroImageUpload}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                         {heroForm.image && (
                           <div className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                             <span className="text-xs uppercase tracking-widest">Změnit obrázek</span>
                           </div>
                         )}
                      </div>
                    </div>

                    {/* Media Video Section */}
                    <div className="bg-gray-50 p-6 rounded border border-gray-100 space-y-4">
                      <div className="flex items-center gap-3 mb-2">
                        <FileVideo size={18} className="text-beige-600" />
                        <h3 className="text-sm font-medium uppercase tracking-widest">Video pozadí (Volitelné)</h3>
                      </div>

                      <div className="space-y-4">
                        <div className="relative group w-full aspect-video bg-white border-2 border-dashed border-gray-300 rounded flex flex-col items-center justify-center cursor-pointer hover:border-black hover:bg-gray-50 transition-colors overflow-hidden">
                           {heroForm.video ? (
                             <>
                               <video src={heroForm.video} autoPlay loop muted className="w-full h-full object-cover" />
                               <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                 <span className="text-xs text-white uppercase tracking-widest">Změnit video</span>
                               </div>
                               <button
                                 onClick={(e) => { e.stopPropagation(); handleRemoveVideo(); }}
                                 className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-20"
                                 title="Odstranit video"
                               >
                                 <Trash2 size={16} />
                               </button>
                             </>
                           ) : (
                             <div className="text-center p-4 text-gray-400">
                               <Upload size={24} className="mx-auto mb-2" />
                               <span className="text-xs">Nahrát video (MP4)</span>
                               <p className="text-[10px] mt-2 text-gray-400">Doporučený poměr 16:9, max 20MB. Video se načte na pozadí obrázku.</p>
                             </div>
                           )}
                           <input
                             type="file"
                             accept="video/mp4,video/webm"
                             onChange={handleVideoUpload}
                             className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                           />
                        </div>
                      </div>
                    </div>
                  </div>
               </div>
             </div>
              <div className="mt-8">
                <Button onClick={handleSaveContent}>Uložit změny</Button>
              </div>
           </div>
        )}

        {/* --- PROJECTS TAB --- */}
        {activeTab === 'projects' && (
          <div className="space-y-6">
            {!editingProject ? (
              <>
                <div className="flex justify-between items-center">
                  <h2 className="text-xl">Seznam projektů</h2>
                  <Button onClick={createNewProject}>
                    <Plus size={16} /> Přidat projekt
                  </Button>
                </div>

                <div className="bg-white rounded shadow-sm border border-gray-200 overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                      <tr>
                        <th className="w-10 p-4"></th>
                        <th className="p-4 font-normal">Náhled</th>
                        <th className="p-4 font-normal">Název</th>
                        <th className="p-4 font-normal">Kategorie</th>
                        <th className="p-4 font-normal">Lokace / Rok</th>
                        <th className="p-4 font-normal text-right">Akce</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {projects.map((project, index) => (
                        <tr
                          key={project.id}
                          className={`hover:bg-gray-50 transition-colors ${draggedProjectIndex === index ? 'opacity-40 bg-gray-100' : ''}`}
                          draggable
                          onDragStart={(e) => handleProjectDragStart(e, index)}
                          onDragOver={handleProjectDragOver}
                          onDrop={(e) => handleProjectDrop(e, index)}
                        >
                          <td className="p-4 text-gray-300 cursor-move">
                            <GripVertical size={16} />
                          </td>
                          <td className="p-4 w-24">
                            {project.thumbnail ? (
                              <img src={project.thumbnail} alt="" className="w-16 h-10 object-cover rounded-sm border border-gray-100" />
                            ) : (
                              <div className="w-16 h-10 bg-gray-100 rounded-sm flex items-center justify-center">
                                <ImageIcon size={16} className="text-gray-300"/>
                              </div>
                            )}
                          </td>
                          <td className="p-4 font-medium">{project.title || 'Beze jména'}</td>
                          <td className="p-4 text-gray-500 text-sm">{project.category || '—'}</td>
                          <td className="p-4 text-gray-500">{project.location}, {project.year}</td>
                          <td className="p-4 text-right space-x-2">
                            <button onClick={() => setEditingProject(project)} className="p-2 text-gray-400 hover:text-blue-600">
                              <Edit2 size={16} />
                            </button>
                            <button onClick={() => handleDeleteProject(project.id)} className="p-2 text-gray-400 hover:text-red-600">
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="bg-white p-8 rounded shadow-sm border border-gray-200 animate-in slide-in-from-bottom-2">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl">{editingProject.title ? 'Upravit projekt' : 'Nový projekt'}</h2>
                  <button onClick={() => setEditingProject(null)} className="text-gray-400 hover:text-black">
                    <X size={24} />
                  </button>
                </div>

                <form onSubmit={handleSaveProject} className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Left Column: Text Data */}
                    <div className="space-y-6">
                      <div className="space-y-1">
                        <label className="text-xs uppercase tracking-widest text-gray-500">Název projektu</label>
                        <input
                          className={inputBaseStyle}
                          value={editingProject.title}
                          onChange={e => setEditingProject({...editingProject, title: e.target.value})}
                          required
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs uppercase tracking-widest text-gray-500">Kategorie</label>
                        <select
                          className={inputBaseStyle}
                          value={editingProject.category || ""}
                          onChange={e => setEditingProject({...editingProject, category: e.target.value})}
                        >
                          <option value="">Vyberte kategorii</option>
                          {CATEGORIES.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs uppercase tracking-widest text-gray-500">Lokace</label>
                        <input
                          className={inputBaseStyle}
                          value={editingProject.location}
                          onChange={e => setEditingProject({...editingProject, location: e.target.value})}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs uppercase tracking-widest text-gray-500">Rok</label>
                        <input
                          className={inputBaseStyle}
                          value={editingProject.year}
                          onChange={e => setEditingProject({...editingProject, year: e.target.value})}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs uppercase tracking-widest text-gray-500">Popis</label>
                        <textarea
                          rows={5}
                          className={`${inputBaseStyle} resize-none`}
                          value={editingProject.description}
                          onChange={e => setEditingProject({...editingProject, description: e.target.value})}
                        />
                      </div>
                    </div>

                    {/* Right Column: Images */}
                    <div className="space-y-6">
                      {/* Thumbnail Upload & Crop */}
                      <div className="space-y-2">
                         <label className="text-xs uppercase tracking-widest text-gray-500">Hlavní obrázek (Thumbnail)</label>

                         <div className="flex gap-4 items-start">
                            {/* Preview Area */}
                            <div className="w-2/3 aspect-[3/2] bg-gray-50 border border-gray-200 rounded overflow-hidden flex items-center justify-center">
                                {editingProject.thumbnail ? (
                                  <img src={editingProject.thumbnail} alt="Thumbnail" className="w-full h-full object-cover" />
                                ) : (
                                  <ImageIcon size={32} className="text-gray-300" />
                                )}
                            </div>

                            {/* Actions */}
                            <div className="flex flex-col gap-2">
                                <div className="relative overflow-hidden">
                                  <Button type="button" variant="secondary" className="w-full">
                                    <Upload size={14} /> Nahrát
                                  </Button>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleThumbnailUpload}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                  />
                                </div>

                                {editingProject.thumbnail && (
                                  <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={openThumbnailCropper}
                                    className="w-full"
                                    title="Oříznout a posunout"
                                  >
                                    <Crop size={14} /> Upravit
                                  </Button>
                                )}
                            </div>
                         </div>
                      </div>

                      {/* Gallery Upload & Reorder */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center mb-2">
                          <label className="text-xs uppercase tracking-widest text-gray-500">Galerie médií</label>
                          <div className="flex gap-4">
                            <label className="cursor-pointer text-xs uppercase tracking-widest text-blue-600 hover:text-black transition-colors flex items-center gap-1">
                              <ImageIcon size={12} /> Přidat fotky
                              <input
                                type="file"
                                multiple
                                accept="image/*"
                                onChange={handleGalleryUpload}
                                className="hidden"
                              />
                            </label>
                            <label className="cursor-pointer text-xs uppercase tracking-widest text-teal-600 hover:text-black transition-colors flex items-center gap-1">
                              <Video size={12} /> Přidat video
                              <input
                                type="file"
                                multiple
                                accept="video/mp4,video/webm"
                                onChange={handleGalleryVideoUpload}
                                className="hidden"
                              />
                            </label>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          {editingProject.images.map((img, idx) => {
                            const isVid = isVideoSource(img);
                            return (
                              <div
                                key={idx}
                                className={`relative aspect-square group bg-gray-100 rounded overflow-hidden cursor-move ring-inset ${draggedIndex === idx ? 'opacity-50 ring-2 ring-black bg-gray-200' : 'hover:ring-1 hover:ring-gray-300'}`}
                                draggable
                                onDragStart={(e) => handleDragStart(e, idx)}
                                onDragOver={(e) => handleDragOver(e, idx)}
                                onDrop={(e) => handleDrop(e, idx)}
                              >
                                {isVid ? (
                                  <div className="w-full h-full bg-black relative">
                                    <video src={img} muted className="w-full h-full object-cover" />
                                    <div className="absolute top-1 left-1 bg-black/50 text-white p-1 rounded">
                                      <Video size={12} />
                                    </div>
                                  </div>
                                ) : (
                                  <img src={img} alt={`Gallery ${idx}`} className="w-full h-full object-cover pointer-events-none" />
                                )}

                                <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <GripHorizontal className="text-white drop-shadow-md" size={24} />
                                </div>

                                <button
                                  type="button"
                                  onClick={() => removeGalleryImage(idx)}
                                  className="absolute top-1 right-1 bg-white/80 p-1 rounded-full text-red-600 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white z-10"
                                >
                                  <X size={12} />
                                </button>
                              </div>
                            );
                          })}
                          {editingProject.images.length === 0 && (
                            <div className="col-span-3 py-8 text-center text-gray-400 text-sm italic bg-gray-50 rounded border border-dashed border-gray-200">
                              Žádné položky v galerii. Přidejte fotky nebo videa.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 flex gap-4 border-t border-gray-100">
                    <Button type="submit">Uložit projekt</Button>
                    <Button type="button" variant="secondary" onClick={() => setEditingProject(null)}>Zrušit</Button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}

        {/* --- ATELIER TAB --- */}
        {activeTab === 'atelier' && (
           <div className="bg-white p-8 rounded shadow-sm border border-gray-200">
             <h2 className="text-xl mb-8">Editace: Atelier</h2>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
               <div className="space-y-8">
                  <div className="space-y-1">
                     <label className="text-xs uppercase tracking-widest text-gray-500">Nadpis</label>
                     <input
                       className={inputBaseStyle}
                       value={atelierForm.title}
                       onChange={e => setAtelierForm({...atelierForm, title: e.target.value})}
                     />
                  </div>
                   <div className="space-y-1">
                     <label className="text-xs uppercase tracking-widest text-gray-500">Úvodní text</label>
                     <textarea
                       rows={6}
                       className={`${inputBaseStyle} resize-none`}
                       value={atelierForm.intro}
                       onChange={e => setAtelierForm({...atelierForm, intro: e.target.value})}
                     />
                  </div>
                  <div className="space-y-1">
                     <label className="text-xs uppercase tracking-widest text-gray-500">Filosofie</label>
                     <input
                       className={inputBaseStyle}
                       value={atelierForm.philosophy}
                       onChange={e => setAtelierForm({...atelierForm, philosophy: e.target.value})}
                     />
                  </div>
                   <div className="space-y-1">
                     <label className="text-xs uppercase tracking-widest text-gray-500">Služby (oddělené čárkou)</label>
                     <input
                       className={inputBaseStyle}
                       value={atelierForm.services.join(', ')}
                       onChange={e => setAtelierForm({...atelierForm, services: e.target.value.split(',').map(s => s.trim())})}
                     />
                  </div>
               </div>

               <div className="space-y-4">
                  <label className="text-xs uppercase tracking-widest text-gray-500">Hlavní obrázek</label>
                   {/* 3:4 Aspect Ratio Preview for Atelier */}
                   <div className="relative group w-full max-w-sm mx-auto aspect-[3/4] bg-gray-50 border-2 border-dashed border-gray-300 rounded flex flex-col items-center justify-center cursor-pointer hover:border-black hover:bg-gray-100 transition-colors overflow-hidden">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleAtelierImageUpload}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      />
                      {atelierForm.image ? (
                        <img src={atelierForm.image} alt="Atelier" className="w-full h-full object-cover" />
                      ) : (
                        <div className="text-center p-4 text-gray-400">
                          <Upload size={24} className="mx-auto mb-2" />
                          <span className="text-xs">Nahrát obrázek (3:4)</span>
                        </div>
                      )}
                       {atelierForm.image && (
                         <div className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                           <span className="text-xs uppercase tracking-widest">Upravit pozici</span>
                         </div>
                       )}
                   </div>
               </div>
             </div>
              <div className="mt-8">
                <Button onClick={handleSaveContent}>Uložit změny</Button>
              </div>
           </div>
        )}

        {/* --- CONTACT TAB --- */}
         {activeTab === 'contact' && (
           <div className="bg-white p-8 rounded shadow-sm border border-gray-200">
             <h2 className="text-xl mb-8">Editace: Kontakt</h2>
             <div className="space-y-8 max-w-xl">
                <div className="space-y-1">
                   <label className="text-xs uppercase tracking-widest text-gray-500">Adresa</label>
                   <input
                     className={inputBaseStyle}
                     value={contactForm.address}
                     onChange={e => setContactForm({...contactForm, address: e.target.value})}
                   />
                </div>
                <div className="space-y-1">
                   <label className="text-xs uppercase tracking-widest text-gray-500">Email</label>
                   <input
                     className={inputBaseStyle}
                     value={contactForm.email}
                     onChange={e => setContactForm({...contactForm, email: e.target.value})}
                   />
                </div>
                 <div className="space-y-1">
                   <label className="text-xs uppercase tracking-widest text-gray-500">Telefon</label>
                   <input
                     className={inputBaseStyle}
                     value={contactForm.phone}
                     onChange={e => setContactForm({...contactForm, phone: e.target.value})}
                   />
                </div>
                <Button onClick={handleSaveContent}>Uložit změny</Button>
             </div>
           </div>
        )}

        {/* --- SEO TAB --- */}
        {activeTab === 'seo' && (
          <div className="bg-white p-8 rounded shadow-sm border border-gray-200 space-y-8 animate-in fade-in duration-300">
             <div className="flex items-center gap-3 mb-4">
                <Search size={24} className="text-blue-600" />
                <h2 className="text-xl">SEO a Optimalizace pro vyhledávače</h2>
             </div>

             <div className="max-w-2xl space-y-10">
                {/* Custom Title */}
                <div className="space-y-2">
                   <label className="text-xs uppercase tracking-widest text-gray-500">Titulek stránky (Meta Title)</label>
                   <input
                      type="text"
                      className={inputBaseStyle}
                      value={seoForm.title}
                      onChange={e => setSeoForm({...seoForm, title: e.target.value})}
                      placeholder="Např: ATELIER HAJNÝ | Špičková architektura"
                   />
                   <p className="text-[10px] text-gray-400 mt-1 uppercase">Doporučená délka: 50-60 znaků.</p>
                </div>

                {/* Tag-based Keywords Manager */}
                <div className="space-y-4">
                   <label className="text-xs uppercase tracking-widest text-gray-500 flex items-center gap-2">
                      <Tag size={12} /> Klíčová slova (Keywords)
                   </label>

                   <div className="flex gap-2">
                      <input
                        type="text"
                        className={`${inputBaseStyle} flex-1`}
                        value={newKeyword}
                        onChange={e => setNewKeyword(e.target.value)}
                        onKeyDown={handleKeywordKeyDown}
                        placeholder="Přidat klíčové slovo..."
                      />
                      <Button variant="secondary" onClick={addKeyword}>Přidat</Button>
                   </div>

                   <div className="flex flex-wrap gap-2 mt-4 p-4 bg-gray-50 rounded border border-dashed border-gray-200 min-h-[100px] items-start">
                      {keywordsList.map((kw, i) => (
                        <span
                          key={i}
                          className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-gray-200 text-xs shadow-sm hover:border-black transition-colors"
                        >
                          {kw}
                          <button onClick={() => removeKeyword(kw)} className="text-gray-400 hover:text-red-500 transition-colors">
                            <X size={14} />
                          </button>
                        </span>
                      ))}
                      {keywordsList.length === 0 && (
                        <p className="text-xs text-gray-400 italic w-full text-center mt-4">Žádná klíčová slova zatím nebyla přidána.</p>
                      )}
                   </div>
                   <p className="text-[10px] text-gray-400 uppercase">Klíčová slova pomáhají vyhledávačům kategorizovat váš web.</p>
                </div>

                {/* Meta Description */}
                <div className="space-y-2">
                   <label className="text-xs uppercase tracking-widest text-gray-500">Popis webu (Meta Description)</label>
                   <textarea
                      rows={4}
                      className={`${inputBaseStyle} resize-none`}
                      value={seoForm.description}
                      onChange={e => setSeoForm({...seoForm, description: e.target.value})}
                      placeholder="Krátký text, který se zobrazí ve výsledcích vyhledávání..."
                   />
                   <p className="text-[10px] text-gray-400 mt-1 uppercase">Ideální rozsah: 150-160 znaků.</p>
                </div>

                <div className="pt-6">
                   <Button onClick={handleSaveContent} className="px-12">Uložit SEO nastavení</Button>
                </div>
             </div>
          </div>
        )}

        {/* --- SETTINGS TAB --- */}
        {activeTab === 'settings' && (
           <div className="bg-white p-8 rounded shadow-sm border border-gray-200 space-y-12">

             {/* Branding Settings */}
             <div className="max-w-4xl">
                <h2 className="text-xl mb-6">Značka a grafika</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">

                  {/* Logo Upload */}
                  <div className="space-y-4">
                    <div className="flex items-end gap-6">
                      <div className="space-y-2">
                        <label className="text-xs uppercase tracking-widest text-gray-500">Logo společnosti</label>
                        <div className="relative group w-48 h-32 bg-gray-50 border-2 border-dashed border-gray-300 rounded flex flex-col items-center justify-center cursor-pointer hover:border-black hover:bg-gray-100 transition-colors overflow-hidden">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleLogoUpload}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            />
                            {brandingForm.logo ? (
                              <img src={brandingForm.logo} alt="Logo" className="w-full h-full object-contain p-2" />
                            ) : (
                              <div className="text-center p-4 text-gray-400">
                                <Upload size={24} className="mx-auto mb-2" />
                                <span className="text-xs">Vybrat soubor</span>
                              </div>
                            )}
                        </div>
                      </div>

                      {brandingForm.logo && (
                        <button
                          onClick={handleRemoveLogo}
                          className="text-red-500 hover:text-red-700 text-sm flex items-center gap-1 mb-2"
                        >
                          <Trash2 size={16} /> Odstranit
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-gray-400">
                      Logo bude automaticky zmenšeno na výšku navigační lišty při zachování poměru stran.
                    </p>
                  </div>

                  {/* Favicon Upload */}
                  <div className="space-y-4">
                    <div className="flex items-end gap-6">
                      <div className="space-y-2">
                        <label className="text-xs uppercase tracking-widest text-gray-500">Favicon (Ikona prohlížeče)</label>
                        <div className="relative group w-32 h-32 bg-gray-50 border-2 border-dashed border-gray-300 rounded flex flex-col items-center justify-center cursor-pointer hover:border-black hover:bg-gray-100 transition-colors overflow-hidden">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleFaviconUpload}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            />
                            {brandingForm.favicon ? (
                              <img src={brandingForm.favicon} alt="Favicon" className="w-16 h-16 object-contain" />
                            ) : (
                              <div className="text-center p-4 text-gray-400">
                                <Upload size={24} className="mx-auto mb-2" />
                                <span className="text-xs">Vybrat soubor</span>
                              </div>
                            )}
                        </div>
                      </div>

                      {brandingForm.favicon && (
                        <button
                          onClick={handleRemoveFavicon}
                          className="text-red-500 hover:text-red-700 text-sm flex items-center gap-1 mb-2"
                        >
                          <Trash2 size={16} /> Odstranit
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-gray-400">
                      Doporučený formát: čtvercový PNG nebo ICO. Zobrazí se v záložce prohlížeče.
                    </p>
                  </div>

                </div>
             </div>

             {/* Analytics Settings */}
             <div className="border-t border-gray-100 pt-8 max-w-xl">
               <h2 className="text-xl mb-6 flex items-center gap-2">
                 <BarChart size={20} className="text-teal-600" />
                 Analytika
               </h2>
               <div className="space-y-6">
                  <div className="space-y-1">
                     <label className="text-xs uppercase tracking-widest text-gray-500">Google Analytics Measurement ID</label>
                     <input
                       type="text"
                       className={inputBaseStyle}
                       value={analyticsForm.googleId}
                       onChange={e => setAnalyticsForm({...analyticsForm, googleId: e.target.value})}
                       placeholder="G-XXXXXXXXXX"
                     />
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Zadejte ID měření pro Google Analytics 4. ID naleznete v administraci Google Analytics v sekci Datové streamy.
                    ID musí začínat písmenem <strong>G-</strong>. Tracking script bude automaticky vložen do hlavičke webu.
                  </p>
                  <Button onClick={handleSaveContent}>Uložit nastavení analytiky</Button>
               </div>
             </div>

             <div className="border-t border-gray-100 pt-8 max-w-xl">
               <h2 className="text-xl mb-6">Zabezpečení</h2>
               <form onSubmit={handleChangePassword} className="space-y-8">
                  <div className="space-y-1">
                     <label className="text-xs uppercase tracking-widest text-gray-500">Nové heslo do administrace</label>
                     <input
                       type="password"
                       className={inputBaseStyle}
                       value={newPassword}
                       onChange={e => setNewPassword(e.target.value)}
                       placeholder="Zadejte nové heslo..."
                     />
                  </div>
                  <Button type="submit">Změnit heslo</Button>
               </form>
             </div>

           </div>
        )}

      </div>
    </div>
  );
};