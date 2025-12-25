
import React from 'react';
import { Post } from '../types';
import { Plus, ChevronRight } from 'lucide-react';

interface PostListProps {
  posts: Post[];
  onSelect: (post: Post) => void;
  onCreate: () => void;
}

export const PostList: React.FC<PostListProps> = ({ posts, onSelect, onCreate }) => {
  // Empty state - truly "empty white page" with just a hint
  if (posts.length === 0) {
    return (
      <div className="flex-1 w-full flex flex-col items-center justify-center animate-in fade-in duration-700">
        <button 
          onClick={onCreate}
          className="group flex flex-col items-center gap-4 text-gray-300 hover:text-gray-800 transition-colors duration-500"
        >
          <div className="p-4 rounded-full border border-dashed border-gray-200 group-hover:border-gray-400 transition-colors">
            <Plus size={32} strokeWidth={1} />
          </div>
          <span className="tracking-widest text-sm uppercase">Vytvořit první příběh</span>
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto py-12 px-6 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-baseline mb-16 border-b border-gray-100 pb-4">
        <h1 className="text-2xl text-gray-900">Příběhy</h1>
        <button 
          onClick={onCreate}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-black transition-colors"
        >
          <Plus size={16} strokeWidth={1} />
          Nový
        </button>
      </div>

      <div className="space-y-12">
        {posts.sort((a, b) => b.updatedAt - a.updatedAt).map((post) => (
          <article 
            key={post.id} 
            className="group cursor-pointer"
            onClick={() => onSelect(post)}
          >
            <h2 className="text-3xl text-gray-900 mb-3 group-hover:opacity-70 transition-opacity leading-tight">
              {post.title || 'Nepojmenováno'}
            </h2>
            <p className="text-gray-500 line-clamp-2 leading-relaxed">
              {post.content || 'Žádný obsah...'}
            </p>
            <div className="mt-4 flex items-center gap-2 text-xs text-gray-400 uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">
              <span>Číst dál</span>
              <ChevronRight size={12} strokeWidth={1} />
            </div>
          </article>
        ))}
      </div>
    </div>
  );
};
