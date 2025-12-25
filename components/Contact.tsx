import React from 'react';
import { SiteContent } from '../types';

interface ContactProps {
  content: SiteContent['contact'];
}

export const Contact: React.FC<ContactProps> = ({ content }) => {
  return (
    <div className="w-full max-w-[95%] md:max-w-[75%] mx-auto px-6 py-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="max-w-4xl">
        <h1 className="text-2xl md:text-3xl text-gray-900 mb-12 uppercase tracking-widest">Kontakt</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="space-y-12">
            <div>
              <h3 className="text-sm uppercase tracking-widest text-gray-400 mb-4">Adresa</h3>
              <p className="text-xl text-gray-900 whitespace-pre-line">
                {content.address}
              </p>
            </div>

            <div>
              <h3 className="text-sm uppercase tracking-widest text-gray-400 mb-4">Spojení</h3>
              <p className="text-xl text-gray-900 mb-2">
                <a href={`mailto:${content.email}`} className="hover:text-gray-500 transition-colors">{content.email}</a>
              </p>
              <p className="text-xl text-gray-900">
                <a href={`tel:${content.phone.replace(/\s/g, '')}`} className="hover:text-gray-500 transition-colors">{content.phone}</a>
              </p>
            </div>
          </div>

          <div className="bg-gray-50 p-8 md:p-12">
            <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
              <div>
                <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">Jméno</label>
                <input type="text" className="w-full bg-transparent border-b border-gray-300 py-2 focus:border-black focus:outline-none transition-colors" />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">Email</label>
                <input type="email" className="w-full bg-transparent border-b border-gray-300 py-2 focus:border-black focus:outline-none transition-colors" />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">Zpráva</label>
                <textarea rows={4} className="w-full bg-transparent border-b border-gray-300 py-2 focus:border-black focus:outline-none transition-colors resize-none"></textarea>
              </div>
              <button className="bg-black text-white px-8 py-3 text-sm uppercase tracking-widest hover:bg-beige-600 transition-colors w-full md:w-auto hover:text-white">
                Odeslat
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};