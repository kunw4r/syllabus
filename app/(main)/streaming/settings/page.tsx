'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Server, CheckCircle2, AlertCircle, Loader2, Trash2 } from 'lucide-react';
import {
  getStoredConfig,
  storeConfig,
  clearConfig,
  getServerInfo,
  authenticateByName,
  type JellyfinConfig,
} from '@/lib/api/jellyfin';

export default function StreamingSettingsPage() {
  const router = useRouter();
  const [serverUrl, setServerUrl] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'testing' | 'connecting' | 'connected' | 'error'>('idle');
  const [serverInfo, setServerInfo] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [existing, setExisting] = useState<JellyfinConfig | null>(null);

  useEffect(() => {
    const cfg = getStoredConfig();
    if (cfg) {
      setExisting(cfg);
      setServerUrl(cfg.serverUrl);
    }
  }, []);

  const testConnection = async () => {
    if (!serverUrl.trim()) return;
    setStatus('testing');
    setErrorMsg('');
    try {
      const info = await getServerInfo(serverUrl.trim());
      setServerInfo(info);
      setStatus('idle');
    } catch {
      setErrorMsg('Cannot reach server. Check the URL and make sure Jellyfin is running.');
      setStatus('error');
    }
  };

  const connect = async () => {
    if (!serverUrl.trim() || !username.trim()) return;
    setStatus('connecting');
    setErrorMsg('');
    try {
      const result = await authenticateByName(serverUrl.trim(), username, password);
      const config: JellyfinConfig = {
        serverUrl: serverUrl.trim(),
        userId: result.User.Id,
        accessToken: result.AccessToken,
      };
      storeConfig(config);
      setExisting(config);
      setStatus('connected');
      setTimeout(() => router.push('/streaming'), 1000);
    } catch (err: any) {
      setErrorMsg(err?.message?.includes('401') ? 'Invalid username or password.' : 'Connection failed. Check your credentials.');
      setStatus('error');
    }
  };

  const disconnect = () => {
    clearConfig();
    setExisting(null);
    setServerUrl('');
    setUsername('');
    setPassword('');
    setServerInfo(null);
    setStatus('idle');
  };

  return (
    <div className="max-w-lg mx-auto py-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-2xl bg-purple-500/20 flex items-center justify-center">
          <Server size={24} className="text-purple-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Jellyfin Server</h1>
          <p className="text-white/40 text-sm">Connect to your self-hosted media server</p>
        </div>
      </div>

      {/* Connected state */}
      {existing?.accessToken && status !== 'error' && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-5 mb-6">
          <div className="flex items-center gap-3 mb-3">
            <CheckCircle2 size={20} className="text-emerald-400" />
            <span className="font-semibold text-emerald-300">Connected</span>
          </div>
          <p className="text-white/50 text-sm mb-1">Server: {existing.serverUrl}</p>
          <p className="text-white/50 text-sm mb-4">User ID: {existing.userId?.slice(0, 8)}...</p>
          <div className="flex gap-3">
            <button
              onClick={() => router.push('/streaming')}
              className="bg-white text-black font-semibold px-4 py-2 rounded-xl text-sm hover:bg-white/90 transition-colors"
            >
              Browse Library
            </button>
            <button
              onClick={disconnect}
              className="bg-white/10 border border-white/10 px-4 py-2 rounded-xl text-sm hover:bg-red-500/20 hover:border-red-500/30 transition-colors flex items-center gap-2"
            >
              <Trash2 size={14} /> Disconnect
            </button>
          </div>
        </div>
      )}

      {/* Setup form */}
      {(!existing?.accessToken || status === 'error') && (
        <div className="space-y-5">
          {/* Server URL */}
          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">Server URL</label>
            <div className="flex gap-2">
              <input
                type="url"
                placeholder="http://192.168.1.100:8096"
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent/50 transition-colors placeholder:text-white/20"
              />
              <button
                onClick={testConnection}
                disabled={status === 'testing' || !serverUrl.trim()}
                className="bg-white/10 border border-white/10 px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-white/15 transition-colors disabled:opacity-40 shrink-0"
              >
                {status === 'testing' ? <Loader2 size={16} className="animate-spin" /> : 'Test'}
              </button>
            </div>
          </div>

          {/* Server info (after successful test) */}
          {serverInfo && (
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-sm">
              <p className="text-white/70"><span className="text-white font-medium">{serverInfo.ServerName}</span></p>
              <p className="text-white/40 text-xs mt-1">Jellyfin {serverInfo.Version} &middot; {serverInfo.OperatingSystem}</p>
            </div>
          )}

          {/* Credentials */}
          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">Username</label>
            <input
              type="text"
              placeholder="Your Jellyfin username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent/50 transition-colors placeholder:text-white/20"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">Password</label>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && connect()}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent/50 transition-colors placeholder:text-white/20"
            />
          </div>

          {/* Error */}
          {status === 'error' && errorMsg && (
            <div className="flex items-center gap-2 text-red-400 text-sm">
              <AlertCircle size={16} />
              {errorMsg}
            </div>
          )}

          {/* Connect button */}
          <button
            onClick={connect}
            disabled={status === 'connecting' || !serverUrl.trim() || !username.trim()}
            className="w-full bg-accent hover:bg-accent-hover text-white font-semibold py-3 rounded-xl text-sm transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {status === 'connecting' ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Connecting...
              </>
            ) : status === 'connected' ? (
              <>
                <CheckCircle2 size={16} /> Connected!
              </>
            ) : (
              'Connect'
            )}
          </button>

          <p className="text-white/30 text-xs text-center leading-relaxed">
            Your credentials are stored locally in your browser.
            <br />
            Syllabus connects directly to your Jellyfin server — no data is sent elsewhere.
          </p>
        </div>
      )}
    </div>
  );
}
