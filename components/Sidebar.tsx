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
    { id: 'dashboard', label: 'Dashboard', icon: DashboardIcon, adminOnly: false },
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
        className={`w-full flex items-center gap-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isCollapsed ? 'px-3 justify-center' : 'px-4'} ${
          isActive
            ? 'bg-indigo-600 text-white'
            : 'text-slate-500 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-700'
        }`}
      >
        <Icon className="w-5 h-5 flex-shrink-0" />
        {!isCollapsed && <span>{label}</span>}
      </button>
    );
  };

  return (
    <aside className={`fixed top-0 left-0 h-full bg-white dark:bg-slate-800 p-4 flex flex-col justify-between border-r border-slate-200 dark:border-slate-700 transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'}`}>
      <div>
        <div className={`flex items-center gap-2 mb-8 ${isCollapsed ? 'justify-center px-0' : 'px-4'}`}>
          <SparklesIcon className="w-8 h-8 text-indigo-500" />
          {!isCollapsed && <span className="text-xl font-bold text-slate-800 dark:text-slate-100">EduReach</span>}
        </div>

        {/* Only show tier switcher to admin users */}
        {isAdmin && <RoleSwitcher currentTier={userTier} onTierChange={onTierChange} isCollapsed={isCollapsed} />}

        <button 
          onClick={onNewSession}
          title="New Session"
          className={`w-full flex items-center justify-center gap-2 mb-6 py-2.5 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition-colors ${isCollapsed ? 'px-2' : 'px-4'}`}
        >
          <NewSessionIcon className="w-5 h-5" />
          {!isCollapsed && <span>New Session</span>}
        </button>

        <nav className="space-y-2">
          {navItems.map(item => {
            // Hide admin-only items from non-admin users
            if (item.adminOnly && userTier !== 'admin') {
                return null;
            }
            
            return <NavItem key={item.id} {...item} />
          })}
        </nav>
      </div>

      <div>
        {!isCollapsed && userTier !== 'pro' && userTier !== 'pro_plus' && userTier !== 'admin' && (
            <div className="p-4 mb-4 bg-slate-100 dark:bg-slate-700/50 rounded-lg text-center">
              <p className="text-sm font-semibold">You are on the <span className="capitalize font-bold text-indigo-600 dark:text-indigo-400">{userTier}</span> plan.</p>
                <button onClick={() => setView('pricing')} className="mt-3 w-full flex items-center justify-center gap-2 text-sm font-bold py-2 px-3 rounded-lg bg-yellow-500 text-white hover:bg-yellow-600 transition-colors">
                    <UpgradeIcon className="w-4 h-4" />
                    Upgrade Plan
                </button>
            </div>
        )}

        <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
          <button 
            onClick={() => setView('profile')}
            className={`w-full flex items-center gap-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors ${isCollapsed ? 'justify-center p-2' : 'px-4 py-2.5'}`}
          >
            <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
              <UserCircleIcon className="w-6 h-6 text-slate-500 dark:text-slate-400" />
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0 text-left">
                <p className="font-semibold text-sm truncate text-slate-700 dark:text-slate-200">Profile</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">{tierNames[userTier]}</p>
              </div>
            )}
          </button>
          {!isCollapsed && (
            <button
              onClick={onLogout}
              className="w-full mt-2 flex items-center gap-3 px-4 py-2.5 rounded-lg text-slate-500 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-700 transition-colors"
            >
              <LogoutIcon className="w-5 h-5" />
              <span>Logout</span>
            </button>
          )}
          <button onClick={() => setIsCollapsed(!isCollapsed)} className="absolute -right-3 top-1/2 -translate-y-1/2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-full p-1.5 hover:bg-slate-100 dark:hover:bg-slate-600 transition-transform">
              <ChevronLeftIcon className={`w-4 h-4 transition-transform duration-300 ${isCollapsed && 'rotate-180'}`} />
          </button>
        </div>
      </div>
    </aside>
  );
};
