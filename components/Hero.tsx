
import React from 'react';
import { ArrowDown } from 'lucide-react';
import { SiteContent } from '../types';

interface HeroProps {
  onScrollDown: () => void;
  onContact: () => void;
  content: SiteContent['hero'];
}

export const Hero: React.FC<HeroProps> = ({ onScrollDown, onContact, content }) => {
  const positionClasses = {
    // Top
    'top-left': 'justify-start items-start text-left',
    'top-center': 'justify-start items-center text-center',
    'top-right': 'justify-start items-end text-right',
    
    // Middle
    'middle-left': 'justify-center items-start text-left',
    'center': 'justify-center items-center text-center',
    'middle-right': 'justify-center items-end text-right',
    
    // Bottom
    'bottom-left': 'justify-end items-start text-left',
    'bottom-center': 'justify-end items-center text-center',
    'bottom-right': 'justify-end items-end text-right',
  };

  const sizeClasses = {
    'sm': { title: 'text-3xl md:text-4xl', subtitle: 'text-base md:text-lg' },
    'md': { title: 'text-4xl md:text-6xl', subtitle: 'text-lg md:text-xl' },
    'lg': { title: 'text-5xl md:text-7xl', subtitle: 'text-xl md:text-2xl' },
  };

  const pos = content.textPosition || 'center';
  const size = content.textSize || 'lg';
  const textColor = content.textColor || '#000000';

  // Determine alignment for the subtitle button based on parent position
  const isCentered = pos.includes('center');
  const isRight = pos.includes('right');
  const subtitleAlign = isCentered ? 'text-center mx-auto' : isRight ? 'text-right ml-auto' : 'text-left mr-auto';

  return (
    <div className="relative w-full h-[85vh] overflow-hidden bg-white">
      {/* Background Media */}
      <div className="absolute inset-0">
        {content.video ? (
          <video 
            src={content.video} 
            autoPlay 
            loop 
            muted 
            playsInline 
            className="w-full h-full object-cover transition-opacity duration-1000"
            onLoadedData={(e) => (e.currentTarget.style.opacity = '1')}
            style={{ opacity: 0 }}
          />
        ) : content.image ? (
          <img 
            src={content.image} 
            alt="Hero Background" 
            className="w-full h-full object-cover"
          />
        ) : null}
      </div>

      {/* Content Container - Aligned with Grid */}
      <div className="absolute inset-0 pointer-events-none">
        <div className={`w-full h-full max-w-[95%] md:max-w-[75%] mx-auto px-6 pt-32 pb-24 flex flex-col ${positionClasses[pos] || positionClasses['center']}`}>
          <div 
            className={`max-w-3xl flex flex-col space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-1000 pointer-events-auto ${isCentered ? 'items-center' : isRight ? 'items-end' : 'items-start'}`}
            style={{ color: textColor }}
          >
            {content.title && (
              <h1 className={`${sizeClasses[size].title} font-extralight tracking-tight whitespace-pre-line leading-tight`}>
                {content.title}
              </h1>
            )}
            {content.subtitle && (
              <button 
                onClick={onContact}
                className={`${sizeClasses[size].subtitle} ${subtitleAlign} font-light tracking-wide max-w-xl leading-relaxed hover:opacity-100 transition-opacity cursor-pointer block outline-none border-none bg-transparent p-0`}
                style={{ opacity: 0.8, color: textColor }}
              >
                {content.subtitle}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <button 
        onClick={onScrollDown}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 hover:opacity-60 transition-opacity animate-bounce hidden md:block z-10 p-2 cursor-pointer"
        aria-label="Posunout dolů"
        style={{ color: textColor }}
      >
        <ArrowDown size={32} strokeWidth={1} />
      </button>
    </div>
  );
};
