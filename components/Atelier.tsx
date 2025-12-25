
import React, { useEffect, useRef } from 'react';
import { SiteContent } from '../types';

interface AtelierProps {
  content: SiteContent['atelier'];
}

export const Atelier: React.FC<AtelierProps> = ({ content }) => {
  return (
    <div className="w-full max-w-[95%] md:max-w-[75%] mx-auto px-6 py-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="w-full">
        
        <h1 className="text-2xl md:text-3xl text-gray-900 mb-12 uppercase tracking-widest">{content.title}</h1>

        {/* Optimized 3:4 Portrait Image - Aligned Left */}
        <div className="mb-16 w-full md:max-w-lg mr-auto aspect-[3/4] bg-gray-100 relative overflow-hidden shadow-sm">
           <img 
              src={content.image} 
              alt="Studio interior" 
              className="w-full h-full object-cover opacity-90"
            />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-24 text-left">
          <div className="space-y-6 text-lg leading-relaxed text-gray-600">
            <p className="whitespace-pre-wrap">{content.intro}</p>
          </div>
          
          <div className="space-y-8">
            <div>
              <h3 className="text-sm uppercase tracking-widest text-gray-900 mb-2">Filosofie</h3>
              <p className="text-gray-500">{content.philosophy}</p>
            </div>
            
            <div>
              <h3 className="text-sm uppercase tracking-widest text-gray-900 mb-2">Služby</h3>
              <ul className="text-gray-500 space-y-1">
                {content.services.map((service, index) => (
                  <li key={index}>{service}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
