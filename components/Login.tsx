
import React, { useState } from 'react';
import { Button } from './Button';
import { loadPassword } from '../services/storage';

interface LoginProps {
  onLogin: () => void;
  onCancel: () => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin, onCancel }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(false);

    try {
      const storedPassword = await loadPassword();

      if (!storedPassword) {
        setError(true);
        setPassword('');
        alert('No password set. Please set ADMIN_PASSWORD environment variable or set password via admin panel.');
        return;
      }

      if (password === storedPassword) {
        onLogin();
      } else {
        setError(true);
        setPassword('');
      }
    } catch (error) {
      console.error('Failed to load password:', error);
      setError(true);
      setPassword('');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 w-full flex items-center justify-center p-6 animate-in fade-in duration-500">
      <div className="w-full max-w-md">
        <h1 className="text-2xl mb-8 text-center tracking-tight">Přihlášení do administrace</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(false); }}
              placeholder="Zadejte heslo"
              className="w-full bg-transparent border-b border-gray-300 py-3 text-center focus:border-black focus:outline-none transition-colors"
              autoFocus
            />
            {error && (
              <p className="text-xs text-red-500 text-center tracking-widest uppercase">Nesprávné heslo</p>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <Button type="submit" className="w-full py-4" isLoading={isLoading}>
              Vstoupit
            </Button>
            <button
              type="button"
              onClick={onCancel}
              className="text-xs text-gray-400 hover:text-black uppercase tracking-widest transition-colors py-2"
            >
              Zpět na web
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
