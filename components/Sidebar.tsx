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
import { XIcon } from './icons/XIcon';
import { View, UserTier } from '../App';
import { Button } from './ui/Button';

interface SidebarProps {
  currentView: string;
  setView: (view: View) => void;
  onLogout: () => void;
  onNewSession: () => void;
  isCollapsed: boolean;
  setIsCollapsed: (isCollapsed: boolean) => void;
  userTier: UserTier;
  onTierChange: (tier: UserTier) => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (isOpen: boolean) => void;
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
                className={`w-full p-2 text-sm rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 ${isCollapsed ? 'text-center' : ''}`}
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

export const Sidebar: React.FC<SidebarProps> = ({ currentView, setView, onLogout, onNewSession, isCollapsed, setIsCollapsed, userTier, onTierChange, isMobileOpen, setIsMobileOpen }) => {
  // Only show admin-specific UI elements to admin users
  const isAdmin = userTier === 'admin';
  
  const navItems = [
    { id: 'dashboard', label: 'Home', icon: DashboardIcon, adminOnly: false },
    { id: 'admin_panel', label: 'Admin Panel', icon: AdminPanelIcon, adminOnly: true },
    { id: 'courses', label: 'My Courses', icon: BookOpenIcon, adminOnly: false },
    { id: 'assessments', label: 'Assessments', icon: ClipboardCheckIcon, adminOnly: false },
    { id: 'community', label: 'Community', icon: UsersIcon, adminOnly: false },
    { id: 'study_groups', label: 'Study Groups', icon: UsersIcon, adminOnly: false },
    { id: 'billing', label: 'Billing & Plans', icon: PriceTagIcon, adminOnly: false },
  ];

  const handleNavClick = (view: View) => {
    setView(view);
    // Close mobile menu when navigating
    setIsMobileOpen(false);
  };

  const NavItem: React.FC<{ id: string; label: string; icon: React.ElementType }> = ({ id, label, icon: Icon }) => {
    const isActive = currentView === id;
    return (
      <button
        title={label}
        onClick={() => handleNavClick(id as View)}
        className={`w-full flex items-center gap-2 py-2.5 rounded-md text-sm font-medium transition-all duration-200 min-h-[44px] ${isCollapsed ? 'px-2 justify-center' : 'px-3'} ${
          isActive
            ? 'bg-gradient-to-r from-blue-600 to-emerald-600 text-white shadow-md'
            : 'text-gray-600 hover:bg-blue-50 dark:text-gray-400 dark:hover:bg-slate-700/60 hover:text-blue-600 dark:hover:text-emerald-300'
        }`}
      >
        <Icon className="w-5 h-5 flex-shrink-0" />
        {!isCollapsed && <span>{label}</span>}
      </button>
    );
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50
        h-full bg-gradient-to-b from-white to-blue-50/30 dark:from-slate-900 dark:to-slate-800 
        px-3 py-4 flex flex-col justify-between 
        border-r border-blue-100/60 dark:border-slate-800 
        transition-all duration-300 shadow-lg
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        ${isCollapsed ? 'w-20' : 'w-64'}
      `}>
      <div>
        {/* Mobile Close Button */}
        <div className="flex items-center justify-between mb-6 lg:mb-6">
          <div className={`flex items-center gap-2 ${isCollapsed ? 'justify-center px-0' : 'px-3'}`}>
            <SparklesIcon className="w-7 h-7 text-blue-600" />
            {!isCollapsed && <span className="text-xl font-bold text-gray-800 dark:text-white">EduReach</span>}
          </div>
          {/* Mobile close button */}
          <button
            onClick={() => setIsMobileOpen(false)}
            className="lg:hidden p-2 rounded-md hover:bg-blue-100 dark:hover:bg-slate-700 text-gray-600 dark:text-gray-400"
            aria-label="Close menu"
          >
            <XIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Only show tier switcher to admin users */}
        {isAdmin && <RoleSwitcher currentTier={userTier} onTierChange={onTierChange} isCollapsed={isCollapsed} />}

        <Button
          onClick={onNewSession}
          title="New Session"
          variant="primary"
          size={isCollapsed ? 'icon' : 'md'}
          className={`w-full mb-5 ${isCollapsed ? '' : 'gap-2'}`}
          icon={<NewSessionIcon className="w-5 h-5" />}
        >
          {!isCollapsed && 'New Session'}
        </Button>

        <nav className="space-y-2">
          {navItems.map(item => {
            if (item.adminOnly && userTier !== 'admin') {
                return null;
            }
            return <NavItem key={item.id} {...item} />
          })}
        </nav>

        {/* Desktop collapse button - hidden on mobile */}
        <div className="hidden lg:flex items-center justify-center my-5">
          <Button
            variant="outline"
            size="icon"
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="border-blue-200 dark:border-slate-700"
          >
            <ChevronLeftIcon className={`w-4 h-4 transition-transform duration-300 ${isCollapsed && 'rotate-180'}`} />
          </Button>
        </div>
      </div>

      <div>
        {!isCollapsed && userTier !== 'pro' && userTier !== 'pro_plus' && userTier !== 'admin' && (
            <div className="p-4 mb-4 bg-gradient-to-br from-blue-50 to-emerald-50 dark:from-slate-800 dark:to-slate-700 rounded-md text-center border border-blue-100 dark:border-slate-700">
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">You are on the <span className="capitalize font-bold text-blue-600 dark:text-emerald-300">{userTier}</span> plan.</p>
                <Button onClick={() => setView('billing')} className="mt-3 w-full justify-center gap-2" size="md" icon={<UpgradeIcon className="w-4 h-4" />}>
                    Upgrade Plan
                </Button>
            </div>
        )}

        <div className="border-t border-blue-100 dark:border-slate-800 pt-4">
          <button 
            onClick={() => {
              setView('profile');
              setIsMobileOpen(false);
            }}
            className={`w-full flex items-center gap-2 rounded-md hover:bg-blue-50 dark:hover:bg-slate-700 transition-all duration-200 min-h-[44px] ${isCollapsed ? 'justify-center p-2' : 'px-3 py-2.5'}`}
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-200 to-emerald-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0 shadow-sm">
              <UserCircleIcon className="w-6 h-6 text-blue-700 dark:text-gray-300" />
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0 text-left">
                <p className="font-semibold text-sm truncate text-gray-700 dark:text-white">Profile</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{tierNames[userTier]}</p>
              </div>
            )}
          </button>
          {!isCollapsed && (
            <Button
              onClick={() => {
                onLogout();
                setIsMobileOpen(false);
              }}
              variant="ghost"
              className="w-full mt-2 justify-start gap-2 text-sm text-slate-500 dark:text-slate-300"
              icon={<LogoutIcon className="w-5 h-5" />}
            >
              Logout
            </Button>
          )}
        </div>
      </div>
    </aside>
    </>
  );
};