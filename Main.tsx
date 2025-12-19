import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Navigation } from './components/Navigation';
import { ViewState, Recipe, MealPlanItem, Category } from './types';
import { INITIAL_RECIPES } from './constants';
import { RecipeCard } from './components/RecipeCard';
import { WeeklyPlanner } from './components/WeeklyPlanner';
import { ShoppingList } from './components/ShoppingList';
import { AddRecipeModal } from './components/AddRecipeModal';
import { RecipeDetailModal } from './components/RecipeDetailModal';
import { EditProfileModal } from './components/EditProfileModal';
import { VoiceChef } from './components/VoiceChef';
import { storage, UserProfile, Household } from './services/storage';
import { Plus, Search, Heart, Trash2, Calendar as CalendarIcon, ChevronLeft, ChevronRight, X, Edit2, Users, Copy, LogOut, Loader2, RefreshCw, Send, MessageSquare, Utensils, ArrowDown, Coffee, Dices, Shuffle, CheckCircle2, Sunrise, Sun, Moon, BarChart3, PieChart, Activity, Flame, Trophy, ClipboardList, Mic } from 'lucide-react';
import { EditableTitle } from './components/EditableTitle';

export default function Main() {
  const [view, setView] = useState<ViewState>('recipes');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [plan, setPlan] = useState<MealPlanItem[]>([]);
  
  // UI States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isVoiceChefOpen, setIsVoiceChefOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);

  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('全部');
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  
  // Flow State: Picking a recipe FOR a specific slot (Planner -> Recipes)
  const [pickingForSlot, setPickingForSlot] = useState<{date: string, type: 'breakfast'|'lunch'|'dinner'|'snack'} | null>(null);
  
  // Flow State: Placing a specific recipe INTO a slot (Recipes -> Planner)
  const [placingRecipe, setPlacingRecipe] = useState<Recipe | null>(null);

  
  // Sub-navigation states
  const [showAllFavorites, setShowAllFavorites] = useState(false);
  const [profileTab, setProfileTab] = useState<'overview' | 'stats'>('overview');

  // Stats View State
  const [statsSelectedDate, setStatsSelectedDate] = useState<string>('');

  // Randomizer States
  const [isRandomizerOpen, setIsRandomizerOpen] = useState(false);
  const [randomResult, setRandomResult] = useState<Recipe | null>(null);
  const [isShuffling, setIsShuffling] = useState(false);
  const [showPlanOptions, setShowPlanOptions] = useState(false);
  const [randomizerTargetDate, setRandomizerTargetDate] = useState<Date>(new Date());

  // Pull to Refresh State
  const [pullStartY, setPullStartY] = useState(0);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Message Board State
  const [messageInput, setMessageInput] = useState('');

  // Stats / Heatmap Scrolling Refs
  const heatmapScrollRef = useRef<HTMLDivElement>(null);

  // Profile & Household States
  const [userProfile, setUserProfile] = useState<UserProfile>({ 
    name: '我的食堂', 
    avatar: '🐧', 
    tagline: '今天也要好好吃饭',
    titles: {
      home: '企鹅食堂',
      planner: '饮食计划',
      plannerSubtitle: 'Meal Planner',
      shopping: '购物清单'
    }
  });
  const [household, setHousehold] = useState<Household | null>(null);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [isRenamingHousehold, setIsRenamingHousehold] = useState(false);
  const [newHouseholdName, setNewHouseholdName] = useState('');

  // Reset sub-views when changing main tabs
  const handleSetView = (newView: ViewState) => {
    setView(newView);
    setShowAllFavorites(false);
    if (newView !== 'planner') {
      setPlacingRecipe(null);
    }
    if (newView !== 'recipes') {
      setPickingForSlot(null);
    }
    window.scrollTo(0, 0);
  };

  // Initialize Data via Service
  const loadAllData = async (isInitial = false) => {
    if (isInitial) setLoading(true);
    else setSyncing(true);
    
    try {
      const data = await storage.loadData();
      
      if (data.recipes.length === 0 && !storage.getHousehold()) {
        setRecipes(INITIAL_RECIPES); 
      } else {
        setRecipes(data.recipes);
      }
      
      setPlan(data.plan);
      setUserProfile(data.profile);
      setHousehold(storage.getHousehold());
    } catch (e) {
      console.error("Failed to load data", e);
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  };

  useEffect(() => {
    loadAllData(true);
    const now = new Date();
    const str = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
    setStatsSelectedDate(str);
  }, []);

  // Real-time Subscription Hook
  useEffect(() => {
    if (household) {
      const subscription = storage.subscribeToChanges(household.id, () => {
        loadAllData(false);
        const updatedHousehold = storage.getHousehold();
        if (updatedHousehold && updatedHousehold.name !== household.name) {
           setHousehold(updatedHousehold);
        }
      });
      return () => {
        subscription.unsubscribe();
      };
    }
  }, [household]);

  // Persist Data Handlers
  useEffect(() => {
    if (!loading && !syncing) storage.saveData('recipes', recipes);
  }, [recipes, loading, household]);

  useEffect(() => {
    if (!loading && !syncing) storage.saveData('plan', plan);
  }, [plan, loading, household]);

  useEffect(() => {
    if (!loading) storage.saveData('profile', userProfile);
  }, [userProfile, loading]);

  useEffect(() => {
    if (profileTab === 'stats' && heatmapScrollRef.current) {
      setTimeout(() => {
        const currentMonthEl = document.getElementById('heatmap-current-month');
        if (currentMonthEl && heatmapScrollRef.current) {
            const container = heatmapScrollRef.current;
            const scrollLeft = currentMonthEl.offsetLeft - container.offsetWidth / 2 + currentMonthEl.offsetWidth / 2;
            container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
        }
      }, 100);
    }
  }, [profileTab]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (view === 'recipes' && window.scrollY === 0) {
      setPullStartY(e.touches[0].clientY);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (view === 'recipes' && pullStartY > 0 && window.scrollY === 0) {
      const currentY = e.touches[0].clientY;
      const diff = currentY - pullStartY;
      if (diff > 0) {
        setPullDistance(diff < 200 ? diff : 200);
      }
    }
  };

  const handleTouchEnd = async () => {
    if (view === 'recipes' && pullDistance > 80) {
      setIsRefreshing(true);
      await loadAllData(false);
      setIsRefreshing(false);
    }
    setPullStartY(0);
    setPullDistance(0);
  };

  const handleUpdateTitles = (key: keyof NonNullable<UserProfile['titles']>, value: string) => {
    setUserProfile(prev => ({
      ...prev,
      titles: {
        ...prev.titles,
        [key]: value
      }
    }));
  };

  const handleSaveRecipe = (recipeData: Omit<Recipe, 'id' | 'createdAt' | 'rating' | 'isFavorite'>) => {
    if (editingRecipe) {
      setRecipes(prev => prev.map(r => r.id === editingRecipe.id ? {
        ...r,
        ...recipeData,
        createdAt: r.createdAt,
        rating: r.rating,
        isFavorite: r.isFavorite
      } : r));
      
      if (selectedRecipe && selectedRecipe.id === editingRecipe.id) {
        setSelectedRecipe(prev => prev ? { ...prev, ...recipeData } : null);
      }
      
      setEditingRecipe(null);
    } else {
      const newRecipe: Recipe = {
        ...recipeData,
        id: Date.now().toString(),
        createdAt: Date.now(),
        rating: 0,
        isFavorite: false,
      };
      setRecipes(prev => [newRecipe, ...prev]);
    }
  };

  const handleEditClick = (recipe: Recipe) => {
    setSelectedRecipe(null);
    setEditingRecipe(recipe);
    setIsAddModalOpen(true);
  };

  const handleAddToPlan = (recipe: Recipe) => {
    if (pickingForSlot) {
      const newPlanItem: MealPlanItem = {
        id: Date.now().toString(),
        date: pickingForSlot.date,
        type: pickingForSlot.type,
        recipeId: recipe.id
      };
      let filteredPlan = plan;
      if (pickingForSlot.type !== 'snack') {
        filteredPlan = plan.filter(p => !(p.date === pickingForSlot.date && p.type === pickingForSlot.type));
      }
      setPlan([...filteredPlan, newPlanItem]);
      setPickingForSlot(null);
      handleSetView('planner');
    } else {
      setPlacingRecipe(recipe);
      handleSetView('planner');
    }
  };

  const confirmPlacement = (date: string, type: 'breakfast' | 'lunch' | 'dinner' | 'snack') => {
    if (!placingRecipe) return;
    const existing = plan.find(p => p.date === date && p.type === type);
    if (existing && type !== 'snack') {
       if(!confirm('该时段已有安排，确定要替换吗？')) return;
    }
    const newPlanItem: MealPlanItem = {
      id: Date.now().toString(),
      date: date,
      type: type,
      recipeId: placingRecipe.id
    };
    let filteredPlan = plan;
    if (type !== 'snack') {
      filteredPlan = plan.filter(p => !(p.date === date && p.type === type));
    }
    setPlan([...filteredPlan, newPlanItem]);
    setPlacingRecipe(null);
  };

  const handleRemovePlanItem = (id: string) => {
    setPlan(prev => prev.filter(p => p.id !== id));
  };

  const handleToggleFavorite = (id: string) => {
    setRecipes(prev => prev.map(r => 
      r.id === id ? { ...r, isFavorite: !r.isFavorite } : r
    ));
    if (selectedRecipe && selectedRecipe.id === id) {
      setSelectedRecipe(prev => prev ? { ...prev, isFavorite: !prev.isFavorite } : null);
    }
  };

  const handleRateRecipe = (id: string, rating: number) => {
    setRecipes(prev => prev.map(r => 
      r.id === id ? { ...r, rating } : r
    ));
    if (selectedRecipe && selectedRecipe.id === id) {
      setSelectedRecipe(prev => prev ? { ...prev, rating } : null);
    }
  };

  const handleIngredientClick = (ingredientName: string) => {
    setSelectedRecipe(null); 
    setSearchQuery(ingredientName); 
    handleSetView('recipes'); 
  };

  const handleShuffle = () => {
    if (isShuffling) return;
    setIsShuffling(true);
    setShowPlanOptions(false);
    
    const validRecipes = recipes.filter(r => r.category !== Category.Message && r.category !== Category.ShoppingList);
    const favoriteRecipes = validRecipes.filter(r => r.isFavorite);
    let pool: Recipe[] = [];

    if (favoriteRecipes.length < 3) {
       pool = validRecipes.filter(r => r.category === Category.MainMeal || r.category === Category.Breakfast || r.isFavorite);
    } else {
       pool = favoriteRecipes;
    }
    if (pool.length === 0) pool = validRecipes;
    if (pool.length === 0) {
      alert("请先添加一些菜谱吧！");
      setIsShuffling(false);
      return;
    }

    let i = 0;
    const interval = setInterval(() => {
      setRandomResult(pool[Math.floor(Math.random() * pool.length)]);
      i++;
      if (i > 15) {
        clearInterval(interval);
        let finalIndex = Math.floor(Math.random() * pool.length);
        setRandomResult(pool[finalIndex]);
        setIsShuffling(false);
      }
    }, 80);
  };

  const handleOpenRandomizer = () => {
    setRandomResult(null);
    setIsRandomizerOpen(true);
    setShowPlanOptions(false);
    setRandomizerTargetDate(new Date());
    setTimeout(handleShuffle, 300);
  };

  const handleQuickAddPlan = (type: 'breakfast'|'lunch'|'dinner') => {
    if (!randomResult) return;
    const d = randomizerTargetDate;
    const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const newPlanItem: MealPlanItem = {
      id: Date.now().toString(),
      date: dateStr,
      type: type,
      recipeId: randomResult.id
    };
    const filteredPlan = plan.filter(p => !(p.date === dateStr && p.type === type));
    setPlan([...filteredPlan, newPlanItem]);
    setIsRandomizerOpen(false);
    setShowPlanOptions(false);
    const dateDisplay = d.toDateString() === new Date().toDateString() ? '今天' : `${d.getMonth()+1}月${d.getDate()}日`;
    alert(`已将“${randomResult.title}”添加到${dateDisplay}的${type === 'breakfast' ? '早餐' : type === 'lunch' ? '午餐' : '晚餐'}！`);
  };

  const nextDays = useMemo(() => {
    return Array.from({length: 5}).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() + i);
      return d;
    });
  }, []);

  const handleCreateHousehold = async () => {
    setIsJoining(true);
    try {
      const house = await storage.createHousehold(`${userProfile.name}的家`);
      await storage.syncLocalToCloud(house.id, recipes, plan);
      setHousehold(house);
      alert(`家庭“${house.name}”创建成功！您的现有数据已同步到云端。`);
    } catch (e) {
      alert('创建失败，请重试');
    } finally {
      setIsJoining(false);
    }
  };

  const handleJoinHousehold = async () => {
    if (!joinCodeInput) return;
    setIsJoining(true);
    try {
      const house = await storage.joinHousehold(joinCodeInput);
      if (house) {
        setLoading(true); 
        await storage.syncLocalToCloud(house.id, recipes, plan);
        setHousehold(house);
        setJoinCodeInput('');
        await loadAllData(true);
        alert(`成功加入“${house.name}”！现有数据已合并。`);
      } else {
        alert('未找到该家庭代码');
      }
    } catch (e) {
      console.error(e);
      alert('加入失败，请检查网络');
    } finally {
      setIsJoining(false);
      setLoading(false);
    }
  };

  const handleLeaveHousehold = async () => {
    if (confirm('确定要退出当前共享组吗？退出后将无法查看共享数据。')) {
      setLoading(true);
      await storage.leaveHousehold();
      setHousehold(null);
      await loadAllData(true);
      setLoading(false);
    }
  };

  const handleRenameHousehold = async () => {
    if (!household || !newHouseholdName.trim()) return;
    try {
      await storage.updateHouseholdName(household.id, newHouseholdName.trim());
      setHousehold({ ...household, name: newHouseholdName.trim() });
      setIsRenamingHousehold(false);
    } catch (e) {
      alert('修改失败');
    }
  };

  const handlePostMessage = () => {
    if (!messageInput.trim()) return;
    const message: Recipe = {
      id: `msg-${Date.now()}`,
      title: messageInput,
      description: userProfile.name,
      image: userProfile.avatar,
      category: Category.Message,
      ingredients: [],
      steps: [],
      createdAt: Date.now(),
      tags: [],
    };
    setRecipes(prev => [message, ...prev]);
    setMessageInput('');
  };

  const deleteMessage = (id: string) => {
    if (confirm('删除这条留言?')) {
      setRecipes(prev => prev.filter(r => r.id !== id));
    }
  };

  // Fix: Added missing 'messages' useMemo to group message board posts
  const messages = useMemo(() => 
    recipes.filter(r => r.category === Category.Message)
           .sort((a, b) => b.createdAt - a.createdAt),
    [recipes]
  );

  // Fix: Added missing 'formatTime' helper function for message timestamps
  const formatTime = (ts: number) => {
    const date = new Date(ts);
    const now = new Date();
    const diff = now.getTime() - ts;
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
    return `${date.getMonth() + 1}月${date.getDate()}日`;
  };

  const shoppingListRecipe = recipes.find(r => r.category === Category.ShoppingList);
  const shoppingListData = useMemo(() => {
    if (shoppingListRecipe) {
      try {
        const data = JSON.parse(shoppingListRecipe.description);
        return {
          manualItems: data.manualItems || [],
          checkedItems: Array.isArray(data.checkedItems) ? data.checkedItems : [] 
        };
      } catch (e) { return { manualItems: [], checkedItems: [] }; }
    }
    return { manualItems: [], checkedItems: [] };
  }, [shoppingListRecipe]);

  const handleUpdateShoppingList = (manualItems: {id: string, name: string}[], checkedItems: string[]) => {
    const newData = JSON.stringify({ manualItems, checkedItems });
    if (shoppingListRecipe) {
      setRecipes(prev => prev.map(r => r.id === shoppingListRecipe.id ? { ...r, description: newData } : r));
    } else {
      const newRecipe: Recipe = {
        id: `sl-${Date.now()}`,
        title: 'Shopping List Data',
        description: newData,
        category: Category.ShoppingList,
        ingredients: [],
        steps: [],
        image: '',
        createdAt: Date.now(),
        tags: []
      };
      setRecipes(prev => [...prev, newRecipe]);
    }
  };

  const heatmapMonths = useMemo(() => {
    const months = [];
    const today = new Date();
    for (let i = -5; i <= 2; i++) {
        const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
        const year = d.getFullYear();
        const month = d.getMonth() + 1;
        const daysInMonth = new Date(year, month, 0).getDate();
        const days = [];
        for(let j = 1; j <= daysInMonth; j++) {
            const dateStr = `${year}-${String(month).padStart(2,'0')}-${String(j).padStart(2,'0')}`;
            let count = 0;
            plan.forEach(p => { if (p.date === dateStr) count++; });
            days.push({ day: j, count, dateStr });
        }
        months.push({ label: `${month}月`, year: year, isCurrent: i === 0, days: days });
    }
    return months;
  }, [plan]);

  const topRecipes = useMemo(() => {
    const counts: Record<string, number> = {};
    plan.forEach(p => { counts[p.recipeId] = (counts[p.recipeId] || 0) + 1; });
    const sortedIds = Object.keys(counts).sort((a,b) => counts[b] - counts[a]);
    return sortedIds.slice(0, 5).map(id => {
      const r = recipes.find(rec => rec.id === id);
      return r ? { ...r, usageCount: counts[id] } : null;
    }).filter(Boolean) as (Recipe & {usageCount: number})[];
  }, [plan, recipes]);

  const selectedDayMeals = useMemo(() => {
    if (!statsSelectedDate) return [];
    const items = plan.filter(p => p.date === statsSelectedDate);
    const order = { breakfast: 1, lunch: 2, dinner: 3, snack: 4 };
    items.sort((a,b) => order[a.type] - order[b.type]);
    return items.map(item => ({ item, recipe: recipes.find(r => r.id === item.recipeId) }));
  }, [plan, recipes, statsSelectedDate]);

  const visibleRecipes = recipes.filter(r => r.category !== Category.Message && r.category !== Category.ShoppingList);
  const filteredRecipes = useMemo(() => {
    const q = searchQuery.toLowerCase();
    const filtered = visibleRecipes.filter(r => {
      const matchesSearch = r.title.toLowerCase().includes(q) || 
                            r.ingredients.some(i => i.name.includes(q)) ||
                            (r.tags && r.tags.some(t => t.includes(q))); 
      return matchesSearch && (selectedCategory === '全部' || r.category === selectedCategory);
    });
    return filtered.sort((a, b) => b.createdAt - a.createdAt);
  }, [visibleRecipes, searchQuery, selectedCategory]);

  const favoriteRecipes = visibleRecipes.filter(r => r.isFavorite);
  const formatDateDisplay = (dateStr: string) => {
    try {
      const [y, m, day] = dateStr.split('-').map(Number);
      if(m && day) return `${m}月${day}日`;
    } catch(e){}
    return dateStr;
  };

  if (loading && !isRefreshing) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-gray-400">
        <Loader2 className="animate-spin mb-2" size={32} />
        <p className="text-sm font-medium">正在同步数据...</p>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen bg-gray-50 text-gray-900 font-sans selection:bg-brand-100"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull to Refresh Indicator */}
      {(pullDistance > 0 || isRefreshing) && (
        <div className="fixed top-safe-top left-0 right-0 flex justify-center z-30 pointer-events-none transition-transform duration-200" style={{ transform: `translateY(${Math.min(pullDistance/2, 60)}px)` }}>
          <div className="bg-white rounded-full p-2 shadow-md text-brand-500">
            {isRefreshing ? <Loader2 className="animate-spin" size={20} /> : <ArrowDown size={20} style={{ transform: `rotate(${pullDistance * 2}deg)` }} />}
          </div>
        </div>
      )}

      {view === 'recipes' && (
        <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-200 pt-safe-top">
          <div className="px-4 py-3">
             <div className="flex items-center justify-between mb-3">
               <div className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                 <EditableTitle value={userProfile.titles?.home || '企鹅食堂'} onChange={(v) => handleUpdateTitles('home', v)} />
               </div>
               <div className="flex items-center gap-2">
                 {syncing && <span className="flex items-center gap-1 text-[10px] text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full font-bold animate-pulse"><RefreshCw size={10} className="animate-spin" />同步中</span>}
                 <div className="px-2 py-0.5 bg-black text-white text-[10px] rounded-full font-bold uppercase tracking-wider">Beta</div>
               </div>
             </div>
             <div className="relative mb-3">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
               <input type="text" placeholder="搜索菜名、食材、标签..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-gray-100 pl-9 pr-4 py-2.5 rounded-xl text-sm font-medium focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all outline-none" />
             </div>
             <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
               {['全部', ...Object.values(Category).filter(c => c !== Category.Message && c !== Category.ShoppingList)].map(cat => (
                 <button key={cat} onClick={() => setSelectedCategory(cat)} className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-bold transition-colors ${selectedCategory === cat ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>{cat}</button>
               ))}
             </div>
          </div>
        </div>
      )}

      <main className={`pt-4 ${view !== 'recipes' ? 'pt-safe-top' : ''}`}>
        {view === 'recipes' && (
          <div className="px-4 pb-24">
            {pickingForSlot && (
              <div className="mb-4 bg-brand-50 border border-brand-200 p-3 rounded-xl flex items-center justify-between animate-in fade-in slide-in-from-top-4 shadow-sm">
                <div>
                  <span className="block text-xs text-brand-500 font-bold uppercase mb-0.5">正在规划</span>
                  <span className="text-sm font-bold text-gray-800">{formatDateDisplay(pickingForSlot.date)}的{pickingForSlot.type === 'breakfast' ? '早餐' : pickingForSlot.type === 'lunch' ? '午餐' : pickingForSlot.type === 'dinner' ? '晚餐' : '加餐'}</span>
                </div>
                <button onClick={() => setPickingForSlot(null)} className="bg-white px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 border border-gray-200 shadow-sm">取消</button>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              {filteredRecipes.map(recipe => (
                <RecipeCard key={recipe.id} recipe={recipe} onClick={(r) => pickingForSlot ? handleAddToPlan(r) : setSelectedRecipe(r)} onAddToPlan={!pickingForSlot ? handleAddToPlan : undefined} />
              ))}
            </div>
            {/* UI 位置微调至 bottom-[92px] (23 units) */}
            <div className="fixed bottom-[92px] right-4 flex flex-col gap-3 z-30">
               <button onClick={() => setIsVoiceChefOpen(true)} className="w-12 h-12 bg-white text-brand-600 border border-brand-100 rounded-full shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-all"><Mic size={24} /></button>
               <button onClick={handleOpenRandomizer} className="w-12 h-12 bg-white text-gray-800 border border-gray-200 rounded-full shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-all"><Dices size={24} /></button>
               <button onClick={() => { setEditingRecipe(null); setIsAddModalOpen(true); }} className="w-14 h-14 bg-gray-900 text-white rounded-full shadow-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all"><Plus size={28} /></button>
            </div>
          </div>
        )}

        {view === 'planner' && (
          <>
            {placingRecipe && (
              <div className="fixed bottom-20 left-4 right-4 z-50 bg-brand-50 border border-brand-200 p-3 rounded-xl flex items-center justify-between shadow-2xl animate-in slide-in-from-bottom-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-white shrink-0 overflow-hidden border border-brand-100"><img src={placingRecipe.image} className="w-full h-full object-cover"/></div>
                    <div>
                      <span className="block text-xs text-brand-500 font-bold uppercase mb-0.5">正在添加...</span>
                      <span className="text-xs font-bold text-gray-800 line-clamp-1">点击 + 号将 "{placingRecipe.title}" 加入计划</span>
                    </div>
                  </div>
                  <button onClick={() => setPlacingRecipe(null)} className="bg-white px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 border border-gray-200 shadow-sm">取消</button>
               </div>
            )}
            <WeeklyPlanner plan={plan} recipes={visibleRecipes} titles={{ title: userProfile.titles?.planner || '饮食计划', subtitle: userProfile.titles?.plannerSubtitle || 'Meal Planner' }} onUpdateTitles={(t) => { handleUpdateTitles('planner', t.title); handleUpdateTitles('plannerSubtitle', t.subtitle); }} onRemoveItem={handleRemovePlanItem} onOpenPicker={(date, type) => placingRecipe ? confirmPlacement(date, type) : (setPickingForSlot({ date, type }), handleSetView('recipes'))} onRecipeClick={(r) => setSelectedRecipe(r)} />
          </>
        )}

        {view === 'shopping' && (
          <ShoppingList plan={plan} recipes={visibleRecipes} manualItems={shoppingListData.manualItems} checkedItems={shoppingListData.checkedItems} title={userProfile.titles?.shopping || '购物清单'} onUpdateTitle={(t) => handleUpdateTitles('shopping', t)} onUpdate={handleUpdateShoppingList} />
        )}

        {view === 'settings' && (
           <div className="mt-4">
             {showAllFavorites ? (
               <div className="animate-in slide-in-from-right duration-300 pb-24">
                 <div className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-gray-100 px-4 py-3 flex items-center gap-3"><button onClick={() => setShowAllFavorites(false)} className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"><ChevronLeft size={24} className="text-gray-800" /></button><h2 className="text-lg font-bold text-gray-900">全部收藏 ({favoriteRecipes.length})</h2></div>
                 <div className="p-4 grid grid-cols-2 gap-4">{favoriteRecipes.map(recipe => <RecipeCard key={recipe.id} recipe={recipe} onClick={(r) => setSelectedRecipe(r)} />)}</div>
               </div>
             ) : (
               <div className="px-4 pb-24 animate-in fade-in duration-300">
                 <div className="flex items-center gap-4 mb-6">
                    <button onClick={() => setIsProfileModalOpen(true)} className="w-16 h-16 rounded-full bg-brand-100 flex items-center justify-center text-3xl border-2 border-white shadow-md relative overflow-hidden">{userProfile.avatar.startsWith('data:') ? <img src={userProfile.avatar} className="w-full h-full object-cover" /> : userProfile.avatar}</button>
                    <div onClick={() => setIsProfileModalOpen(true)} className="flex-1 cursor-pointer group"><div className="flex items-center gap-2"><h2 className="text-2xl font-bold text-gray-900">{userProfile.name}</h2><Edit2 size={14} className="text-gray-300 group-hover:text-gray-500" /></div><p className="text-gray-500 text-sm">{userProfile.tagline || '今天也要好好吃饭'}</p></div>
                 </div>
                 <div className="flex p-1 bg-gray-100 rounded-xl mb-6">
                    <button onClick={() => setProfileTab('overview')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${profileTab === 'overview' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}><Activity size={14} /> 概览</button>
                    <button onClick={() => setProfileTab('stats')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${profileTab === 'stats' ? 'bg-white text-brand-600 shadow-sm' : 'text-gray-500'}`}><BarChart3 size={14} /> 数据</button>
                 </div>

                 {profileTab === 'stats' ? (
                   <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                      <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-5 text-white shadow-lg relative overflow-hidden"><div className="absolute top-0 right-0 opacity-10 transform translate-x-4 -translate-y-4"><Trophy size={100} /></div><h3 className="text-sm font-bold opacity-80 mb-1">本周战绩</h3><div className="flex items-end gap-2 mb-4"><span className="text-3xl font-black">{plan.filter(p => { const d = new Date(p.date); return (new Date().getTime() - d.getTime()) < 7 * 24 * 60 * 60 * 1000; }).length}</span><span className="text-sm opacity-80 mb-1">顿饭</span></div><div className="flex gap-2"><div className="bg-white/20 rounded-lg px-2 py-1 text-xs backdrop-blur-sm">早 {plan.filter(p => p.type === 'breakfast').length}</div><div className="bg-white/20 rounded-lg px-2 py-1 text-xs backdrop-blur-sm">午/晚 {plan.filter(p => p.type === 'lunch' || p.type === 'dinner').length}</div></div></div>

                      <div>
                        <div className="flex items-center gap-2 mb-3"><Flame size={18} className="text-orange-500" /><h3 className="font-bold text-gray-800">厨房热力图</h3></div>
                        <div ref={heatmapScrollRef} className="bg-white rounded-2xl p-4 border border-gray-100 overflow-x-auto no-scrollbar snap-x flex gap-4">
                           {heatmapMonths.map((m, i) => (
                             <div key={i} id={m.isCurrent ? 'heatmap-current-month' : undefined} className={`snap-center shrink-0 w-[340px] flex flex-col items-center ${m.isCurrent ? 'opacity-100' : 'opacity-60 grayscale-[0.5]'}`}>
                               <div className="text-sm font-bold text-gray-800 mb-4">{m.year}年{m.label}</div>
                               <div className="grid grid-cols-7 gap-2.5">
                                 {m.days.map((d, dIdx) => (
                                   <div key={dIdx} onClick={() => setStatsSelectedDate(d.dateStr)} className={`w-11 h-11 rounded-xl flex items-center justify-center text-[13px] font-bold transition-all cursor-pointer ${statsSelectedDate === d.dateStr ? 'ring-2 ring-gray-900 ring-offset-2 z-10 scale-110 shadow-lg' : ''} ${d.count === 0 ? 'bg-gray-50 text-gray-300' : d.count === 1 ? 'bg-green-100 text-green-700' : d.count === 2 ? 'bg-green-300 text-green-900' : 'bg-green-500 text-white'}`}>{d.day}</div>
                                 ))}
                               </div>
                               {m.isCurrent && <div className="mt-4 text-xs text-brand-500 font-bold bg-brand-50 px-4 py-1 rounded-full border border-brand-100">当前月份</div>}
                             </div>
                           ))}
                        </div>
                        <p className="text-center text-[10px] text-gray-400 mt-2">左右滑动查看历史 · 点击日期查看下方详细菜单</p>
                      </div>

                      {/* Day Menu Card - Using Premium Planner Layout */}
                      {statsSelectedDate && (
                         <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                           <div className="flex items-center gap-2">
                             <CalendarIcon size={16} className="text-gray-400" />
                             <h4 className="text-sm font-bold text-gray-700">{formatDateDisplay(statsSelectedDate)} 详细菜单</h4>
                           </div>
                           
                           {selectedDayMeals.length > 0 ? (
                             <div className="space-y-3">
                               {selectedDayMeals.map(({item, recipe}, idx) => {
                                 const meta = {
                                   breakfast: { label: '早餐', icon: Sunrise, color: 'text-orange-500', bg: 'bg-orange-50' },
                                   lunch: { label: '午餐', icon: Sun, color: 'text-yellow-600', bg: 'bg-yellow-50' },
                                   dinner: { label: '晚餐', icon: Moon, color: 'text-indigo-500', bg: 'bg-indigo-50' },
                                   snack: { label: '加餐', icon: Coffee, color: 'text-pink-500', bg: 'bg-pink-50' }
                                 }[item.type];
                                 const Icon = meta.icon;

                                 return (
                                   <div key={idx} onClick={() => recipe && setSelectedRecipe(recipe)} className="group relative bg-white rounded-2xl p-3 shadow-sm border border-gray-100 flex gap-4 cursor-pointer active:scale-[0.98] transition-all">
                                      <div className="w-20 h-20 shrink-0 rounded-xl overflow-hidden bg-gray-100">
                                        {recipe ? <img src={recipe.image} className="w-full h-full object-cover"/> : <Utensils size={16} className="m-2 text-gray-400"/>}
                                      </div>
                                      <div className="flex-1 py-1 min-w-0">
                                        <div className="flex items-center gap-1.5 mb-1">
                                          <div className={`p-1 rounded-md ${meta.bg} ${meta.color}`}><Icon size={10} strokeWidth={2.5} /></div>
                                          <span className={`text-[10px] font-bold ${meta.color}`}>{meta.label}</span>
                                        </div>
                                        <h3 className="font-bold text-gray-800 text-base truncate">{recipe?.title || '未知菜谱'}</h3>
                                        <p className="text-xs text-gray-400 line-clamp-1">{recipe?.description}</p>
                                      </div>
                                      <ChevronRight size={18} className="self-center text-gray-200 group-hover:text-gray-400 transition-colors" />
                                   </div>
                                 );
                               })}
                             </div>
                           ) : (
                             <div className="bg-white rounded-2xl p-8 text-center text-gray-300 border border-dashed border-gray-100"><p className="text-xs">该日暂无安排</p></div>
                           )}
                         </div>
                       )}

                      <div>
                        <div className="flex items-center gap-2 mb-3"><PieChart size={18} className="text-brand-500" /><h3 className="font-bold text-gray-800">家庭口味榜 Top 5</h3></div>
                        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                           {topRecipes.length > 0 ? topRecipes.map((r, idx) => (
                               <div key={r.id} className="flex items-center p-3 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => setSelectedRecipe(r)}>
                                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mr-3 shrink-0 ${idx === 0 ? 'bg-yellow-100 text-yellow-600' : idx === 1 ? 'bg-gray-100 text-gray-600' : 'text-gray-400'}`}>{idx + 1}</div>
                                  <div className="w-10 h-10 rounded-lg bg-gray-100 mr-3 overflow-hidden shrink-0"><img src={r.image} className="w-full h-full object-cover" /></div>
                                  <div className="flex-1 min-w-0"><h4 className="font-bold text-sm text-gray-800 truncate">{r.title}</h4><p className="text-xs text-gray-400">{r.category}</p></div>
                                  <div className="text-xs font-bold text-brand-600 bg-brand-50 px-2 py-1 rounded-full">{r.usageCount}次</div>
                               </div>
                           )) : <div className="p-8 text-center text-gray-400 text-xs"><p>还没有足够的数据生成榜单</p></div>}
                        </div>
                      </div>
                   </div>
                 ) : (
                   <div className="animate-in slide-in-from-left-4 duration-300">
                     <div className="mb-8">
                       <div className="flex items-center gap-2 mb-4"><Users size={20} className="text-blue-500" /><h3 className="text-lg font-bold text-gray-800">共享厨房</h3></div>
                       <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                          {household ? (
                            <div>
                              <div className="flex justify-between items-start mb-4">
                                <div className="flex-1"><p className="text-xs text-gray-400 font-bold uppercase">当前家庭组</p><div className="flex items-center gap-2 mt-1"><h4 className="text-xl font-black text-gray-800">{household.name}</h4><button onClick={() => { setNewHouseholdName(household.name); setIsRenamingHousehold(true); }} className="text-gray-300 hover:text-gray-600"><Edit2 size={14} /></button></div></div>
                                <button onClick={handleLeaveHousehold} className="text-gray-300 hover:text-red-500 p-2"><LogOut size={18} /></button>
                              </div>
                              <div className="bg-brand-50 border border-brand-100 rounded-xl p-4 mb-2"><p className="text-xs text-brand-600 mb-1 font-medium">邀请码</p><div className="flex items-center justify-between"><span className="text-2xl font-mono font-bold text-gray-900 tracking-wider">{household.code}</span><button className="text-brand-600 font-bold text-sm flex items-center gap-1">复制</button></div></div>
                              <div className="mt-6 border-t border-gray-100 pt-4"><div className="flex items-center gap-2 mb-3"><MessageSquare size={16} className="text-green-500" /><h4 className="text-sm font-bold text-gray-700">厨房留言板</h4></div><div className="flex gap-2 mb-4"><input value={messageInput} onChange={e => setMessageInput(e.target.value)} placeholder="比如：今晚我不回来吃饭..." className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none" /><button onClick={handlePostMessage} disabled={!messageInput.trim()} className="bg-green-500 text-white p-2 rounded-xl disabled:opacity-50"><Send size={16} /></button></div><div className="space-y-3 max-h-60 overflow-y-auto">{messages.length === 0 ? <p className="text-xs text-gray-400 text-center py-2">还没有留言</p> : messages.map(msg => <div key={msg.id} className="flex gap-3 items-start group"><div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm border border-white shadow-sm overflow-hidden shrink-0">{msg.image.startsWith('data:') ? <img src={msg.image} className="w-full h-full object-cover" /> : msg.image}</div><div className="flex-1"><div className="flex items-center gap-2 mb-0.5"><span className="text-xs font-bold text-gray-700">{msg.description}</span><span className="text-[10px] text-gray-300">{formatTime(msg.createdAt)}</span></div><div className="bg-gray-50 rounded-r-xl rounded-bl-xl p-2 text-sm text-gray-700 border border-gray-100">{msg.title}</div></div><button onClick={() => deleteMessage(msg.id)} className="text-gray-300 hover:text-red-400 self-center px-2 py-2"><X size={14} /></button></div>)}</div></div>
                            </div>
                          ) : (
                            <div className="space-y-4"><p className="text-sm text-gray-600">加入家庭组，与朋友共享菜谱。</p><div className="flex gap-2"><input value={joinCodeInput} onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())} placeholder="输入邀请码" className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none uppercase font-mono" /><button onClick={handleJoinHousehold} disabled={!joinCodeInput || isJoining} className="bg-gray-900 text-white px-4 rounded-xl text-sm font-bold disabled:opacity-50">{isJoining ? <Loader2 className="animate-spin" size={16}/> : '加入'}</button></div><button onClick={handleCreateHousehold} disabled={isJoining} className="w-full py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-gray-500 text-sm font-bold hover:bg-gray-50 transition-all flex items-center justify-center gap-2">{isJoining ? <Loader2 className="animate-spin" size={16}/> : <Plus size={16} />}创建新家庭</button></div>
                          )}
                       </div>
                     </div>
                     <div className="mb-8"><button onClick={() => setShowAllFavorites(true)} className="w-full flex items-center justify-between mb-4 group"><div className="flex items-center gap-2"><Heart size={20} className="text-red-500" fill="currentColor" /><h3 className="text-lg font-bold text-gray-800">我的收藏</h3></div><div className="flex items-center text-gray-400 text-xs font-medium gap-1 group-hover:text-brand-600 transition-colors">查看全部 ({favoriteRecipes.length}) <ChevronRight size={14} /></div></button>{favoriteRecipes.length > 0 ? <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">{favoriteRecipes.slice(0, 5).map(recipe => <div key={recipe.id} className="w-40 shrink-0"><RecipeCard recipe={recipe} onClick={(r) => setSelectedRecipe(r)} /></div>)}</div> : <div className="bg-white rounded-xl p-8 text-center text-gray-400 border border-dashed border-gray-200"><p>还没有收藏任何菜谱</p></div>}</div>
                     <div className="bg-white rounded-2xl p-4 shadow-sm space-y-4"><div className="flex items-center justify-between p-2"><div className="flex items-center gap-2 text-gray-700"><Trash2 size={18} /><span className="font-medium">重置所有数据</span></div><button onClick={() => { if(confirm("确定要清除所有菜谱和计划吗？")) { localStorage.clear(); window.location.reload(); } }} className="text-red-500 text-sm bg-red-50 px-3 py-1 rounded-full">执行</button></div></div>
                     <div className="text-center mt-8 space-y-1"><p className="text-xs text-gray-300">企鹅食堂 v1.12.0</p></div>
                   </div>
                 )}
               </div>
             )}
           </div>
        )}
      </main>

      <AddRecipeModal isOpen={isAddModalOpen} onClose={() => { setIsAddModalOpen(false); setEditingRecipe(null); }} onSave={handleSaveRecipe} initialData={editingRecipe} />
      <RecipeDetailModal recipe={selectedRecipe} onClose={() => setSelectedRecipe(null)} onToggleFavorite={handleToggleFavorite} onRate={handleRateRecipe} onIngredientClick={handleIngredientClick} onEdit={handleEditClick} />
      <VoiceChef isOpen={isVoiceChefOpen} onClose={() => setIsVoiceChefOpen(false)} />

      {isRandomizerOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4"><div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsRandomizerOpen(false)} /><div className="bg-white w-full max-w-sm rounded-3xl p-6 relative flex flex-col items-center shadow-2xl animate-in zoom-in-95 duration-300"><button onClick={() => setIsRandomizerOpen(false)} className="absolute top-4 right-4 p-2 bg-gray-100 rounded-full text-gray-500 hover:bg-gray-200"><X size={20} /></button><div className="mb-2 mt-4 bg-brand-100 p-4 rounded-full text-brand-600"><Dices size={40} className={isShuffling ? "animate-spin" : ""} /></div><h3 className="text-xl font-black text-gray-900 mb-6">今天吃什么？</h3>{randomResult ? <div className="w-full animate-in fade-in slide-in-from-bottom-4 flex flex-col items-center"><div className="w-[200px]"><RecipeCard recipe={randomResult} onClick={(r) => setSelectedRecipe(r)} /><p className="text-center text-xs text-gray-400 mt-2">点击查看做法</p></div><div className="flex flex-col gap-3 mt-6 w-full">{showPlanOptions ? <div className="animate-in fade-in slide-in-from-bottom-2 w-full"><div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar pb-1">{nextDays.map(d => { const isSelected = d.toDateString() === randomizerTargetDate.toDateString(); const label = d.toDateString() === new Date().toDateString() ? '今天' : `${d.getMonth()+1}/${d.getDate()}`; return <button key={d.toISOString()} onClick={() => setRandomizerTargetDate(d)} className={`flex-1 shrink-0 px-3 py-2 rounded-xl text-xs font-bold transition-all ${isSelected ? 'bg-gray-900 text-white shadow-md' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>{label}</button> })}</div><div className="grid grid-cols-3 gap-2"><button onClick={() => handleQuickAddPlan('breakfast')} className="flex flex-col items-center p-3 rounded-xl bg-orange-50 text-orange-600"><Sunrise size={20} className="mb-1"/><span className="text-xs font-bold">早餐</span></button><button onClick={() => handleQuickAddPlan('lunch')} className="flex flex-col items-center p-3 rounded-xl bg-yellow-50 text-yellow-600"><Sun size={20} className="mb-1"/><span className="text-xs font-bold">午餐</span></button><button onClick={() => handleQuickAddPlan('dinner')} className="flex flex-col items-center p-3 rounded-xl bg-indigo-50 text-indigo-600"><Moon size={20} className="mb-1"/><span className="text-xs font-bold">晚餐</span></button></div></div> : <div className="flex gap-3"><button onClick={handleShuffle} className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl flex items-center justify-center gap-2"><Shuffle size={18} />换一个</button><button onClick={() => setShowPlanOptions(true)} className="flex-1 py-3 bg-brand-500 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2"><CheckCircle2 size={18} />就吃它！</button></div>}</div></div> : <div className="text-center text-gray-400 py-10"><p>正在从收藏夹和高分菜谱中挑选...</p></div>}</div></div>
      )}

      <EditProfileModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} currentName={userProfile.name} currentAvatar={userProfile.avatar} currentTagline={userProfile.tagline} onSave={(name, avatar, tagline) => setUserProfile({ ...userProfile, name, avatar, tagline })} />
      <Navigation currentView={view} setView={handleSetView} />
    </div>
  );
}