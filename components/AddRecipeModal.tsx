import React, { useState, useEffect } from 'react';
import { X, Sparkles, Loader2, Image as ImageIcon, Check, Plus, Trash2, Tag, BrainCircuit, ClipboardPaste } from 'lucide-react';
import { Recipe, Category, GeneratedRecipeResponse, RecipeStep } from '../types';
import { generateRecipeFromIdea, parseRecipeFromText } from '../services/geminiService';

interface AddRecipeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (recipe: Omit<Recipe, 'id' | 'createdAt' | 'rating' | 'isFavorite'>) => void;
  initialData?: Recipe | null;
}

const PRESET_TAGS = ['米饭搭子', '面食', '汤羹', '减脂', '快手菜', '硬菜', '便当', '西式', '素食'];
const LOADING_MESSAGES = [
  "正在翻阅米其林指南...",
  "正在咨询五星大厨...",
  "正在计算卡路里...",
  "正在搭配最完美的酱汁...",
  "企鹅正在努力查阅菜谱...",
  "AI 正在思考美味搭配..."
];

export const AddRecipeModal: React.FC<AddRecipeModalProps> = ({ isOpen, onClose, onSave, initialData }) => {
  const [activeTab, setActiveTab] = useState<'manual' | 'ai'>('manual');
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [aiPrompt, setAiPrompt] = useState('');
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pasteText, setPasteText] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: Category.MainMeal,
    tags: [] as string[],
    image: '',
    ingredientsStr: '',
  });

  const [tagInput, setTagInput] = useState('');
  const [steps, setSteps] = useState<RecipeStep[]>([{ description: '', image: '' }]);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData({
          title: initialData.title,
          description: initialData.description,
          category: initialData.category,
          tags: initialData.tags || [],
          image: initialData.image,
          ingredientsStr: initialData.ingredients.map(i => `${i.name} ${i.amount}`).join('\n')
        });
        setSteps(initialData.steps?.length ? initialData.steps : [{ description: '', image: '' }]);
        setActiveTab('manual');
      } else {
        setFormData({ title: '', description: '', category: Category.MainMeal, tags: [], image: '', ingredientsStr: '' });
        setSteps([{ description: '', image: '' }]);
        setAiPrompt('');
        setActiveTab('manual');
      }
      setShowPasteModal(false);
      setPasteText('');
    }
  }, [isOpen, initialData]);

  useEffect(() => {
    let interval: any;
    if (loading) {
      setLoadingMsg(LOADING_MESSAGES[0]);
      let i = 1;
      interval = setInterval(() => {
        setLoadingMsg(LOADING_MESSAGES[i % LOADING_MESSAGES.length]);
        i++;
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [loading]);

  if (!isOpen) return null;

  const handleMainImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setFormData(prev => ({ ...prev, image: reader.result as string }));
      reader.readAsDataURL(file);
    }
  };

  const handleStepImageChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const newSteps = [...steps];
        newSteps[index].image = reader.result as string;
        setSteps(newSteps);
      };
      reader.readAsDataURL(file);
    }
  };

  const updateStepDescription = (index: number, text: string) => {
    const newSteps = [...steps];
    newSteps[index].description = text;
    setSteps(newSteps);
  };

  const handleGenerate = async () => {
    if (!aiPrompt.trim()) return;
    setLoading(true);
    try {
      const result = await generateRecipeFromIdea(aiPrompt);
      if (result) {
        fillFormWithResult(result);
        setActiveTab('manual');
      }
    } catch (e) {
      alert('AI 生成失败，请检查网络或稍后再试。');
    } finally {
      setLoading(false);
    }
  };

  const handleSmartPaste = async () => {
    if (!pasteText.trim()) return;
    setLoading(true);
    setShowPasteModal(false);
    try {
      const result = await parseRecipeFromText(pasteText);
      if (result) fillFormWithResult(result);
    } catch (e) {
      alert('解析失败，请确保复制的内容包含菜谱信息。');
    } finally {
      setLoading(false);
    }
  };

  const fillFormWithResult = (result: GeneratedRecipeResponse) => {
    setFormData({
      title: result.title,
      description: result.description,
      category: result.category as Category,
      tags: result.tags || [],
      image: formData.image || `https://picsum.photos/400/300?seed=${Math.random()}`,
      ingredientsStr: result.ingredients.map(i => `${i.name} ${i.amount}`).join('\n'),
    });
    setSteps(result.steps.map(s => ({ description: s, image: '' })));
  };

  const handleSave = () => {
    const ingredients = formData.ingredientsStr.split('\n').filter(s => s.trim()).map(s => {
      const parts = s.trim().split(/\s+/);
      return { name: parts[0], amount: parts.slice(1).join(' ') || '适量' };
    });
    const validSteps = steps.filter(s => s.description.trim() !== '');
    onSave({ ...formData, ingredients, steps: validSteps });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center pointer-events-none">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto" onClick={onClose} />
      
      <div className="bg-white w-full sm:max-w-lg h-[92vh] sm:h-[85vh] sm:rounded-2xl rounded-t-3xl shadow-2xl flex flex-col pointer-events-auto relative overflow-hidden">
        {loading && (
          <div className="absolute inset-0 z-50 bg-white/95 backdrop-blur-md flex flex-col items-center justify-center">
             <div className="relative mb-8">
                <div className="absolute inset-0 bg-brand-200 rounded-full animate-ping opacity-75"></div>
                <div className="relative bg-brand-500 text-white p-6 rounded-full shadow-lg">
                  <BrainCircuit size={48} className="animate-pulse" />
                </div>
             </div>
             <h3 className="text-xl font-bold text-gray-800 animate-pulse mb-2">{loadingMsg}</h3>
          </div>
        )}

        {showPasteModal && (
          <div className="absolute inset-0 z-40 bg-white flex flex-col p-6 animate-in slide-in-from-bottom-10">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg">智能粘贴识别</h3>
              <button onClick={() => setShowPasteModal(false)} className="p-2 bg-gray-100 rounded-full"><X size={20}/></button>
            </div>
            <textarea 
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder="长按粘贴外部 App 的菜谱文本..."
              className="flex-1 w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm outline-none resize-none focus:border-brand-500"
              autoFocus
            />
            <button onClick={handleSmartPaste} className="mt-4 w-full py-4 bg-brand-500 text-white rounded-xl font-bold flex items-center justify-center gap-2">
              <Sparkles size={18} /> 开始识别
            </button>
          </div>
        )}

        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center shrink-0">
          <h2 className="text-xl font-bold text-gray-800">{initialData ? '编辑菜谱' : '添加菜谱'}</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full"><X size={24} /></button>
        </div>

        <div className="flex p-2 gap-2 bg-gray-50 mx-6 mt-4 rounded-xl shrink-0">
          <button onClick={() => setActiveTab('manual')} className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'manual' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>手动/粘贴</button>
          <button onClick={() => setActiveTab('ai')} className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-1.5 ${activeTab === 'ai' ? 'bg-gradient-to-r from-brand-500 to-orange-500 text-white shadow-md' : 'text-gray-500'}`}><Sparkles size={16} />AI 创意生成</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'ai' ? (
            <div className="space-y-4">
              <div className="bg-orange-50 p-4 rounded-xl text-brand-600 text-sm">
                告诉 AI 你有的食材，或者想吃的风格，它会为你写出完整菜谱。
              </div>
              <textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="例如：我有鸡蛋和番茄，想要个适合便当的快手做法..."
                className="w-full h-40 p-4 rounded-xl border border-gray-200 focus:border-brand-500 resize-none outline-none text-base"
              />
              <button onClick={handleGenerate} disabled={!aiPrompt.trim()} className="w-full py-4 bg-brand-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-brand-100 active:scale-95 transition-all">
                <Sparkles /> 立即生成
              </button>
            </div>
          ) : (
            <div className="space-y-5 pb-safe">
              {!initialData && (
                <button onClick={() => setShowPasteModal(true)} className="w-full py-3 bg-blue-50 text-blue-600 border border-blue-100 rounded-xl text-sm font-bold flex items-center justify-center gap-2">
                  <ClipboardPaste size={16} /> 智能粘贴识别
                </button>
              )}

              <div className="flex items-center gap-4">
                <div onClick={() => document.getElementById('main-image-upload')?.click()} className="w-24 h-24 rounded-2xl bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden relative cursor-pointer">
                  {formData.image ? <img src={formData.image} className="w-full h-full object-cover" /> : <ImageIcon className="text-gray-400" />}
                  <input id="main-image-upload" type="file" className="hidden" accept="image/*" onChange={handleMainImageChange} />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-bold text-gray-400 mb-1">菜名</label>
                  <input value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} placeholder="菜名" className="w-full p-2.5 rounded-lg border border-gray-200 outline-none focus:border-brand-500" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1">分类</label>
                <select value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value as Category})} className="w-full p-2.5 rounded-lg border border-gray-200 bg-white">
                  {Object.values(Category).filter(c => c !== Category.Message && c !== Category.ShoppingList).map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1">食材清单</label>
                <textarea value={formData.ingredientsStr} onChange={(e) => setFormData({...formData, ingredientsStr: e.target.value})} placeholder="鸡蛋 2个&#10;番茄 1个" className="w-full h-32 p-3 rounded-lg border border-gray-200 outline-none resize-none text-sm" />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 mb-2">制作步骤</label>
                <div className="space-y-4">
                  {steps.map((step, idx) => (
                    <div key={idx} className="flex gap-3 items-start bg-gray-50/50 p-3 rounded-xl border border-gray-100">
                      <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-black shrink-0 mt-1">{idx + 1}</div>
                      <div className="flex-1 space-y-2">
                        <textarea value={step.description} onChange={(e) => updateStepDescription(idx, e.target.value)} placeholder="描述步骤..." className="w-full p-2 bg-transparent outline-none text-sm resize-none" rows={2} />
                        <div className="flex items-center gap-2">
                          <div onClick={() => document.getElementById(`step-img-${idx}`)?.click()} className="w-12 h-12 border border-dashed border-gray-300 rounded-lg flex items-center justify-center overflow-hidden">
                             {step.image ? <img src={step.image} className="w-full h-full object-cover" /> : <Plus size={16} className="text-gray-300" />}
                             <input id={`step-img-${idx}`} type="file" className="hidden" accept="image/*" onChange={(e) => handleStepImageChange(idx, e)} />
                          </div>
                          {steps.length > 1 && <button onClick={() => setSteps(steps.filter((_, i) => i !== idx))} className="text-gray-300 hover:text-red-500 ml-auto p-1"><Trash2 size={16} /></button>}
                        </div>
                      </div>
                    </div>
                  ))}
                  <button onClick={() => setSteps([...steps, { description: '', image: '' }])} className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 font-bold text-sm hover:bg-gray-50">+ 添加新步骤</button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-100 bg-white shrink-0 pb-safe">
           <button onClick={handleSave} disabled={!formData.title} className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold flex items-center justify-center gap-2 disabled:opacity-50">
            <Check size={20} /> 保存菜谱
          </button>
        </div>
      </div>
    </div>
  );
};