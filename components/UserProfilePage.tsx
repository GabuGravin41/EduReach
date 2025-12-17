import React, { useState } from 'react';
import { useAuth } from '../src/contexts/AuthContext';
import { UserCircleIcon } from './icons/UserCircleIcon';
import { UserTier } from '../App';

const tierNames: Record<UserTier, string> = {
    free: 'Free Tier',
    learner: 'Learner Tier',
    pro: 'Pro Tier',
    pro_plus: 'Pro Plus Tier',
    admin: 'Admin'
};

const tierDescriptions: Record<UserTier, string> = {
    free: 'Basic access to courses and assessments',
    learner: 'Enhanced learning with more courses and assessments',
    pro: 'Professional features with unlimited courses',
    pro_plus: 'Premium experience with all features unlocked',
    admin: 'Full administrative access to all platform features'
};

export const UserProfilePage: React.FC = () => {
    const { user } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        first_name: user?.first_name || '',
        last_name: user?.last_name || '',
        email: user?.email || '',
        bio: user?.bio || ''
    });

    const handleSave = async () => {
        // TODO: Implement profile update API call
        console.log('Saving profile:', formData);
        setIsEditing(false);
        alert('Profile updated successfully!');
    };

    const handleCancel = () => {
        setFormData({
            first_name: user?.first_name || '',
            last_name: user?.last_name || '',
            email: user?.email || '',
            bio: user?.bio || ''
        });
        setIsEditing(false);
    };

    if (!user) return null;

    return (
        <div className="max-w-4xl mx-auto">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-8 py-12">
                    <div className="flex items-center space-x-6">
                        <div className="w-24 h-24 rounded-full bg-white/20 flex items-center justify-center">
                            <UserCircleIcon className="w-16 h-16 text-white" />
                        </div>
                        <div className="text-white">
                            <h1 className="text-3xl font-bold">{user.username}</h1>
                            <p className="text-indigo-100 mt-1">
                                {user.first_name && user.last_name 
                                    ? `${user.first_name} ${user.last_name}` 
                                    : 'Complete your profile'
                                }
                            </p>
                            <div className="flex items-center mt-3">
                                <span className="px-3 py-1 bg-white/20 rounded-full text-sm font-medium">
                                    {tierNames[user.tier]}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="p-8">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Profile Information */}
                        <div className="lg:col-span-2">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                                    Profile Information
                                </h2>
                                {!isEditing ? (
                                    <button
                                        onClick={() => setIsEditing(true)}
                                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                                    >
                                        Edit Profile
                                    </button>
                                ) : (
                                    <div className="space-x-3">
                                        <button
                                            onClick={handleSave}
                                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                                        >
                                            Save
                                        </button>
                                        <button
                                            onClick={handleCancel}
                                            className="px-4 py-2 bg-slate-500 text-white rounded-lg hover:bg-slate-600 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                            First Name
                                        </label>
                                        {isEditing ? (
                                            <input
                                                type="text"
                                                value={formData.first_name}
                                                onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                                                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                                            />
                                        ) : (
                                            <p className="px-4 py-2 bg-slate-50 dark:bg-slate-700 rounded-lg text-slate-900 dark:text-slate-100">
                                                {user.first_name || 'Not set'}
                                            </p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                            Last Name
                                        </label>
                                        {isEditing ? (
                                            <input
                                                type="text"
                                                value={formData.last_name}
                                                onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                                                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                                            />
                                        ) : (
                                            <p className="px-4 py-2 bg-slate-50 dark:bg-slate-700 rounded-lg text-slate-900 dark:text-slate-100">
                                                {user.last_name || 'Not set'}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                        Email
                                    </label>
                                    {isEditing ? (
                                        <input
                                            type="email"
                                            value={formData.email}
                                            onChange={(e) => setFormData({...formData, email: e.target.value})}
                                            className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                                        />
                                    ) : (
                                        <p className="px-4 py-2 bg-slate-50 dark:bg-slate-700 rounded-lg text-slate-900 dark:text-slate-100">
                                            {user.email || 'Not set'}
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                        Bio
                                    </label>
                                    {isEditing ? (
                                        <textarea
                                            value={formData.bio}
                                            onChange={(e) => setFormData({...formData, bio: e.target.value})}
                                            rows={4}
                                            className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                                            placeholder="Tell us about yourself..."
                                        />
                                    ) : (
                                        <p className="px-4 py-2 bg-slate-50 dark:bg-slate-700 rounded-lg text-slate-900 dark:text-slate-100 min-h-[100px]">
                                            {user.bio || 'No bio added yet'}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Subscription Info */}
                        <div className="lg:col-span-1">
                            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4">
                                Subscription Details
                            </h3>
                            <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-6">
                                <div className="text-center mb-4">
                                    <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                                            {user.tier === 'pro_plus' ? 'P+' : user.tier.charAt(0).toUpperCase()}
                                        </span>
                                    </div>
                                    <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                                        {tierNames[user.tier]}
                                    </h4>
                                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
                                        {tierDescriptions[user.tier]}
                                    </p>
                                </div>

                                {user.tier !== 'admin' && user.tier !== 'pro_plus' && (
                                    <button className="w-full mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                                        Upgrade Plan
                                    </button>
                                )}
                            </div>

                            <div className="mt-6 bg-slate-50 dark:bg-slate-700 rounded-lg p-6">
                                <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-3">
                                    Account Info
                                </h4>
                                <div className="space-y-3 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-slate-600 dark:text-slate-400">Username:</span>
                                        <span className="text-slate-800 dark:text-slate-100 font-medium">{user.username}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-600 dark:text-slate-400">Member since:</span>
                                        <span className="text-slate-800 dark:text-slate-100 font-medium">
                                            {new Date(user.created_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
