import React, { useState, useEffect, useRef } from 'react';
import { Post } from '../types';
import { ArrowLeft, Sparkles, Save, Trash2 } from 'lucide-react';
import { Button } from './Button';
import { generatePostContent } from '../services/geminiService';

interface EditorProps {
  post: Post;
  onSave: (post: Post) => void;
  onDelete: (id: string) => void;
  onBack: () => void;
}

export const Editor: React.FC<EditorProps> = ({ post, onSave, onDelete, onBack }) => {
  const [title, setTitle] = useState(post.title);
  const [content, setContent] = useState(post.content);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [content]);

  const handleSave = () => {
    setIsSaving(true);
    // Simulate slight delay for effect
    setTimeout(() => {
      onSave({
        ...post,
        title,
        content,
        updatedAt: Date.now(),
      });
      setIsSaving(false);
    }, 400);
  };

  const handleAiGenerate = async () => {
    if (!title) {
      alert("Prosím, zadejte nejprve nadpis.");
      return;
    }

    setIsAiLoading(true);
    try {
      const newText = await generatePostContent(title, content);
      
      // Append nicely if there is existing content
      const separator = content ? "\n\n" : "";
      const updatedContent = content + separator + newText;
      
      setContent(updatedContent);
    } catch (error) {
      alert("Nepodařilo se vygenerovat text. Zkontrolujte API klíč.");
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-12 px-6 h-full flex flex-col">
      {/* Toolbar - floating sticky top (approx 80px/5rem) to clear main header */}
      <div className="flex justify-between items-center mb-12 sticky top-20 bg-white/90 backdrop-blur-sm py-4 z-10">
        <button 
          onClick={onBack} 
          className="text-gray-400 hover:text-black transition-colors"
          title="Zpět"
        >
          <ArrowLeft size={20} strokeWidth={1} />
        </button>
        
        <div className="flex items-center gap-2">
           <button 
            onClick={() => onDelete(post.id)}
            className="p-2 text-gray-300 hover:text-red-600 transition-colors mr-2"
            title="Smazat"
          >
            <Trash2 size={18} strokeWidth={1} />
          </button>

          <Button 
            variant="ghost" 
            onClick={handleAiGenerate} 
            isLoading={isAiLoading}
            title="Generovat text pomocí AI"
          >
            <Sparkles size={16} strokeWidth={1} />
            <span className="hidden sm:inline">AI Autor</span>
          </Button>
          
          <Button 
            onClick={handleSave} 
            isLoading={isSaving}
          >
            <Save size={16} strokeWidth={1} />
            <span className="hidden sm:inline">Uložit</span>
          </Button>
        </div>
      </div>

      {/* Editor Surface */}
      <div className="flex-1 animate-in fade-in duration-500">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Nadpis příběhu..."
          className="w-full text-4xl md:text-5xl placeholder-gray-200 text-gray-900 border-none focus:ring-0 outline-none bg-transparent mb-8 leading-tight"
        />
        
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Začněte psát..."
          className="w-full resize-none text-lg md:text-xl leading-relaxed text-gray-700 placeholder-gray-200 border-none focus:ring-0 outline-none bg-transparent min-h-[60vh]"
        />
      </div>
    </div>
  );
};