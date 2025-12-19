import React, { useState, useEffect } from 'react';
import { X, Clock, Users, Star, Heart, Share2, Search, Edit3, Tag, ChevronLeft } from 'lucide-react';
import { Recipe } from '../types';

interface RecipeDetailModalProps {
  recipe: Recipe | null;
  onClose: () => void;
  onToggleFavorite: (id: string) => void;
  onRate: (id: string, rating: number) => void;
  onIngredientClick: (ingredientName: string) => void;
  onEdit: (recipe: Recipe) => void;
}

export const RecipeDetailModal: React.FC<RecipeDetailModalProps> = ({ 
  recipe, 
  onClose, 
  onToggleFavorite, 
  onRate, 
  onIngredientClick,
  onEdit 
}) => {
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [touchStart, setTouchStart] = useState(0);

  useEffect(() => {
    if (recipe) document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [recipe]);

  if (!recipe) return null;

  const handleTouchStart = (e: React.TouchEvent) => setTouchStart(e.touches[0].clientX);
  const handleTouchMove = (e: React.TouchEvent) => {
    const offset = e.touches[0].clientX - touchStart;
    if (offset > 0) setSwipeOffset(offset);
  };
  const handleTouchEnd = () => {
    if (swipeOffset > 100) onClose();
    setSwipeOffset(0);
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div 
        className="bg-white w-full h-full sm:h-[90vh] sm:w-[500px] sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-transform duration-200 relative"
        style={{ transform: `translateX(${swipeOffset}px)`, touchAction: 'pan-y' }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="relative h-72 shrink-0">
          <img src={recipe.image} className="w-full h-full object-cover" />
          <div className="absolute top-0 left-0 right-0 p-4 pt-safe flex justify-between bg-gradient-to-b from-black/40 to-transparent">
             <button onClick={onClose} className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-full text-white flex items-center justify-center"><ChevronLeft size={24} /></button>
             <div className="flex gap-2">
               <button onClick={() => onEdit(recipe)} className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-full text-white flex items-center justify-center"><Edit3 size={20} /></button>
               <button onClick={() => {}} className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-full text-white flex items-center justify-center"><Share2 size={20} /></button>
             </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-white -mt-8 rounded-t-3xl relative p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <span className="inline-block px-3 py-1 bg-brand-50 text-brand-600 rounded-full text-[10px] font-bold mb-2">{recipe.category}</span>
              <h2 className="text-2xl font-black text-gray-900">{recipe.title}</h2>
            </div>
            <button onClick={() => onToggleFavorite(recipe.id)} className={`p-3 rounded-full ${recipe.isFavorite ? 'bg-red-50 text-red-500' : 'bg-gray-50 text-gray-300'}`}>
              <Heart size={24} fill={recipe.isFavorite ? "currentColor" : "none"} />
            </button>
          </div>

          <div className="flex items-center gap-4 mb-6">
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map(s => <Star key={s} size={18} className={s <= (recipe.rating || 0) ? "text-yellow-400 fill-yellow-400" : "text-gray-200"} onClick={() => onRate(recipe.id, s)} />)}
            </div>
          </div>

          <p className="text-gray-600 leading-relaxed mb-8">{recipe.description}</p>

          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-gray-50 p-4 rounded-2xl flex items-center gap-3">
              <Clock className="text-gray-400" size={20} />
              <div><p className="text-[10px] text-gray-400 font-bold uppercase">耗时</p><p className="text-sm font-bold">15 分钟</p></div>
            </div>
            <div className="bg-gray-50 p-4 rounded-2xl flex items-center gap-3">
              <Users className="text-gray-400" size={20} />
              <div><p className="text-[10px] text-gray-400 font-bold uppercase">份量</p><p className="text-sm font-bold">2 人份</p></div>
            </div>
          </div>

          <div className="mb-8">
            <h3 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2">食材清单 <span className="text-xs font-normal text-gray-400">Ingredients</span></h3>
            <div className="space-y-3">
              {recipe.ingredients.map((ing, i) => (
                <div key={i} className="flex justify-between items-center py-3 border-b border-gray-50 last:border-0" onClick={() => onIngredientClick(ing.name)}>
                  <span className="font-bold text-gray-700">{ing.name}</span>
                  <span className="text-gray-400 text-sm">{ing.amount}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="pb-safe">
            <h3 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2">制作步骤 <span className="text-xs font-normal text-gray-400">Preparation</span></h3>
            <div className="space-y-8">
              {recipe.steps.map((step, i) => (
                <div key={i} className="flex gap-4">
                  <div className="flex flex-col items-center shrink-0">
                    <div className="w-8 h-8 rounded-xl bg-gray-900 text-white flex items-center justify-center text-xs font-black">{i + 1}</div>
                    <div className="flex-1 w-0.5 bg-gray-100 my-2" />
                  </div>
                  <div className="flex-1 space-y-3 pb-4">
                    <p className="text-gray-700 leading-relaxed">{step.description}</p>
                    {step.image && <img src={step.image} className="w-full rounded-2xl shadow-sm border border-gray-100" />}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};