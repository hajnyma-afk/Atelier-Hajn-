import React from 'react';
import { Link } from 'react-router-dom';
import { Lock, Unlock } from 'lucide-react';
import { ViewMode } from '../types';

interface FooterProps {
  onNavigate: (view: ViewMode) => void;
  isAuthenticated: boolean;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate, isAuthenticated }) => {
  return (
    <footer className="w-full py-12 bg-white flex flex-col items-center justify-center gap-4 border-t border-gray-50 mt-12">
      <p className="text-xs text-gray-400 tracking-widest uppercase">
        © {new Date().getFullYear()} ATELIER HAJNÝ.
      </p>
      <Link
        to={isAuthenticated ? '/admin' : '/login'}
        onClick={() => onNavigate(isAuthenticated ? 'admin' : 'login')}
        className="text-gray-200 hover:text-gray-900 transition-colors duration-300"
        aria-label="Admin Access"
      >
        {isAuthenticated ? <Unlock size={12} strokeWidth={1} /> : <Lock size={12} strokeWidth={1} />}
      </Link>
    </footer>
  );
};