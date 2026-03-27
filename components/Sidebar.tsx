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

const AnalyticsIcon: React.FC<{className?: string}> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
  </svg>
);

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
  isDark?: boolean;
  onToggleDark?: () => void;
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

export const Sidebar: React.FC<SidebarProps> = ({ currentView, setView, onLogout, onNewSession, isCollapsed, setIsCollapsed, userTier, onTierChange, isMobileOpen, setIsMobileOpen, isDark, onToggleDark }) => {
  // Only show admin-specific UI elements to admin users
  const safeTier: UserTier = userTier in tierNames ? userTier : 'free';
  const isAdmin = safeTier === 'admin';
  
  const navItems = [
    { id: 'dashboard', label: 'Home', icon: DashboardIcon, adminOnly: false },
    { id: 'admin_panel', label: 'Admin Panel', icon: AdminPanelIcon, adminOnly: true },
    { id: 'courses', label: 'My Courses', icon: BookOpenIcon, adminOnly: false },
    { id: 'assessments', label: 'Assessments', icon: ClipboardCheckIcon, adminOnly: false },
    { id: 'analytics', label: 'Analytics', icon: AnalyticsIcon, adminOnly: false },
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
    const isActive = currentView === id || (id === 'courses' && currentView === 'course_detail') || (id === 'assessments' && currentView === 'exam_detail');
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
        fixed lg:sticky lg:top-0 inset-y-0 left-0 z-50
        h-full lg:h-screen bg-gradient-to-b from-white to-blue-50/30 dark:from-slate-900 dark:to-slate-800
        px-3 py-4 flex flex-col
        border-r border-blue-100/60 dark:border-slate-800
        transition-all duration-300 shadow-lg
        overflow-y-auto flex-shrink-0
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        ${isCollapsed ? 'w-20' : 'w-64'}
      `}>
      {/* Header Section - Fixed at top */}
      <div className="flex-shrink-0">
        {/* Mobile Close Button */}
        <div className="flex items-center justify-between mb-4 lg:mb-6">
          <div className={`flex items-center gap-2 ${isCollapsed ? 'justify-center px-0' : 'px-3'}`}>
            {isCollapsed
              ? <img src="/logo-no-name.jpeg" className="w-9 h-9 flex-shrink-0 object-contain" alt="EduReach" />
              : <img src="/logo.jpeg" className="h-10 object-contain" alt="EduReach" />
            }
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
        {isAdmin && <RoleSwitcher currentTier={safeTier} onTierChange={onTierChange} isCollapsed={isCollapsed} />}

        <Button
          onClick={onNewSession}
          title="New Session"
          variant="primary"
          size={isCollapsed ? 'icon' : 'sm'}
          className={`w-full mb-3 text-sm ${isCollapsed ? '' : 'gap-2'}`}
          icon={<NewSessionIcon className="w-5 h-5" />}
        >
          {!isCollapsed && 'New Session'}
        </Button>
      </div>

      {/* Navigation Section - Scrollable on mobile */}
      <nav className="space-y-1 overflow-y-auto flex-1 min-h-0 lg:overflow-y-visible lg:flex-none">
        {navItems.map(item => {
          if (item.adminOnly && safeTier !== 'admin') {
              return null;
          }
          return <NavItem key={item.id} {...item} />
        })}
      </nav>

      {/* Desktop collapse button - hidden on mobile */}
      <div className="hidden lg:flex items-center justify-center my-5 flex-shrink-0">
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

      {/* Footer Section - Fixed at bottom */}
      <div className="flex-shrink-0 mt-auto">
        {!isCollapsed && safeTier !== 'pro' && safeTier !== 'pro_plus' && safeTier !== 'admin' && (
            <div className="hidden lg:block p-4 mb-4 bg-gradient-to-br from-blue-50 to-emerald-50 dark:from-slate-800 dark:to-slate-700 rounded-md text-center border border-blue-100 dark:border-slate-700">
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">You are on the <span className="capitalize font-bold text-blue-600 dark:text-emerald-300">{safeTier}</span> plan.</p>
                <Button onClick={() => setView('billing')} className="mt-3 w-full justify-center gap-2" size="md" icon={<UpgradeIcon className="w-4 h-4" />}>
                    Upgrade Plan
                </Button>
            </div>
        )}

        <div className="hidden lg:block border-t border-blue-100 dark:border-slate-800 pt-4">
          {onToggleDark && (
            <button
              onClick={onToggleDark}
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              className={`w-full flex items-center gap-2 rounded-md hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors min-h-[44px] mb-2 ${isCollapsed ? 'justify-center p-2' : 'px-3 py-2.5'}`}
            >
              {isDark ? (
                <svg className="w-5 h-5 text-amber-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-slate-500 dark:text-slate-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                </svg>
              )}
              {!isCollapsed && <span className="text-sm text-slate-600 dark:text-slate-300">{isDark ? 'Light Mode' : 'Dark Mode'}</span>}
            </button>
          )}
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
                <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{tierNames[safeTier]}</p>
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
        <div className="lg:hidden border-t border-blue-100 dark:border-slate-800 pt-3 mt-2">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                setView('profile');
                setIsMobileOpen(false);
              }}
              className="px-3 py-2 rounded-md border border-blue-100 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-slate-700"
            >
              Profile
            </button>
            <button
              onClick={() => {
                onLogout();
                setIsMobileOpen(false);
              }}
              className="px-3 py-2 rounded-md border border-rose-200 dark:border-rose-900 text-sm font-medium text-rose-600 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-900/30"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </aside>
    </>
  );
};
