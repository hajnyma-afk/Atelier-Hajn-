import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Project, AtelierBlock } from '../types';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { createSlug } from '../utils/slug';

interface ProjectGalleryProps {
  project: Project;
  allProjects: Project[];
  onClose: () => void;
  onSelect: (project: Project) => void;
}

export const ProjectGallery: React.FC<ProjectGalleryProps> = ({ project, allProjects, onClose, onSelect }) => {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);

  // -- Infinite Swipe State --
  const [baseTranslate, setBaseTranslate] = useState(-100);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [enableTransition, setEnableTransition] = useState(false);

  const touchStart = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Helper to check if a source string is a video or youtube link
  const isVideoSource = (src: string) => src.startsWith('data:video/') || src.endsWith('.mp4') || src.endsWith('.webm');
  const isYouTubeSource = (src: string) => src.includes('youtube.com') || src.includes('youtu.be');

  const getYouTubeEmbedUrl = (url: string) => {
    let videoId = '';
    if (url.includes('v=')) {
      videoId = url.split('v=')[1].split('&')[0];
    } else if (url.includes('youtu.be/')) {
      videoId = url.split('youtu.be/')[1].split('?')[0];
    } else if (url.includes('embed/')) {
      videoId = url.split('embed/')[1].split('?')[0];
    }
    return videoId ? `https://www.youtube.com/embed/${videoId}?rel=0&showinfo=0&autoplay=0` : url;
  };

  // Scroll to top when project changes
  useEffect(() => {
    window.scrollTo(0, 0);
    setCurrentIndex(0);
  }, [project.id]);

  const relatedProjects = useMemo(() => {
    const others = allProjects.filter(p => p.id !== project.id);
    const shuffled = [...others].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 2);
  }, [project.id, allProjects]);

  const getWrappedIndex = (idx: number) => {
    const len = project.images.length;
    if (len === 0) return 0;
    return ((idx % len) + len) % len;
  };

  const activeSlideIndices = [
    getWrappedIndex(currentIndex - 1),
    currentIndex,
    getWrappedIndex(currentIndex + 1)
  ];

  const updateIndex = (newIndex: number) => {
      setCurrentIndex(getWrappedIndex(newIndex));
  };

  const handleNext = () => updateIndex(currentIndex + 1);
  const handlePrev = () => updateIndex(currentIndex - 1);

  const onDesktopNext = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      setEnableTransition(false);
      setBaseTranslate(-100);
      setDragOffset(0);
      handleNext();
  };

  const onDesktopPrev = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      setEnableTransition(false);
      setBaseTranslate(-100);
      setDragOffset(0);
      handlePrev();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') onDesktopNext();
      if (e.key === 'ArrowLeft') onDesktopPrev();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, currentIndex]);

  const onTouchStart = (e: React.TouchEvent) => {
    if (project.images.length <= 1) return;
    if (enableTransition) return;

    touchStart.current = e.touches[0].clientX;
    setIsDragging(true);
    setDragOffset(0);
    setEnableTransition(false);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (touchStart.current === null || !isDragging) return;
    const currentX = e.touches[0].clientX;
    const diff = currentX - touchStart.current;
    setDragOffset(diff);
  };

  const onTouchEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    touchStart.current = null;

    const threshold = 50;
    if (Math.abs(dragOffset) > threshold) {
        if (dragOffset < 0) {
            finishSlide('next');
        } else {
            finishSlide('prev');
        }
    } else {
        finishSlide('stay');
    }
  };

  const finishSlide = (target: 'next' | 'prev' | 'stay') => {
      setEnableTransition(true);
      let targetTranslate = -100;
      if (target === 'next') targetTranslate = -200;
      if (target === 'prev') targetTranslate = 0;

      setBaseTranslate(targetTranslate);
      setDragOffset(0);

      if (target !== 'stay') {
          timerRef.current = setTimeout(() => {
              setEnableTransition(false);
              if (target === 'next') handleNext();
              if (target === 'prev') handlePrev();
              setBaseTranslate(-100);
          }, 500);
      } else {
           timerRef.current = setTimeout(() => {
              setEnableTransition(false);
          }, 500);
      }
  };

  useEffect(() => {
      return () => {
          if (timerRef.current) clearTimeout(timerRef.current);
      }
  }, []);

  const renderBlock = (block: AtelierBlock) => {
    const Wrapper = block.link ? 'a' : 'div';
    const wrapperProps = block.link
      ? { href: block.link, target: '_blank', rel: 'noopener noreferrer', className: 'block cursor-pointer hover:opacity-80 transition-opacity' }
      : { className: 'block' };

    if (block.type === 'image') {
      return (
        <Wrapper key={block.id} {...wrapperProps}>
          <div className="w-full mb-8">
            <img
              src={block.content}
              alt="Project content"
              className="w-full h-auto object-contain"
            />
          </div>
        </Wrapper>
      );
    }

    if (block.type === 'video') {
      return (
        <Wrapper key={block.id} {...wrapperProps}>
          <div className="w-full mb-8">
            <video
              src={block.content}
              autoPlay
              muted
              loop
              playsInline
              className="w-full h-auto"
            />
          </div>
        </Wrapper>
      );
    }

    if (block.type === 'youtube') {
      return (
        <Wrapper key={block.id} {...wrapperProps}>
          <div className="w-full aspect-video mb-8 bg-gray-100">
             <iframe
                src={getYouTubeEmbedUrl(block.content)}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title="YouTube video"
              />
          </div>
        </Wrapper>
      );
    }

    if (block.type === 'text') {
       return (
         <Wrapper key={block.id} {...wrapperProps}>
           <div className="whitespace-pre-wrap text-lg leading-relaxed text-gray-600 mb-8">
             {block.content}
           </div>
         </Wrapper>
       );
    }

    return null;
  };

  return (
    <div className="w-full bg-white animate-in fade-in duration-300 pb-12">
      <div className="max-w-[95%] md:max-w-[75%] mx-auto px-6 py-6 landscape:hidden lg:landscape:block">
        <button
          onClick={onClose}
          className="group flex items-center gap-2 text-sm uppercase tracking-widest text-gray-500 hover:text-black transition-colors"
        >
          <ChevronLeft size={16} strokeWidth={1} className="group-hover:-translate-x-1 transition-transform" />
          Zpět na přehled
        </button>
      </div>

      <div className="flex flex-col">
        {/* Gallery Carousel */}
        <div
          className="relative w-full h-[65vh] landscape:fixed landscape:inset-0 landscape:h-full landscape:z-[60] lg:h-[calc(100vh-180px)] lg:landscape:h-[calc(100vh-180px)] lg:landscape:relative lg:landscape:z-auto lg:landscape:inset-auto bg-white group touch-pan-y landscape:touch-none lg:landscape:touch-pan-y overflow-hidden"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {project.images.length > 1 && (
            <button
              onClick={onDesktopPrev}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-3 hover:bg-white/90 rounded-full transition-colors z-[70] hidden md:block opacity-0 group-hover:opacity-100 duration-300"
            >
              <ChevronLeft size={32} strokeWidth={1} />
            </button>
          )}

          {/* Carousel Track */}
          <div
            className={`flex h-full w-full ease-out md:transition-none ${enableTransition ? 'transition-transform duration-500' : ''}`}
            style={{
                transform: `translateX(calc(${baseTranslate}% + ${dragOffset}px))`
            }}
          >
             {activeSlideIndices.map((imgIndex, windowPos) => {
                 const src = project.images[imgIndex];
                 if (!src) return null;
                 const isVid = isVideoSource(src);
                 const isYT = isYouTubeSource(src);

                 return (
                    <div key={`${imgIndex}-${windowPos}`} className="w-full h-full flex-shrink-0 relative">
                       {isYT ? (
                         <div className="w-full h-full p-4 md:p-12">
                            <iframe
                              src={getYouTubeEmbedUrl(src)}
                              className="w-full h-full border-0 rounded shadow-lg"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                              title="YouTube video player"
                            />
                         </div>
                       ) : isVid ? (
                         <video
                           src={src}
                           autoPlay
                           loop
                           muted
                           playsInline
                           className="w-full h-full object-contain select-none bg-white"
                         />
                       ) : (
                         <img
                          src={src}
                          alt={`${project.title} view`}
                          className="w-full h-full object-contain select-none"
                          draggable={false}
                         />
                       )}
                    </div>
                 );
             })}
          </div>

          {project.images.length > 1 && (
            <button
              onClick={onDesktopNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-3 hover:bg-white/90 rounded-full transition-colors z-[70] hidden md:block opacity-0 group-hover:opacity-100 duration-300"
            >
              <ChevronRight size={32} strokeWidth={1} />
            </button>
          )}

          <div className="absolute bottom-4 left-0 right-0 text-center text-xs text-gray-500 tracking-widest md:hidden">
            {String(currentIndex + 1).padStart(2, '0')} / {String(project.images.length).padStart(2, '0')}
          </div>
        </div>

        <div className="w-full bg-white py-16 px-6 landscape:hidden lg:landscape:block">
          <div className="max-w-[95%] md:max-w-[75%] mx-auto">
            <div className="flex flex-col md:flex-row md:justify-between md:items-baseline mb-8 pb-8 border-b border-gray-100">
              <h1 className="text-3xl md:text-4xl text-gray-900 mb-2">{project.title}</h1>
              <div className="flex gap-6 text-sm text-gray-400 uppercase tracking-widest">
                <span>{project.year || '2024'}</span>
                <span>{project.location || 'Lokace'}</span>
              </div>
            </div>

            <div className="prose prose-lg prose-gray max-w-none text-gray-600 leading-relaxed mb-12">
              <p>
                {project.description || "Minimalistický přístup k prostoru definuje tento projekt. Čisté linie, přirozené světlo a upřímné materiály vytvářejí atmosféru klidu a soustředění."}
              </p>
            </div>

            {/* Custom Content Blocks */}
            {project.blocks && project.blocks.length > 0 && (
              <div className="flex flex-col gap-8 mb-16">
                 {project.blocks.map(renderBlock)}
              </div>
            )}

            {relatedProjects.length > 0 && (
              <div className="mt-12 border-t border-gray-100 pt-16">
                <h3 className="text-sm uppercase tracking-widest text-gray-400 mb-8">Další projekty</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {relatedProjects.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => {
                        onSelect(p);
                        const slug = createSlug(p.title || 'project');
                        navigate(`/project/${slug}`);
                      }}
                      className="group cursor-pointer flex flex-col gap-3"
                    >
                      <div className="relative w-full aspect-[3/2] overflow-hidden bg-gray-100">
                        <img
                          src={p.thumbnail}
                          alt={p.title}
                          className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                        />
                      </div>
                      <div className="flex justify-between items-baseline">
                        <h4 className="text-lg font-medium text-gray-900 group-hover:text-black transition-colors">
                          {p.title}
                        </h4>
                        <span className="text-xs text-gray-400 uppercase tracking-widest">{p.year}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};