import React, { useState } from 'react';
import { X, Check, User, PenTool, Upload, Image as ImageIcon } from 'lucide-react';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentName: string;
  currentAvatar: string;
  currentTagline?: string;
  onSave: (name: string, avatar: string, tagline: string) => void;
}

const AVATAR_OPTIONS = ['🐧', '👨‍🍳', '👩‍🍳', '🥘', '🥗', '🐱', '🐶', '🐼', '🦊', '🐷'];

export const EditProfileModal: React.FC<EditProfileModalProps> = ({ isOpen, onClose, currentName, currentAvatar, currentTagline, onSave }) => {
  const [name, setName] = useState(currentName);
  const [avatar, setAvatar] = useState(currentAvatar);
  const [tagline, setTagline] = useState(currentTagline || '今天也要好好吃饭');
  
  if (!isOpen) return null;

  const compressAndSetAvatar = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 200; // 缩略图尺寸
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        // 压缩质量 0.7
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
        setAvatar(compressedBase64);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      compressAndSetAvatar(file);
    }
  };

  const isImageAvatar = avatar.startsWith('data:');

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      
      <div className="bg-white w-[90%] max-w-sm rounded-2xl shadow-xl z-10 p-6 animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-gray-900">编辑资料</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-6">
          {/* Avatar Selection */}
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-3 uppercase">选择头像</label>
            <div className="flex justify-center mb-4">
              <div className="relative group cursor-pointer" onClick={() => document.getElementById('avatar-upload')?.click()}>
                <div className="w-24 h-24 rounded-full bg-brand-100 flex items-center justify-center text-4xl border-4 border-white shadow-lg overflow-hidden">
                   {isImageAvatar ? (
                     <img src={avatar} alt="avatar" className="w-full h-full object-cover" />
                   ) : (
                     avatar
                   )}
                </div>
                <div 
                  className="absolute bottom-0 right-0 bg-gray-900 text-white p-2 rounded-full shadow-sm hover:bg-black transition-colors"
                >
                  <Upload size={14} />
                </div>
                <input 
                  id="avatar-upload" 
                  type="file" 
                  className="hidden" 
                  accept="image/*"
                  onChange={handleImageUpload} 
                />
              </div>
            </div>
            
            <div className="grid grid-cols-5 gap-2">
              {AVATAR_OPTIONS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => setAvatar(emoji)}
                  className={`aspect-square rounded-xl flex items-center justify-center text-xl hover:bg-gray-50 transition-all ${
                    avatar === emoji ? 'bg-brand-50 border-2 border-brand-500' : 'border border-transparent'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div>
               <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">昵称</label>
               <div className="relative">
                 <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                 <input 
                   type="text"
                   value={name}
                   onChange={(e) => setName(e.target.value)}
                   className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-brand-500 focus:bg-white outline-none font-medium"
                   placeholder="输入你的名字"
                 />
               </div>
            </div>

            <div>
               <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">个性签名</label>
               <div className="relative">
                 <PenTool className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                 <input 
                   type="text"
                   value={tagline}
                   onChange={(e) => setTagline(e.target.value)}
                   className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-brand-500 focus:bg-white outline-none font-medium"
                   placeholder="一句话描述你的心情"
                   maxLength={20}
                 />
               </div>
            </div>
          </div>

          <button 
            onClick={() => {
              if (name.trim()) {
                onSave(name, avatar, tagline);
                onClose();
              }
            }}
            className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-gray-800 active:scale-95 transition-all"
          >
            <Check size={18} />
            保存修改
          </button>
        </div>
      </div>
    </div>
  );
};