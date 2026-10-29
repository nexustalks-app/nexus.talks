'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  User,
  KeyRound,
  Copy,
  Check,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  LogOut,
  Camera,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { UserAvatar } from '@/components/user/user-avatar';
import { AvatarPickerModal } from '@/components/user/avatar-picker-modal';
import { isCreatorIdentity } from '@/components/user/nexus-avatar-3d';
import { cn } from '@/lib/utils/cn';

interface AccountSectionProps {
  user: {
    id: string;
    email?: string;
    created_at?: string;
  };
  profile: {
    display_name: string;
    username: string;
    avatar_url: string | null;
    bio?: string | null;
  } | null;
}

export function AccountSection({ user, profile }: AccountSectionProps) {
  const router = useRouter();

  // Avatar selection state
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState<string | null>(profile?.avatar_url ?? null);
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);

  // Profile Editor state
  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [username, setUsername] = useState(profile?.username || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Password Change state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Copy ID state
  const [copiedId, setCopiedId] = useState(false);
  const [showSignoutConfirm, setShowSignoutConfirm] = useState(false);

  const handleCopyId = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(user.id);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setProfileError('Display name cannot be empty.');
      return;
    }

    const cleanUsername = username.replace(/^@+/, '').trim().toLowerCase();
    if (!cleanUsername) {
      setProfileError('Username cannot be empty.');
      return;
    }
    if (cleanUsername.length < 3 || cleanUsername.length > 30) {
      setProfileError('Username must be between 3 and 30 characters.');
      return;
    }
    if (!/^[a-z0-9_.-]+$/.test(cleanUsername)) {
      setProfileError('Username can only contain lowercase letters, numbers, underscores, dots, and hyphens.');
      return;
    }

    setSavingProfile(true);
    setProfileError(null);
    setProfileSuccess(false);

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: displayName.trim(),
          username: cleanUsername,
          bio: bio.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) {
        if (
          error.message.toLowerCase().includes('unique') ||
          error.message.toLowerCase().includes('duplicate') ||
          error.message.toLowerCase().includes('username')
        ) {
          setProfileError('This username is already taken by another member. Please choose another.');
        } else {
          setProfileError(error.message);
        }
      } else {
        setProfileSuccess(true);
        router.refresh();
        setTimeout(() => setProfileSuccess(false), 3000);
      }
    } catch {
      setProfileError('Failed to update profile. Please check your network connection.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }

    setSavingPassword(true);
    setPasswordError(null);
    setPasswordSuccess(false);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password: newPassword });

      if (error) {
        setPasswordError(error.message);
      } else {
        setPasswordSuccess(true);
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => setPasswordSuccess(false), 3000);
      }
    } catch {
      setPasswordError('An error occurred while updating your password.');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase
      .from('profiles')
      .update({ status: 'offline', last_seen_at: new Date().toISOString() })
      .eq('id', user.id);
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const joinedDate = user.created_at
    ? new Date(user.created_at).toLocaleDateString('en', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Unknown';

  return (
    <div className="space-y-8">
      {/* Account Overview */}
      <section aria-labelledby="account-info-heading" className="rounded-2xl border border-stone dark:border-[#382832] bg-white dark:bg-[#20181D] p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setAvatarModalOpen(true)}
              className="relative group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wine rounded-full transition-transform active:scale-95"
              aria-label="Change profile avatar"
            >
              <UserAvatar
                id={profile?.username || user.id}
                display_name={displayName || profile?.display_name || user.email || 'User'}
                avatar_url={currentAvatarUrl}
                size="lg"
                showCreatorBadge={isCreatorIdentity(profile?.display_name) || isCreatorIdentity(profile?.username)}
                className="!h-16 !w-16 shadow-sm group-hover:opacity-90 transition-opacity"
              />
              <span
                title="Change Avatar"
                className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-wine text-white shadow-md border-2 border-white dark:border-[#20181D] group-hover:scale-110 transition-transform"
              >
                <Camera className="h-3 w-3 stroke-[2.2]" />
              </span>
            </button>
            <div>
              <h2 id="account-info-heading" className="text-lg font-bold text-charcoal dark:text-foreground">
                {profile?.display_name || 'Member'}
              </h2>
              <p className="text-xs font-semibold text-wine dark:text-[#F3B3C2]">
                @{profile?.username || 'member'}
              </p>
              <p className="mt-0.5 text-xs text-muted dark:text-muted-foreground">
                {user.email}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setAvatarModalOpen(true)}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-wine/30 dark:border-wine/40 bg-wine/10 dark:bg-wine/20 px-3.5 py-2 text-xs font-semibold text-wine dark:text-[#F3B3C2] transition-all hover:bg-wine hover:text-white active:scale-95"
            >
              <Camera className="h-3.5 w-3.5" />
              <span>Change Avatar</span>
            </button>

            <Link
              href="/profile"
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-stone dark:border-[#382832] bg-porcelain dark:bg-[#251D22] px-3.5 py-2 text-xs font-semibold text-charcoal dark:text-foreground transition-all hover:bg-stone/50 dark:hover:bg-[#2F242B] hover:text-wine dark:hover:text-[#F3B3C2] active:scale-95"
            >
              <span>View Public Profile</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-stone-subtle dark:border-[#382832] pt-5 text-xs">
          <div className="flex items-center justify-between rounded-xl border border-stone dark:border-[#382832] bg-porcelain/60 dark:bg-[#251D22]/60 p-3">
            <span className="text-muted dark:text-muted-foreground">Account Joined</span>
            <span className="font-semibold text-charcoal dark:text-foreground">{joinedDate}</span>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-stone dark:border-[#382832] bg-porcelain/60 dark:bg-[#251D22]/60 p-3">
            <span className="text-muted dark:text-muted-foreground">User ID</span>
            <button
              type="button"
              onClick={handleCopyId}
              title="Copy User ID"
              className="inline-flex items-center gap-1 font-mono text-[11px] text-wine dark:text-[#F3B3C2] hover:underline"
            >
              <span>{user.id.slice(0, 8)}…{user.id.slice(-4)}</span>
              {copiedId ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            </button>
          </div>
        </div>
      </section>

      {/* Edit Profile Form */}
      <section aria-labelledby="edit-profile-heading" className="rounded-2xl border border-stone dark:border-[#382832] bg-white dark:bg-[#20181D] p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-wine/10 dark:bg-wine/25 text-wine dark:text-[#F3B3C2]">
            <User className="h-5 w-5" />
          </div>
          <div>
            <h2 id="edit-profile-heading" className="text-base font-bold text-charcoal dark:text-foreground">
              Edit Profile Information
            </h2>
            <p className="mt-0.5 text-xs text-muted dark:text-muted-foreground">
              Update how you are identified across chats and user discovery.
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveProfile} className="mt-5 space-y-4">
          <div>
            <label htmlFor="display-name" className="block text-xs font-bold uppercase tracking-wider text-muted dark:text-muted-foreground">
              Display Name
            </label>
            <input
              id="display-name"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              maxLength={50}
              className="mt-1.5 w-full rounded-xl border border-stone dark:border-[#382832] bg-white dark:bg-[#251D22] px-3.5 py-2.5 text-sm text-charcoal dark:text-foreground focus:border-wine dark:focus:border-[#F3B3C2] focus:outline-none focus:ring-2 focus:ring-wine/10"
              placeholder="Your full name or moniker"
            />
          </div>

          <div>
            <label htmlFor="account-username" className="block text-xs font-bold uppercase tracking-wider text-muted dark:text-muted-foreground">
              Username
            </label>
            <div className="relative mt-1.5">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 font-mono text-sm font-semibold text-muted dark:text-muted-foreground">
                @
              </span>
              <input
                id="account-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.replace(/^@+/, '').toLowerCase())}
                required
                minLength={3}
                maxLength={30}
                className="w-full rounded-xl border border-stone dark:border-[#382832] bg-white dark:bg-[#251D22] py-2.5 pl-8 pr-3.5 font-mono text-sm text-charcoal dark:text-foreground focus:border-wine dark:focus:border-[#F3B3C2] focus:outline-none focus:ring-2 focus:ring-wine/10"
                placeholder="handle"
              />
            </div>
            <p className="mt-1 text-[11px] text-muted dark:text-muted-foreground">
              Used for private discovery. 3–30 lowercase letters, numbers, underscores, dots, or hyphens.
            </p>
          </div>

          <div>
            <label htmlFor="bio" className="block text-xs font-bold uppercase tracking-wider text-muted dark:text-muted-foreground">
              Bio
            </label>
            <textarea
              id="bio"
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={200}
              className="mt-1.5 w-full resize-none rounded-xl border border-stone dark:border-[#382832] bg-white dark:bg-[#251D22] px-3.5 py-2.5 text-sm text-charcoal dark:text-foreground focus:border-wine dark:focus:border-[#F3B3C2] focus:outline-none focus:ring-2 focus:ring-wine/10"
              placeholder="Tell others a little about yourself…"
            />
            <p className="mt-1 text-right text-[11px] text-muted dark:text-muted-foreground">{bio.length}/200</p>
          </div>

          {profileError && (
            <div className="flex items-center gap-2 rounded-xl border border-rose-200 dark:border-rose-900/40 bg-rose-50 dark:bg-rose-950/20 p-3 text-xs text-rose-700 dark:text-rose-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{profileError}</span>
            </div>
          )}

          {profileSuccess && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50 dark:bg-emerald-950/20 p-3 text-xs text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>Profile details saved successfully!</span>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={savingProfile}
              className={cn(
                'rounded-xl bg-wine px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition-[background-color,transform] duration-150 ease-out',
                'hover:bg-wine-hover active:scale-95 disabled:cursor-not-allowed disabled:opacity-50'
              )}
            >
              {savingProfile ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </section>

      {/* Change Password Form */}
      <section aria-labelledby="password-heading" className="rounded-2xl border border-stone dark:border-[#382832] bg-white dark:bg-[#20181D] p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-wine/10 dark:bg-wine/25 text-wine dark:text-[#F3B3C2]">
            <KeyRound className="h-5 w-5" />
          </div>
          <div>
            <h2 id="password-heading" className="text-base font-bold text-charcoal dark:text-foreground">
              Change Account Password
            </h2>
            <p className="mt-0.5 text-xs text-muted dark:text-muted-foreground">
              Update your Supabase authentication password. Must be at least 6 characters.
            </p>
          </div>
        </div>

        <form onSubmit={handleChangePassword} className="mt-5 space-y-4">
          <div>
            <label htmlFor="new-password" className="block text-xs font-bold uppercase tracking-wider text-muted dark:text-muted-foreground">
              New Password
            </label>
            <input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6}
              className="mt-1.5 w-full rounded-xl border border-stone dark:border-[#382832] bg-white dark:bg-[#251D22] px-3.5 py-2.5 text-sm text-charcoal dark:text-foreground focus:border-wine dark:focus:border-[#F3B3C2] focus:outline-none focus:ring-2 focus:ring-wine/10"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label htmlFor="confirm-password" className="block text-xs font-bold uppercase tracking-wider text-muted dark:text-muted-foreground">
              Confirm New Password
            </label>
            <input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              className="mt-1.5 w-full rounded-xl border border-stone dark:border-[#382832] bg-white dark:bg-[#251D22] px-3.5 py-2.5 text-sm text-charcoal dark:text-foreground focus:border-wine dark:focus:border-[#F3B3C2] focus:outline-none focus:ring-2 focus:ring-wine/10"
              placeholder="••••••••"
            />
          </div>

          {passwordError && (
            <div className="flex items-center gap-2 rounded-xl border border-rose-200 dark:border-rose-900/40 bg-rose-50 dark:bg-rose-950/20 p-3 text-xs text-rose-700 dark:text-rose-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{passwordError}</span>
            </div>
          )}

          {passwordSuccess && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50 dark:bg-emerald-950/20 p-3 text-xs text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>Your password has been updated securely.</span>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={savingPassword || !newPassword || !confirmPassword}
              className={cn(
                'rounded-xl bg-wine px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition-[background-color,transform] duration-150 ease-out',
                'hover:bg-wine-hover active:scale-95 disabled:cursor-not-allowed disabled:opacity-50'
              )}
            >
              {savingPassword ? 'Updating…' : 'Update Password'}
            </button>
          </div>
        </form>
      </section>

      {/* Sign Out Action */}
      <section aria-labelledby="signout-heading" className="rounded-2xl border border-stone dark:border-[#382832] bg-white dark:bg-[#20181D] p-6 shadow-sm">
        <h2 id="signout-heading" className="text-base font-bold text-charcoal dark:text-foreground">
          Sign Out
        </h2>
        <p className="mt-1 text-xs text-muted dark:text-muted-foreground">
          Signs your account out of this browser and sets your status to offline.
        </p>

        <div className="mt-4">
          {showSignoutConfirm ? (
            <div className="rounded-xl border border-wine/30 bg-wine/5 dark:bg-wine/15 p-4">
              <p className="text-xs font-semibold text-charcoal dark:text-foreground">
                Are you sure you want to end your session?
              </p>
              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="rounded-lg bg-wine px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-wine-hover"
                >
                  Yes, Sign Out
                </button>
                <button
                  type="button"
                  onClick={() => setShowSignoutConfirm(false)}
                  className="rounded-lg border border-stone dark:border-[#382832] bg-white dark:bg-[#251D22] px-3.5 py-1.5 text-xs font-semibold text-charcoal dark:text-foreground hover:bg-porcelain dark:hover:bg-[#2F242B]"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowSignoutConfirm(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-stone dark:border-[#382832] bg-white dark:bg-[#251D22] px-4 py-2 text-xs font-semibold text-charcoal dark:text-foreground shadow-sm transition hover:bg-porcelain dark:hover:bg-[#2F242B] hover:text-wine dark:hover:text-[#F3B3C2] active:scale-95"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Sign Out</span>
            </button>
          )}
        </div>
      </section>

      {/* Profile Avatar Selection Modal */}
      <AvatarPickerModal
        isOpen={avatarModalOpen}
        onClose={() => setAvatarModalOpen(false)}
        currentAvatarUrl={currentAvatarUrl}
        userId={user.id}
        displayName={displayName || profile?.display_name || 'Member'}
        username={profile?.username}
        onSuccess={(newUrl) => {
          setCurrentAvatarUrl(newUrl);
        }}
      />
    </div>
  );
}
