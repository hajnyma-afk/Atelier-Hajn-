
import React, { useState } from 'react';
import { SiteContent } from '../types';
import { submitContactForm } from '../services/storage';

interface ContactProps {
  content: SiteContent['contact'];
}

export const Contact: React.FC<ContactProps> = ({ content }) => {
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent("Atelier Hajný s.r.o., Nitranská 19, 130 00 Praha 3")}`;
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.email.trim() || !formData.message.trim()) {
      setSubmitStatus({ type: 'error', message: 'Prosím vyplňte všechna pole.' });
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus({ type: null, message: '' });

    try {
      await submitContactForm(formData.name, formData.email, formData.message);
      setSubmitStatus({ type: 'success', message: 'Zpráva byla úspěšně odeslána. Děkujeme!' });
      setFormData({ name: '', email: '', message: '' });
    } catch (error) {
      setSubmitStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'Chyba při odesílání zprávy. Zkuste to prosím znovu.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-[95%] md:max-w-[75%] mx-auto px-6 py-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="max-w-5xl">
        <h1 className="text-2xl md:text-3xl text-gray-900 mb-12 uppercase tracking-widest">Kontakt</h1>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
          {/* Left Column: Contact Info & Instagram */}
          <div className="lg:col-span-5 space-y-16">
            <div className="space-y-12">
              <div>
                <h3 className="text-sm uppercase tracking-widest text-gray-400 mb-4">Adresa</h3>
                <a
                  href={googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xl text-gray-900 whitespace-pre-line leading-relaxed hover:text-beige-600 transition-colors block"
                >
                  {content.address}
                </a>
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

            {/* Instagram Feed Section */}
            <div className="pt-8 border-t border-gray-100">
              <h3 className="text-sm uppercase tracking-widest text-gray-400 mb-6">Instagram</h3>
              <div className="w-full max-w-[400px] bg-gray-50 rounded-sm overflow-hidden shadow-sm border border-gray-100">
                <iframe
                  src="https://www.instagram.com/atelierhajny/embed/"
                  className="w-full h-[500px]"
                  frameBorder="0"
                  scrolling="no"
                  allowTransparency={true}
                  allow="encrypted-media"
                  title="Instagram Feed"
                ></iframe>
                <div className="p-4 bg-white text-center border-t border-gray-50">
                  <a
                    href="https://www.instagram.com/atelierhajny/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] uppercase tracking-[0.2em] text-gray-400 hover:text-beige-600 transition-colors"
                  >
                    Sledovat @atelierhajny
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Contact Form */}
          <div className="lg:col-span-7">
            <div className="bg-gray-50 p-8 md:p-12 lg:p-16">
              <h3 className="text-sm uppercase tracking-widest text-gray-900 mb-12">Napište nám</h3>
              <form className="space-y-8" onSubmit={handleSubmit}>
                <div>
                  <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">Jméno</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-transparent border-b border-gray-300 py-3 focus:border-black focus:outline-none transition-colors"
                    placeholder="Vaše jméno"
                    required
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-transparent border-b border-gray-300 py-3 focus:border-black focus:outline-none transition-colors"
                    placeholder="vas@email.cz"
                    required
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">Zpráva</label>
                  <textarea
                    rows={6}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="w-full bg-transparent border-b border-gray-300 py-3 focus:border-black focus:outline-none transition-colors resize-none"
                    placeholder="Jak vám můžeme pomoci?"
                    required
                    disabled={isSubmitting}
                  ></textarea>
                </div>
                {submitStatus.type && (
                  <div className={`text-sm ${submitStatus.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                    {submitStatus.message}
                  </div>
                )}
                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-black text-white px-12 py-4 text-xs uppercase tracking-[0.2em] hover:bg-beige-600 transition-all duration-300 w-full md:w-auto hover:text-white group flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Odesílání...' : 'Odeslat zprávu'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};