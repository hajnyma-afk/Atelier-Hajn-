import React, { useState, useEffect } from 'react';
import { Project, SiteContent, AtelierBlock } from '../types';
import { Plus, Trash2, Edit2, LogOut, X, Upload, Image as ImageIcon, Crop, GripHorizontal, GripVertical, FileVideo, BarChart, Search, Tag, Video, List, Check, Youtube, Link as LinkIcon, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from './Button';
import { savePassword, uploadFile, uploadMultipleFiles, deleteProject, saveContent } from '../services/storage';
import { ImageCropper } from './ImageCropper';

interface AdminDashboardProps {
  projects: Project[];
  content: SiteContent;
  onUpdateProjects: (projects: Project[]) => void;
  onUpdateContent: (content: SiteContent) => void;
  onLogout: () => void;
}

type Tab = 'projects' | 'atelier' | 'contact' | 'settings' | 'home' | 'seo' | 'categories';

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
  const [categoriesList, setCategoriesList] = useState(content.categories || []);

  // -- Settings State --
  const [newPassword, setNewPassword] = useState('');
  const [brandingForm, setBrandingForm] = useState(content.branding || { logo: '', favicon: '' });
  const [analyticsForm, setAnalyticsForm] = useState(content.analytics || { googleId: '' });

  // -- SEO State --
  const [seoForm, setSeoForm] = useState(content.seo || { title: '', keywords: '', description: '' });
  const [newKeyword, setNewKeyword] = useState('');

  // -- Categories State --
  const [newCategoryName, setNewCategoryName] = useState('');
  const [renamingCategory, setRenamingCategory] = useState<string | null>(null);
  const [renamingValue, setRenamingValue] = useState('');

  // -- YouTube Input --
  const [ytLink, setYtLink] = useState('');

  // -- Cropper State --
  const [cropper, setCropper] = useState<{
    isOpen: boolean;
    imageSrc: string;
    target: 'thumbnail' | 'hero' | 'atelier'; // 'atelier' is now specific to a block ID if needed, but we handle blocks differently now. Kept for legacy or specific crop if implemented.
    aspectRatio: number;
    extraData?: any;
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
    setCategoriesList(content.categories || []);
  }, [content]);

  /**
   * Process and upload image:
   * 1. Resizes image if it exceeds targetMaxWidth (to save storage space)
   * 2. Automatically converts to .webp format for better compression
   * 3. Uploads to server and returns URL
   */
  const processAndUploadImage = (file: File, targetMaxWidth: number | 'original' = 1920, quality: number = 0.8): Promise<string> => {
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

          // Convert to Blob and upload to server
          canvas.toBlob(async (blob) => {
            if (!blob) return reject('Failed to create blob');

            try {
              const webpFile = new File([blob], file.name.replace(/\.[^/.]+$/, '.webp'), { type: 'image/webp' });
              const url = await uploadFile(webpFile);
              resolve(url);
            } catch (error) {
              reject(error);
            }
          }, 'image/webp', quality);
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

  // Helpers to detect source type
  const isVideoSource = (src: string) => src.startsWith('data:video/') || src.endsWith('.mp4') || src.endsWith('.webm');
  const isYouTubeSource = (src: string) => src.includes('youtube.com') || src.includes('youtu.be');

  const getYouTubeThumbnail = (url: string) => {
    let videoId = '';
    if (url.includes('v=')) {
      videoId = url.split('v=')[1].split('&')[0];
    } else if (url.includes('youtu.be/')) {
      videoId = url.split('youtu.be/')[1].split('?')[0];
    } else if (url.includes('embed/')) {
      videoId = url.split('embed/')[1].split('?')[0];
    }
    return videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : null;
  };

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

  const handleDeleteProject = async (id: string) => {
    if (window.confirm('Opravdu chcete tento projekt smazat?')) {
      try {
        await deleteProject(id);
        onUpdateProjects(projects.filter(p => p.id !== id));
      } catch (error) {
        console.error('Failed to delete project:', error);
        alert('Nepodařilo se smazat projekt. Zkuste to prosím znovu.');
      }
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
      category: categoriesList[0] || '',
      images: []
    });
  };

  // -- Handlers: Categories --
  const handleAddCategory = () => {
    const trimmed = newCategoryName.trim();
    if (trimmed && !categoriesList.includes(trimmed)) {
      const newList = [...categoriesList, trimmed];
      setCategoriesList(newList);
      onUpdateContent({ ...content, categories: newList });
      setNewCategoryName('');
    }
  };

  const handleRemoveCategory = (cat: string) => {
    if (window.confirm(`Opravdu chcete smazat kategorii "${cat}"? Projekty v této kategorii zůstanou, ale budou bez přiřazené kategorie.`)) {
      const newList = categoriesList.filter(c => c !== cat);
      setCategoriesList(newList);
      onUpdateContent({ ...content, categories: newList });
    }
  };

  const startRenaming = (cat: string) => {
    setRenamingCategory(cat);
    setRenamingValue(cat);
  };

  const handleRenameCategory = (oldName: string) => {
    const trimmed = renamingValue.trim();
    if (trimmed && trimmed !== oldName && !categoriesList.includes(trimmed)) {
      const newList = categoriesList.map(c => c === oldName ? trimmed : c);
      setCategoriesList(newList);

      // Update projects that use this category
      const updatedProjects = projects.map(p =>
        p.category === oldName ? { ...p, category: trimmed } : p
      );
      onUpdateProjects(updatedProjects);

      onUpdateContent({ ...content, categories: newList });
      setRenamingCategory(null);
    } else if (trimmed === oldName) {
      setRenamingCategory(null);
    } else if (categoriesList.includes(trimmed)) {
      alert("Kategorie s tímto názvem již existuje.");
    }
  };

  const handleCategoryDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('categoryIndex', index.toString());
  };

  const handleCategoryDrop = (e: React.DragEvent, dropIndex: number) => {
    const dragIndex = parseInt(e.dataTransfer.getData('categoryIndex'));
    if (dragIndex === dropIndex) return;

    const newList = [...categoriesList];
    const [draggedItem] = newList.splice(dragIndex, 1);
    newList.splice(dropIndex, 0, draggedItem);

    setCategoriesList(newList);
    onUpdateContent({ ...content, categories: newList });
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
        // Thumbnail will keep original resolution (optimized to WebP and uploaded to server)
        const imageUrl = await processAndUploadImage(e.target.files[0], 'original', 0.95);
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

  const handleAddYouTube = () => {
    const trimmed = ytLink.trim();
    if (!trimmed) return;
    if (editingProject) {
      setEditingProject({
        ...editingProject,
        images: [...editingProject.images, trimmed]
      });
      setYtLink('');
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
  // Updated Atelier Handlers
  const addAtelierBlock = (column: 'left' | 'right', type: 'text' | 'image' | 'youtube' | 'video') => {
    const newBlock: AtelierBlock = {
      id: crypto.randomUUID(),
      type,
      content: '',
      link: ''
    };

    if (column === 'left') {
      setAtelierForm(prev => ({ ...prev, leftColumn: [...prev.leftColumn, newBlock] }));
    } else {
      setAtelierForm(prev => ({ ...prev, rightColumn: [...prev.rightColumn, newBlock] }));
    }
  };

  const updateAtelierBlock = (column: 'left' | 'right', id: string, field: keyof AtelierBlock, value: string) => {
    const updater = (blocks: AtelierBlock[]) => blocks.map(b => b.id === id ? { ...b, [field]: value } : b);

    if (column === 'left') {
      setAtelierForm(prev => ({ ...prev, leftColumn: updater(prev.leftColumn) }));
    } else {
      setAtelierForm(prev => ({ ...prev, rightColumn: updater(prev.rightColumn) }));
    }
  };

  const removeAtelierBlock = (column: 'left' | 'right', id: string) => {
    const filter = (blocks: AtelierBlock[]) => blocks.filter(b => b.id !== id);
    if (column === 'left') {
      setAtelierForm(prev => ({ ...prev, leftColumn: filter(prev.leftColumn) }));
    } else {
      setAtelierForm(prev => ({ ...prev, rightColumn: filter(prev.rightColumn) }));
    }
  };

  const moveAtelierBlock = (column: 'left' | 'right', index: number, direction: 'up' | 'down') => {
    const list = column === 'left' ? [...atelierForm.leftColumn] : [...atelierForm.rightColumn];
    if (direction === 'up' && index > 0) {
      [list[index], list[index - 1]] = [list[index - 1], list[index]];
    } else if (direction === 'down' && index < list.length - 1) {
      [list[index], list[index + 1]] = [list[index + 1], list[index]];
    }

    if (column === 'left') {
      setAtelierForm(prev => ({ ...prev, leftColumn: list }));
    } else {
      setAtelierForm(prev => ({ ...prev, rightColumn: list }));
    }
  };

  const handleAtelierBlockImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, column: 'left' | 'right', id: string) => {
    if (e.target.files && e.target.files[0]) {
      try {
        // No forced crop or aspect ratio, just optimization
        const imageUrl = await processAndUploadImage(e.target.files[0], 'original');
        updateAtelierBlock(column, id, 'content', imageUrl);
        e.target.value = '';
      } catch (error) {
        alert("Chyba při nahrávání obrázku.");
      }
    }
  };

  const handleAtelierBlockVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>, column: 'left' | 'right', id: string) => {
    if (e.target.files && e.target.files[0]) {
      try {
        const videoData = await processAndUploadVideo(e.target.files[0]);
        updateAtelierBlock(column, id, 'content', videoData);
        e.target.value = '';
      } catch (error) {
        alert(typeof error === 'string' ? error : "Chyba při nahrávání videa.");
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
    } else if (cropper.target === 'hero') {
      setHeroForm({ ...heroForm, image: croppedImageUrl });
    }

    setCropper(null);
  };

  const handleSaveContent = async () => {
    const updatedContent = {
      ...content,
      atelier: atelierForm,
      contact: contactForm,
      branding: brandingForm,
      hero: heroForm,
      analytics: analyticsForm,
      seo: seoForm,
      categories: categoriesList
    };

    try {
      await saveContent(updatedContent);
      onUpdateContent(updatedContent);
      alert('Obsah uložen');
    } catch (error) {
      console.error('Failed to save content:', error);
      alert('Nepodařilo se uložit obsah. Zkuste to prosím znovu.');
    }
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
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.trim().length < 4) {
      alert("Heslo musí mít alespoň 4 znaky.");
      return;
    }
    await savePassword(newPassword);
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

  // Render Logic Helper for Atelier Columns
  const renderAtelierColumnEditor = (columnName: string, column: 'left' | 'right', blocks: AtelierBlock[]) => (
    <div className="flex-1 min-w-[300px] flex flex-col gap-4">
      <div className="flex justify-between items-center border-b border-gray-200 pb-2">
        <h3 className="font-medium uppercase tracking-widest text-sm">{columnName}</h3>
      </div>

      <div className="space-y-4">
        {blocks.map((block, index) => (
          <div key={block.id} className="bg-gray-50 p-4 rounded border border-gray-200 relative group">
            {/* Type Badge */}
            <div className="absolute top-2 right-2 flex gap-1">
              <button onClick={() => moveAtelierBlock(column, index, 'up')} disabled={index === 0} className="p-1 text-gray-400 hover:text-black disabled:opacity-30">
                <ArrowUp size={14} />
              </button>
              <button onClick={() => moveAtelierBlock(column, index, 'down')} disabled={index === blocks.length - 1} className="p-1 text-gray-400 hover:text-black disabled:opacity-30">
                <ArrowDown size={14} />
              </button>
              <button onClick={() => removeAtelierBlock(column, block.id)} className="p-1 text-gray-400 hover:text-red-500 ml-2">
                <Trash2 size={14} />
              </button>
            </div>

            <div className="mb-2 text-xs uppercase text-gray-400 font-bold flex items-center gap-2">
              {block.type === 'text' && <List size={12} />}
              {block.type === 'image' && <ImageIcon size={12} />}
              {block.type === 'youtube' && <Youtube size={12} />}
              {block.type === 'video' && <FileVideo size={12} />}

              {block.type === 'text' && 'Textový blok'}
              {block.type === 'image' && 'Obrázek'}
              {block.type === 'youtube' && 'YouTube Video'}
              {block.type === 'video' && 'Vlastní Video'}
            </div>

            {block.type === 'text' && (
              <textarea
                rows={4}
                className={`${inputBaseStyle} resize-none mb-2 text-sm`}
                value={block.content}
                onChange={(e) => updateAtelierBlock(column, block.id, 'content', e.target.value)}
                placeholder="Obsah textu..."
              />
            )}

            {block.type === 'image' && (
              <div className="mb-2">
                 <div className="relative w-full aspect-video bg-gray-200 flex items-center justify-center overflow-hidden rounded border border-gray-300">
                    {block.content ? (
                      <img src={block.content} alt="" className="w-full h-full object-contain" />
                    ) : (
                      <span className="text-xs text-gray-400">Žádný obrázek</span>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      onChange={(e) => handleAtelierBlockImageUpload(e, column, block.id)}
                    />
                 </div>
                 <p className="text-[10px] text-gray-400 mt-1">Klikněte pro nahrání/změnu. Původní poměr stran bude zachován.</p>
              </div>
            )}

            {block.type === 'video' && (
              <div className="mb-2">
                 <div className="relative w-full aspect-video bg-gray-200 flex items-center justify-center overflow-hidden rounded border border-gray-300">
                    {block.content ? (
                      <div className="relative w-full h-full group">
                         <video src={block.content} className="w-full h-full object-cover" muted loop autoPlay playsInline />
                         <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                            <span className="text-white text-xs uppercase tracking-widest">Změnit video</span>
                         </div>
                         <input
                           type="file"
                           accept="video/mp4,video/webm"
                           className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                           onChange={(e) => handleAtelierBlockVideoUpload(e, column, block.id)}
                         />
                      </div>
                    ) : (
                      <>
                        <div className="text-center p-2">
                           <FileVideo size={24} className="mx-auto text-gray-400 mb-1" />
                           <span className="text-xs text-gray-400">Nahrát video</span>
                        </div>
                        <input
                          type="file"
                          accept="video/mp4,video/webm"
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          onChange={(e) => handleAtelierBlockVideoUpload(e, column, block.id)}
                        />
                      </>
                    )}
                 </div>
                 <p className="text-[10px] text-gray-400 mt-1">Max 20MB. MP4/WebM.</p>
              </div>
            )}

            {block.type === 'youtube' && (
              <div className="mb-2">
                 <input
                  type="text"
                  className={`${inputBaseStyle} mb-2 text-sm`}
                  value={block.content}
                  onChange={(e) => updateAtelierBlock(column, block.id, 'content', e.target.value)}
                  placeholder="Vložte odkaz na YouTube..."
                 />
                 <p className="text-[10px] text-gray-400 mt-1">Podporované formáty: youtu.be, youtube.com/watch</p>
              </div>
            )}

            {/* Link Input for non-youtube/video types (optional, but requested by user flow for atelier, keeping it for video too if they want to link the whole block) */}
            {block.type !== 'youtube' && (
              <div className="flex items-center gap-2 mt-2">
                <LinkIcon size={12} className="text-gray-400" />
                <input
                  type="text"
                  className="bg-transparent text-xs border-b border-gray-300 w-full focus:outline-none py-1"
                  placeholder="Volitelný odkaz (https://...)"
                  value={block.link || ''}
                  onChange={(e) => updateAtelierBlock(column, block.id, 'link', e.target.value)}
                />
              </div>
            )}
          </div>
        ))}

        {blocks.length === 0 && (
          <div className="text-center py-8 text-gray-400 text-xs italic border border-dashed border-gray-300 rounded">
            Sloupec je prázdný
          </div>
        )}
      </div>

      <div className="flex gap-2 mt-2 flex-wrap">
        <Button variant="secondary" onClick={() => addAtelierBlock(column, 'text')} className="flex-1 text-xs min-w-[70px]">
          + Text
        </Button>
        <Button variant="secondary" onClick={() => addAtelierBlock(column, 'image')} className="flex-1 text-xs min-w-[70px]">
          + Obrázek
        </Button>
        <Button variant="secondary" onClick={() => addAtelierBlock(column, 'youtube')} className="flex-1 text-xs min-w-[70px]">
          + YouTube
        </Button>
        <Button variant="secondary" onClick={() => addAtelierBlock(column, 'video')} className="flex-1 text-xs min-w-[70px]">
          + Video
        </Button>
      </div>
    </div>
  );

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
            onClick={() => setActiveTab('categories')}
            className={`px-4 py-2 text-sm uppercase tracking-widest ${activeTab === 'categories' ? 'border-b-2 border-black text-black' : 'text-gray-400 hover:text-gray-600'}`}
          >
            Kategorie
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
                          {categoriesList.map(cat => (
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
                      <div className="space-y-4">
                        <div className="flex flex-col gap-4 mb-2">
                          <div className="flex justify-between items-center">
                            <label className="text-xs uppercase tracking-widest text-gray-500">Galerie médií</label>
                            <div className="flex gap-4">
                              <label className="cursor-pointer text-xs uppercase tracking-widest text-blue-600 hover:text-black transition-colors flex items-center gap-1">
                                <ImageIcon size={12} /> Fotky
                                <input
                                  type="file"
                                  multiple
                                  accept="image/*"
                                  onChange={handleGalleryUpload}
                                  className="hidden"
                                />
                              </label>
                              <label className="cursor-pointer text-xs uppercase tracking-widest text-teal-600 hover:text-black transition-colors flex items-center gap-1">
                                <Video size={12} /> Video
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

                          {/* YouTube Input Area */}
                          <div className="flex gap-2">
                            <div className="relative flex-1">
                               <div className="absolute left-3 top-1/2 -translate-y-1/2 text-red-600">
                                 <Youtube size={14} />
                               </div>
                               <input
                                 type="text"
                                 placeholder="Vložit YouTube odkaz..."
                                 className={`${inputBaseStyle} pl-9 text-xs`}
                                 value={ytLink}
                                 onChange={(e) => setYtLink(e.target.value)}
                                 onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddYouTube())}
                               />
                            </div>
                            <Button type="button" variant="secondary" onClick={handleAddYouTube} className="whitespace-nowrap h-full">
                              Přidat YT
                            </Button>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          {editingProject.images.map((img, idx) => {
                            const isVid = isVideoSource(img);
                            const isYT = isYouTubeSource(img);
                            const ytThumb = isYT ? getYouTubeThumbnail(img) : null;

                            return (
                              <div
                                key={idx}
                                className={`relative aspect-square group bg-gray-100 rounded overflow-hidden cursor-move ring-inset ${draggedIndex === idx ? 'opacity-50 ring-2 ring-black bg-gray-200' : 'hover:ring-1 hover:ring-gray-300'}`}
                                draggable
                                onDragStart={(e) => handleDragStart(e, idx)}
                                onDragOver={(e) => handleDragOver(e, idx)}
                                onDrop={(e) => handleDrop(e, idx)}
                              >
                                {isYT ? (
                                  <div className="w-full h-full bg-black relative">
                                    {ytThumb ? (
                                      <img src={ytThumb} className="w-full h-full object-cover opacity-60" alt="YT" />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center">
                                        <Youtube size={24} className="text-white opacity-40" />
                                      </div>
                                    )}
                                    <div className="absolute top-1 left-1 bg-red-600 text-white p-1 rounded shadow">
                                      <Youtube size={12} />
                                    </div>
                                  </div>
                                ) : isVid ? (
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
                              Žádné položky v galerii. Přidejte fotky, videa nebo YouTube odkazy.
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

        {/* --- CATEGORIES TAB --- */}
        {activeTab === 'categories' && (
          <div className="bg-white p-8 rounded shadow-sm border border-gray-200 space-y-8 animate-in fade-in duration-300">
            <div className="flex items-center gap-3 mb-4">
                <List size={24} className="text-beige-600" />
                <h2 className="text-xl">Správa kategorií projektů</h2>
             </div>

             <div className="max-w-2xl space-y-6">
                <p className="text-sm text-gray-500">Tyto kategorie se zobrazují v navigační liště projektů. Přetažením můžete měnit jejich pořadí.</p>

                <div className="flex gap-2">
                  <input
                    type="text"
                    className={`${inputBaseStyle} flex-1`}
                    value={newCategoryName}
                    onChange={e => setNewCategoryName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                    placeholder="Název nové kategorie..."
                  />
                  <Button onClick={handleAddCategory}>Přidat</Button>
                </div>

                <div className="space-y-2 mt-6">
                  {categoriesList.map((cat, index) => (
                    <div
                      key={cat}
                      className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded group hover:border-black transition-colors cursor-move"
                      draggable={!renamingCategory}
                      onDragStart={(e) => handleCategoryDragStart(e, index)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => handleCategoryDrop(e, index)}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <GripVertical size={16} className="text-gray-300" />
                        {renamingCategory === cat ? (
                          <div className="flex items-center gap-2 flex-1">
                            <input
                              autoFocus
                              type="text"
                              className="bg-white border border-black px-2 py-1 text-sm flex-1 outline-none"
                              value={renamingValue}
                              onChange={(e) => setRenamingValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleRenameCategory(cat);
                                if (e.key === 'Escape') setRenamingCategory(null);
                              }}
                            />
                            <button onClick={() => handleRenameCategory(cat)} className="text-green-600 hover:text-green-800">
                              <Check size={18} />
                            </button>
                            <button onClick={() => setRenamingCategory(null)} className="text-red-400 hover:text-red-600">
                              <X size={18} />
                            </button>
                          </div>
                        ) : (
                          <span className="text-sm">{cat}</span>
                        )}
                      </div>

                      {!renamingCategory && (
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => startRenaming(cat)}
                            className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                            title="Přejmenovat"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleRemoveCategory(cat)}
                            className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                            title="Smazat"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                  {categoriesList.length === 0 && (
                    <div className="py-12 text-center text-gray-400 italic bg-gray-50 rounded border border-dashed border-gray-200">
                      Žádné vlastní kategorie nebyly definovány.
                    </div>
                  )}
                </div>

                <div className="pt-6">
                   <Button onClick={handleSaveContent} className="px-12">Uložit kategorie</Button>
                </div>
             </div>
          </div>
        )}

        {/* --- ATELIER TAB --- */}
        {activeTab === 'atelier' && (
           <div className="bg-white p-8 rounded shadow-sm border border-gray-200">
             <div className="flex justify-between items-center mb-8">
               <h2 className="text-xl">Editace: Atelier (Dvousloupcové rozvržení)</h2>
               <Button onClick={handleSaveContent}>Uložit změny</Button>
             </div>

             <div className="mb-8 max-w-lg">
                <div className="space-y-1">
                   <label className="text-xs uppercase tracking-widest text-gray-500">Hlavní nadpis stránky</label>
                   <input
                     className={inputBaseStyle}
                     value={atelierForm.title}
                     onChange={e => setAtelierForm({...atelierForm, title: e.target.value})}
                   />
                </div>
             </div>

             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-start">
               {renderAtelierColumnEditor('Levý sloupec', 'left', atelierForm.leftColumn)}
               {renderAtelierColumnEditor('Pravý sloupec', 'right', atelierForm.rightColumn)}
             </div>

             <div className="mt-12 pt-8 border-t border-gray-100 flex justify-center">
                <Button onClick={handleSaveContent} className="px-12 py-3">Uložit kompletní obsah</Button>
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

                {/* Meta Description */}
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