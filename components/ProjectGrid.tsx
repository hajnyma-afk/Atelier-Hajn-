import React, { useEffect, useRef, useState } from 'react';
import { Project } from '../types';

interface ProjectGridProps {
  projects: Project[];
  categories: string[];
  onSelect: (project: Project) => void;
}

export const ProjectGrid: React.FC<ProjectGridProps> = ({ projects, categories, onSelect }) => {
  const [activeCategory, setActiveCategory] = useState("Vše");
  const observerRef = useRef<IntersectionObserver | null>(null);

  const filterCategories = ["Vše", ...categories];

  const filteredProjects = activeCategory === "Vše"
    ? projects
    : projects.filter(p => p.category === activeCategory);

  useEffect(() => {
    // Setup observer
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.remove('opacity-0', 'translate-y-12');
            entry.target.classList.add('opacity-100', 'translate-y-0');
            // Stop observing once animated
            observerRef.current?.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.1, // Trigger when 10% visible
        rootMargin: '50px', // Trigger slightly before
      }
    );

    const elements = document.querySelectorAll('.project-card');
    elements.forEach((el) => observerRef.current?.observe(el));

    return () => {
      observerRef.current?.disconnect();
    };
  }, [filteredProjects]); // Re-run when filtered list changes

  return (
    <div className="max-w-[95%] md:max-w-[75%] mx-auto px-6 py-8">
      {/* Filter Navigation */}
      <div className="flex flex-wrap gap-4 md:gap-8 justify-center mb-12 animate-in fade-in slide-in-from-top-4 duration-700">
        {filterCategories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`text-sm uppercase tracking-widest transition-colors ${
              activeCategory === cat
                ? 'text-black font-medium border-b border-black pb-1'
                : 'text-gray-400 hover:text-beige-600'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-3 gap-x-2 md:gap-y-5 md:gap-x-3">
        {filteredProjects.map((project, index) => (
          <div
            key={project.id}
            onClick={() => onSelect(project)}
            // Start invisible and offset down
            className="project-card group cursor-pointer flex flex-col gap-3 opacity-0 translate-y-12 transition-all duration-1000 ease-out"
            style={{ transitionDelay: `${(index % 3) * 100}ms` }} // Stagger slightly based on column
          >
            {/* Thumbnail Container with 3:2 Aspect Ratio */}
            <div className="relative w-full aspect-[3/2] overflow-hidden bg-gray-100">
              {project.thumbnail ? (
                <img
                  src={project.thumbnail}
                  alt={project.title}
                  className="w-full h-full object-cover transition-all duration-700 ease-out group-hover:scale-105"
                  loading="lazy"
                  decoding="async"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-50 text-gray-300">
                   <span className="text-xs uppercase tracking-widest">Bez náhledu</span>
                </div>
              )}
            </div>

            <div className="flex justify-between items-baseline pb-3">
              <h3 className="text-lg font-medium text-gray-900 group-hover:text-black transition-colors">
                {project.title}
              </h3>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};