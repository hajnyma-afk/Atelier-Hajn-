import React, { useState } from 'react';
import { ViewMode } from '../types';

interface HeaderProps {
  onNavigate: (view: ViewMode) => void;
  logo?: string;
}

export const Header: React.FC<HeaderProps> = ({ onNavigate, logo }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleNav = (view: ViewMode) => {
    onNavigate(view);
    setIsOpen(false);
  };

  return (
    <header className="w-full py-6 bg-white sticky top-0 z-50 transition-all duration-300">
      <div className="max-w-[95%] md:max-w-[75%] mx-auto px-6 flex justify-between items-center">
        {/* Company Logo */}
        <div 
          className="cursor-pointer select-none"
          onClick={() => handleNav('projects')}
        >
          {logo ? (
            <img src={logo} alt="Company Logo" className="h-8 w-auto object-contain" />
          ) : (
            <div className="text-2xl tracking-tighter uppercase">
              ATELIER <span className="text-gray-400">HAJNÝ</span>
            </div>
          )}
        </div>

        {/* Hamburger Menu & Navigation */}
        <div className="relative">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="w-10 h-10 flex items-center justify-center focus:outline-none z-50 relative"
            aria-label={isOpen ? "Zavřít menu" : "Otevřít menu"}
          >
            <div className="relative w-6 h-4">
              {/* Line 1 */}
              <span 
                className={`absolute left-0 w-full h-[1px] bg-black transform transition-all duration-300 ease-in-out ${isOpen ? 'top-1/2 -translate-y-1/2 rotate-45' : 'top-0'}`} 
              />
              {/* Line 2 */}
              <span 
                className={`absolute left-0 w-full h-[1px] bg-black transform transition-all duration-300 ease-in-out ${isOpen ? 'top-1/2 -translate-y-1/2 opacity-0' : 'top-1/2 -translate-y-1/2'}`} 
              />
              {/* Line 3 */}
              <span 
                className={`absolute left-0 w-full h-[1px] bg-black transform transition-all duration-300 ease-in-out ${isOpen ? 'top-1/2 -translate-y-1/2 -rotate-45' : 'bottom-0'}`} 
              />
            </div>
          </button>

          {/* Dropdown Menu */}
          {isOpen && (
            <div className="absolute right-0 top-full mt-2 z-40">
              <div className="bg-white border border-gray-100 shadow-2xl flex flex-col items-stretch animate-in slide-in-from-top-2 fade-in duration-300 origin-top-right min-w-[max-content]">
                <button 
                  onClick={() => handleNav('projects')}
                  className="text-center px-8 py-4 text-xs uppercase tracking-widest text-gray-500 hover:bg-beige-600 hover:text-white transition-colors whitespace-nowrap"
                >
                  Projekty
                </button>
                <button 
                  onClick={() => handleNav('atelier')}
                  className="text-center px-8 py-4 text-xs uppercase tracking-widest text-gray-500 hover:bg-beige-600 hover:text-white transition-colors whitespace-nowrap"
                >
                  Atelier
                </button>
                <button 
                  onClick={() => handleNav('contact')}
                  className="text-center px-8 py-4 text-xs uppercase tracking-widest text-gray-500 hover:bg-beige-600 hover:text-white transition-colors whitespace-nowrap"
                >
                  Kontakt
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};