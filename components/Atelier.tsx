
import React from 'react';
import { SiteContent, AtelierBlock } from '../types';

interface AtelierProps {
  content: SiteContent['atelier'];
}

export const Atelier: React.FC<AtelierProps> = ({ content }) => {

  const getYouTubeEmbedUrl = (url: string) => {
    let videoId = '';
    if (url.includes('v=')) {
      videoId = url.split('v=')[1].split('&')[0];
    } else if (url.includes('youtu.be/')) {
      videoId = url.split('youtu.be/')[1].split('?')[0];
    } else if (url.includes('embed/')) {
      videoId = url.split('embed/')[1].split('?')[0];
    }
    return videoId ? `https://www.youtube.com/embed/${videoId}?rel=0&showinfo=0` : url;
  };
  
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
              alt="Atelier content" 
              className="w-full h-auto object-contain" // Keep original aspect ratio
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
    <div className="w-full max-w-[95%] md:max-w-[75%] mx-auto px-6 py-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="w-full">
        
        <h1 className="text-2xl md:text-3xl text-gray-900 mb-12 uppercase tracking-widest">{content.title}</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-24 text-left items-start">
          {/* Left Column */}
          <div className="w-full flex flex-col">
            {content.leftColumn.map(renderBlock)}
          </div>
          
          {/* Right Column */}
          <div className="w-full flex flex-col">
            {content.rightColumn.map(renderBlock)}
          </div>
        </div>
      </div>
    </div>
  );
};