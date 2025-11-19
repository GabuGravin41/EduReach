import React from 'react';
import { DashboardIcon } from './icons/DashboardIcon';
import { BookOpenIcon } from './icons/BookOpenIcon';
import { ClipboardCheckIcon } from './icons/ClipboardCheckIcon';
import { UsersIcon } from './icons/UsersIcon';
import { NewSessionIcon } from './icons/NewSessionIcon';
import { LogoutIcon } from './icons/LogoutIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { UserCircleIcon } from './icons/UserCircleIcon';
import { ChevronLeftIcon } from './icons/ChevronLeftIcon';
import { PriceTagIcon } from './icons/PriceTagIcon';
import { UpgradeIcon } from './icons/UpgradeIcon';
import { AdminPanelIcon } from './icons/AdminPanelIcon';
import { View, UserTier } from '../App';

interface SidebarProps {
  currentView: string;
  setView: (view: View) => void;
  onLogout: () => void;
  onNewSession: () => void;
  isCollapsed: boolean;
  setIsCollapsed: (isCollapsed: boolean) => void;
  userTier: UserTier;
  onTierChange: (tier: UserTier) => void;
}

const tierNames: Record<UserTier, string> = {
    free: 'Free Tier',
    learner: 'Learner Tier',
    pro: 'Pro Tier',
    pro_plus: 'Pro Plus Tier',
    admin: 'Admin'
};

const RoleSwitcher: React.FC<{ currentTier: UserTier; onTierChange: (tier: UserTier) => void, isCollapsed: boolean }> = ({ currentTier, onTierChange, isCollapsed }) => {
    return (
        <div className="mb-4">
            <label htmlFor="role-switcher" className={`block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 ${isCollapsed ? 'text-center' : ''}`}>
                {isCollapsed ? 'View' : 'View Site As'}
            </label>
            <select
                id="role-switcher"
                value={currentTier}
                onChange={(e) => onTierChange(e.target.value as UserTier)}
                className={`w-full p-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 ${isCollapsed ? 'text-center' : ''}`}
            >
                <option value="admin">Admin (Full Access)</option>
                <option value="free">Free User</option>
                <option value="learner">Learner User</option>
                <option value="pro">Pro User</option>
                <option value="pro_plus">Pro Plus User</option>
            </select>
        </div>
    );
};

export const Sidebar: React.FC<SidebarProps> = ({ currentView, setView, onLogout, onNewSession, isCollapsed, setIsCollapsed, userTier, onTierChange }) => {
  // Only show admin-specific UI elements to admin users
  const isAdmin = userTier === 'admin';
  
  const navItems = [
    { id: 'dashboard', label: 'Home', icon: DashboardIcon, adminOnly: false },
    { id: 'admin_panel', label: 'Admin Panel', icon: AdminPanelIcon, adminOnly: true },
    { id: 'courses', label: 'My Courses', icon: BookOpenIcon, adminOnly: false },
    { id: 'assessments', label: 'Assessments', icon: ClipboardCheckIcon, adminOnly: false },
    { id: 'community', label: 'Community', icon: UsersIcon, adminOnly: false },
    { id: 'pricing', label: 'Pricing', icon: PriceTagIcon, adminOnly: false },
  ];

  const NavItem: React.FC<{ id: string; label: string; icon: React.ElementType }> = ({ id, label, icon: Icon }) => {
    const isActive = currentView === id;
    return (
      <button
        title={label}
        onClick={() => setView(id as View)}
        className={`w-full flex items-center gap-3 py-3 rounded-xl text-sm font-medium transition-all duration-200 min-h-[44px] ${isCollapsed ? 'px-3 justify-center' : 'px-4'} ${
          isActive
            ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md transform scale-105'
            : 'text-gray-600 hover:bg-orange-50 dark:text-gray-400 dark:hover:bg-orange-900/20 hover:text-orange-600 dark:hover:text-orange-400'
        }`}
      >
        <Icon className="w-5 h-5 flex-shrink-0" />
        {!isCollapsed && <span>{label}</span>}
      </button>
    );
  };

  return (
    <aside className={`h-full bg-gradient-to-b from-white to-orange-50/30 dark:from-gray-800 dark:to-gray-900 p-4 flex flex-col justify-between border-r border-orange-200 dark:border-gray-700 transition-all duration-300 shadow-lg ${isCollapsed ? 'w-20' : 'w-64'}`}>
      <div>
        <div className={`flex items-center gap-2 mb-8 ${isCollapsed ? 'justify-center px-0' : 'px-4'}`}>
          <SparklesIcon className="w-8 h-8 text-orange-500" />
          {!isCollapsed && <span className="text-xl font-bold text-gray-800 dark:text-white">EduReach</span>}
        </div>

        {/* Only show tier switcher to admin users */}
        {isAdmin && <RoleSwitcher currentTier={userTier} onTierChange={onTierChange} isCollapsed={isCollapsed} />}

        <button 
          onClick={onNewSession}
          title="New Session"
          className={`w-full flex items-center justify-center gap-2 mb-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-green-500 text-white font-semibold hover:from-emerald-600 hover:to-green-600 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 min-h-[48px] ${isCollapsed ? 'px-2' : 'px-4'}`}
        >
          <NewSessionIcon className="w-5 h-5" />
          {!isCollapsed && <span>New Session</span>}
        </button>

        <nav className="space-y-2">
          {navItems.map(item => {
            return <NavItem key={item.id} {...item} />
          })}
        </nav>
      </div>

      <div>
        {!isCollapsed && userTier !== 'pro' && userTier !== 'pro_plus' && userTier !== 'admin' && (
            <div className="p-4 mb-4 bg-gradient-to-br from-amber-50 to-orange-50 dark:bg-gray-700/50 rounded-xl text-center border border-amber-200 dark:border-gray-600">
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">You are on the <span className="capitalize font-bold text-orange-600 dark:text-orange-400">{userTier}</span> plan.</p>
                <button onClick={() => setView('pricing')} className="mt-3 w-full flex items-center justify-center gap-2 text-sm font-bold py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-white hover:from-amber-600 hover:to-yellow-600 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 min-h-[44px]">
                    <UpgradeIcon className="w-4 h-4" />
                    Upgrade Plan
                </button>
            </div>
        )}

        <div className="border-t border-orange-200 dark:border-gray-700 pt-4">
          <button 
            onClick={() => setView('profile')}
            className={`w-full flex items-center gap-3 rounded-xl hover:bg-orange-50 dark:hover:bg-gray-700 transition-all duration-200 min-h-[48px] ${isCollapsed ? 'justify-center p-2' : 'px-4 py-3'}`}
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-orange-200 to-amber-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0 shadow-sm">
              <UserCircleIcon className="w-6 h-6 text-orange-600 dark:text-gray-400" />
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0 text-left">
                <p className="font-semibold text-sm truncate text-gray-700 dark:text-white">Profile</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{tierNames[userTier]}</p>
              </div>
            )}
          </button>
          {!isCollapsed && (
            <button
              onClick={onLogout}
              className="w-full mt-2 flex items-center gap-3 px-4 py-3 rounded-xl text-gray-500 hover:bg-orange-50 dark:text-gray-400 dark:hover:bg-gray-700 hover:text-orange-600 dark:hover:text-orange-400 transition-all duration-200 min-h-[44px]"
            >
              <LogoutIcon className="w-5 h-5" />
              <span>Logout</span>
            </button>
          )}
          <button onClick={() => setIsCollapsed(!isCollapsed)} className="relative -translate-y-1/2 bg-white dark:bg-gray-700 border border-orange-200 dark:border-gray-600 rounded-full p-2 hover:bg-orange-50 dark:hover:bg-gray-600 transition-all duration-200 shadow-lg z-10 hover:border-orange-300 dark:hover:border-gray-500">
              <ChevronLeftIcon className={`w-4 h-4 transition-transform duration-300 ${isCollapsed && 'rotate-180'}`} />
          </button>
        </div>
      </div>
    </aside>
  );
};
