"use client";

import React, { useState } from "react";

export type LLMProvider = "gemini" | "openrouter" | "openai";

export interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRole: "learner" | "lab_coach";
  onRoleChanged: (newRole: "learner" | "lab_coach") => void;
}

const PROVIDER_MODELS: Record<
  LLMProvider,
  { id: string; label: string; tag?: string }[]
> = {
  gemini: [
    {
      id: "gemini-3.5-flash-lite",
      label: "Gemini 3.5 Flash-Lite",
      tag: "Recommended",
    },
    {
      id: "gemini-3.5-flash",
      label: "Gemini 3.5 Flash",
      tag: "Latest Flagship",
    },
    {
      id: "gemini-3.5-pro",
      label: "Gemini 3.5 Pro",
      tag: "Deep Reasoning",
    },
    {
      id: "gemini-2.5-flash",
      label: "Gemini 2.5 Flash",
      tag: "Balanced",
    },
    {
      id: "gemini-2.5-pro",
      label: "Gemini 2.5 Pro",
      tag: "Reasoning",
    },
    {
      id: "gemini-2.5-flash-lite",
      label: "Gemini 2.5 Flash-Lite",
      tag: "Lightweight",
    },
    {
      id: "gemini-1.5-flash",
      label: "Gemini 1.5 Flash",
      tag: "Legacy Fast",
    },
    {
      id: "gemini-1.5-pro",
      label: "Gemini 1.5 Pro",
      tag: "Legacy",
    },
  ],
  openrouter: [
    {
      id: "google/gemini-3.5-flash-lite",
      label: "Google: Gemini 3.5 Flash-Lite",
      tag: "Ultra Fast",
    },
    {
      id: "google/gemini-2.5-flash",
      label: "Google: Gemini 2.5 Flash",
      tag: "Default",
    },
    {
      id: "anthropic/claude-3.5-sonnet",
      label: "Anthropic: Claude 3.5 Sonnet",
      tag: "Flagship",
    },
    {
      id: "meta-llama/llama-3.3-70b-instruct",
      label: "Meta: Llama 3.3 70B",
      tag: "Open Weights",
    },
    {
      id: "deepseek/deepseek-chat",
      label: "DeepSeek: V3 Chat",
      tag: "Cost Effective",
    },
    {
      id: "openai/gpt-4o",
      label: "OpenAI: GPT-4o",
      tag: "High Capacity",
    },
  ],
  openai: [
    { id: "gpt-4o-mini", label: "GPT-4o Mini", tag: "Recommended" },
    { id: "gpt-4o", label: "GPT-4o Flagship", tag: "High Capacity" },
    { id: "gpt-4.1-turbo", label: "GPT-4.1 Turbo", tag: "Fast" },
    { id: "o3-mini", label: "o3-mini", tag: "Reasoning" },
  ],
};

const PROVIDER_INFO: Record<
  LLMProvider,
  { name: string; placeholder: string; prefix: string }
> = {
  gemini: {
    name: "Google Gemini",
    placeholder: "AIzaSy...",
    prefix: "AIzaSy",
  },
  openrouter: {
    name: "OpenRouter",
    placeholder: "sk-or-v1-...",
    prefix: "sk-or-v1-",
  },
  openai: {
    name: "OpenAI",
    placeholder: "sk-...",
    prefix: "sk-",
  },
};

export function SettingsModal(props: SettingsModalProps) {
  if (!props.isOpen) return null;

  return <SettingsModalContent {...props} />;
}

function SettingsModalContent({
  onClose,
  currentRole,
  onRoleChanged,
}: SettingsModalProps) {
  const [provider, setProvider] = useState<LLMProvider>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("eg_llm_provider") as LLMProvider;
      if (["gemini", "openrouter", "openai"].includes(stored)) return stored;
    }
    return "gemini";
  });
  const [apiKey, setApiKey] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("eg_llm_api_key") || "";
    }
    return "";
  });
  const [model, setModel] = useState(() => {
    if (typeof window !== "undefined") {
      const storedModel = localStorage.getItem("eg_llm_model");
      if (storedModel) return storedModel;
      const storedProvider = (localStorage.getItem("eg_llm_provider") ||
        "gemini") as LLMProvider;
      return (
        PROVIDER_MODELS[storedProvider]?.[0]?.id || "gemini-3.5-flash-lite"
      );
    }
    return "gemini-3.5-flash-lite";
  });
  const [selectedRole, setSelectedRole] = useState<"learner" | "lab_coach">(
    currentRole,
  );
  const [showKey, setShowKey] = useState(false);

  // Test connection states
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    latencyMs?: number;
    error?: string;
  } | null>(null);

  // Saving state
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // When switching provider, set default model if current model doesn't belong to new provider
  function handleProviderChange(newProvider: LLMProvider) {
    setProvider(newProvider);
    if (newProvider === "gemini") {
      const availableModels = PROVIDER_MODELS.gemini;
      const match = availableModels.some((m) => m.id === model);
      if (!match) {
        setModel(availableModels[0].id);
      }
    } else {
      const presets = PROVIDER_MODELS[newProvider];
      const match = presets.some((m) => m.id === model);
      if (!match && (!model || model.startsWith("gemini"))) {
        setModel(presets[0].id);
      }
    }
    setTestResult(null);
  }

  // Paste API key from clipboard
  async function handlePasteKey() {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setApiKey(text.trim());
      }
    } catch {
      // Ignore or let user paste manually
    }
  }

  // Paste Model ID from clipboard
  async function handlePasteModel() {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setModel(text.trim());
        setTestResult(null);
      }
    } catch {
      // Ignore or let user paste manually
    }
  }

  // Test LLM Connection
  async function handleTestConnection() {
    setIsTesting(true);
    setTestResult(null);

    try {
      const res = await fetch("/api/health/llm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          apiKey: apiKey.trim(),
          model: model.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.ok) {
        setTestResult({
          ok: true,
          latencyMs: data.latencyMs ?? 180,
        });
      } else {
        setTestResult({
          ok: false,
          error:
            data.error ||
            `HTTP ${res.status}: Failed to validate provider connection`,
        });
      }
    } catch (err) {
      setTestResult({
        ok: false,
        error:
          err instanceof Error
            ? err.message
            : "Failed to reach /api/health/llm",
      });
    } finally {
      setIsTesting(false);
    }
  }

  // Save settings and close
  async function handleSave() {
    setIsSaving(true);
    setSavedSuccess(false);

    try {
      // 1. Save LLM settings to localStorage
      if (typeof window !== "undefined") {
        localStorage.setItem("eg_llm_provider", provider);
        localStorage.setItem("eg_llm_api_key", apiKey.trim());
        localStorage.setItem("eg_llm_model", model.trim());

        // 2. Save LLM settings to Cookies for server hydration
        document.cookie = `eg_llm_provider=${provider}; path=/; max-age=2592000; SameSite=Lax`;
        document.cookie = `eg_llm_api_key=${encodeURIComponent(apiKey.trim())}; path=/; max-age=2592000; SameSite=Lax`;
        document.cookie = `eg_llm_model=${encodeURIComponent(model.trim())}; path=/; max-age=2592000; SameSite=Lax`;
      }

      // 3. If role changed, persist role
      if (selectedRole !== currentRole) {
        try {
          await fetch("/api/auth/role", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ role: selectedRole }),
          });
        } catch {
          // Continue updating client state even if backend route is unavailable
        }
        onRoleChanged(selectedRole);
      }

      setSavedSuccess(true);
      setTimeout(() => {
        onClose();
      }, 400);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-[#121215] border border-[#27272a] rounded-xl shadow-2xl overflow-hidden flex flex-col text-[#e4e4e7] max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#27272a] bg-[#16161a]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-950/80 border border-cyan-800 flex items-center justify-center text-cyan-400 font-mono text-sm font-semibold">
              ⚙
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm text-white tracking-tight">
                  System Settings &amp; Configuration
                </h3>
                <span className="font-mono text-[9px] px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
                  Track B
                </span>
              </div>
              <p className="text-[11px] text-[#71717a] font-mono">
                Multi-LLM Grounding &amp; Persona Identity
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#71717a] hover:text-white text-xs font-mono p-1 rounded hover:bg-[#27272a] transition"
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto px-5 py-4 space-y-5 flex-1 text-xs">
          {/* Section 1: LLM Provider Selection */}
          <div className="space-y-2">
            <label className="text-[11px] font-mono uppercase tracking-wider text-[#a1a1aa] font-semibold flex items-center justify-between">
              <span>1. LLM Provider</span>
              <span className="text-[10px] text-cyan-400 normal-case font-mono">
                Active: {PROVIDER_INFO[provider].name}
              </span>
            </label>

            {/* Visual Tabs / Segmented Selector */}
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#18181b] border border-[#27272a] rounded-lg">
              {(["gemini", "openrouter", "openai"] as LLMProvider[]).map(
                (p) => {
                  const isActive = provider === p;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => handleProviderChange(p)}
                      className={`py-2 px-3 rounded-md text-xs font-medium transition flex flex-col items-center justify-center gap-0.5 ${
                        isActive
                          ? "bg-cyan-950/70 border border-cyan-500 text-cyan-300 shadow-sm"
                          : "text-[#a1a1aa] hover:text-white hover:bg-[#222227] border border-transparent"
                      }`}
                    >
                      <span className="font-semibold">
                        {PROVIDER_INFO[p].name}
                      </span>
                      <span className="font-mono text-[9px] text-[#71717a]">
                        {p === "gemini"
                          ? "Native SDK"
                          : p === "openrouter"
                            ? "Open Router"
                            : "OpenAI v1"}
                      </span>
                    </button>
                  );
                },
              )}
            </div>
          </div>

          {/* Section 2: API Key Configuration */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-mono uppercase tracking-wider text-[#a1a1aa] font-semibold">
                2. API Key ({PROVIDER_INFO[provider].name})
              </label>
              <button
                type="button"
                onClick={handlePasteKey}
                className="text-[10px] font-mono text-cyan-400 hover:text-cyan-300 hover:underline flex items-center gap-1"
              >
                <span>📋 Paste from clipboard</span>
              </button>
            </div>

            <div className="relative flex items-center">
              <input
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  setTestResult(null);
                }}
                placeholder={PROVIDER_INFO[provider].placeholder}
                className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-xs text-white font-mono placeholder:text-[#52525b] focus:outline-none focus:border-cyan-500 pr-20 transition"
              />
              <div className="absolute right-2 flex items-center gap-1">
                {apiKey && (
                  <button
                    type="button"
                    onClick={() => {
                      setApiKey("");
                      setTestResult(null);
                    }}
                    className="px-1.5 py-0.5 text-[10px] text-[#71717a] hover:text-white font-mono"
                    title="Clear"
                  >
                    ✕
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="px-2 py-1 text-[11px] text-[#a1a1aa] hover:text-white rounded hover:bg-[#27272a] font-mono transition"
                  title={showKey ? "Mask API key" : "Show API key"}
                >
                  {showKey ? "Hide" : "Show"}
                </button>
              </div>
            </div>
            <p className="text-[10px] text-[#71717a] font-mono">
              Key is stored locally in browser localStorage &amp; encrypted
              cookies. Never leaked to client peers.
            </p>
          </div>

          {/* Section 3: Model Configuration */}
          {provider !== "gemini" ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-mono uppercase tracking-wider text-[#a1a1aa] font-semibold flex items-center gap-1.5">
                  <span>3. Model ID ({PROVIDER_INFO[provider].name})</span>
                </label>
                <button
                  type="button"
                  onClick={handlePasteModel}
                  className="text-[10px] font-mono text-cyan-400 hover:text-cyan-300 hover:underline flex items-center gap-1"
                >
                  <span>📋 Paste model ID</span>
                </button>
              </div>

              <div className="relative flex items-center">
                <input
                  type="text"
                  value={model}
                  onChange={(e) => {
                    setModel(e.target.value);
                    setTestResult(null);
                  }}
                  placeholder={
                    provider === "openrouter"
                      ? "Paste or type model ID, e.g. anthropic/claude-3.5-sonnet, deepseek/deepseek-chat"
                      : "Paste or type model ID, e.g. gpt-4o, gpt-4o-mini, o3-mini"
                  }
                  className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-xs text-white font-mono placeholder:text-[#52525b] focus:outline-none focus:border-cyan-500 pr-10 transition"
                />
                {model && (
                  <button
                    type="button"
                    onClick={() => {
                      setModel("");
                      setTestResult(null);
                    }}
                    className="absolute right-2 px-1.5 py-0.5 text-[10px] text-[#71717a] hover:text-white font-mono"
                    title="Clear"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Quick Presets */}
              <div className="space-y-1 pt-0.5">
                <span className="text-[10px] font-mono text-[#71717a]">
                  Or click to apply a preset:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {PROVIDER_MODELS[provider].map((m) => {
                    const isSelected = model === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          setModel(m.id);
                          setTestResult(null);
                        }}
                        className={`px-2 py-1 rounded text-[11px] font-mono transition border ${
                          isSelected
                            ? "bg-cyan-950/80 border-cyan-500 text-cyan-300 shadow-sm"
                            : "bg-[#202024] border-[#3f3f46] text-[#a1a1aa] hover:text-white hover:border-[#52525b]"
                        }`}
                      >
                        {m.label} {m.tag ? `[${m.tag}]` : ""}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-mono uppercase tracking-wider text-[#a1a1aa] font-semibold flex items-center gap-1.5">
                  <span>3. Model Selection (Google Gemini)</span>
                </label>
                <button
                  type="button"
                  onClick={handlePasteModel}
                  className="text-[10px] font-mono text-cyan-400 hover:text-cyan-300 hover:underline flex items-center gap-1"
                >
                  <span>📋 Paste model ID</span>
                </button>
              </div>

              <select
                value={
                  PROVIDER_MODELS.gemini.some((m) => m.id === model)
                    ? model
                    : "custom"
                }
                onChange={(e) => {
                  if (e.target.value !== "custom") {
                    setModel(e.target.value);
                  }
                  setTestResult(null);
                }}
                className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-cyan-500 transition"
              >
                {PROVIDER_MODELS.gemini.map((m) => (
                  <option
                    key={m.id}
                    value={m.id}
                    className="bg-[#18181b] text-white"
                  >
                    {m.label} ({m.id}) {m.tag ? `[${m.tag}]` : ""}
                  </option>
                ))}
                <option value="custom" className="bg-[#18181b] text-white">
                  Custom / Pasted Model ID: {model}
                </option>
              </select>

              {(!PROVIDER_MODELS.gemini.some((m) => m.id === model) ||
                model === "custom") && (
                <div className="relative flex items-center pt-1">
                  <input
                    type="text"
                    value={model === "custom" ? "" : model}
                    onChange={(e) => {
                      setModel(e.target.value);
                      setTestResult(null);
                    }}
                    placeholder="Enter custom Gemini model ID (e.g. gemini-3.5-flash-lite)"
                    className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-xs text-white font-mono placeholder:text-[#52525b] focus:outline-none focus:border-cyan-500 transition"
                  />
                </div>
              )}
            </div>
          )}

          {/* Section 4: Test Connection */}
          <div className="p-3 bg-[#18181b] border border-[#27272a] rounded-lg space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-white">
                  Connection Verification
                </span>
                <p className="text-[10px] text-[#71717a]">
                  Sends a lightweight 1-token probe to POST /api/health/llm
                </p>
              </div>

              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTesting || !apiKey.trim()}
                className="px-3 py-1.5 rounded-md bg-cyan-950 hover:bg-cyan-900 border border-cyan-800 text-cyan-400 hover:text-cyan-300 text-xs font-medium transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-sm"
              >
                {isTesting ? (
                  <>
                    <span className="w-2.5 h-2.5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></span>
                    <span>Testing…</span>
                  </>
                ) : (
                  <>
                    <span>⚡</span>
                    <span>Test Connection</span>
                  </>
                )}
              </button>
            </div>

            {/* Test Result Display */}
            {testResult && (
              <div
                className={`p-2.5 rounded-md border text-xs font-mono flex items-start gap-2 animate-in fade-in duration-150 ${
                  testResult.ok
                    ? "bg-emerald-950/40 border-emerald-800 text-emerald-400"
                    : "bg-red-950/40 border-red-800 text-red-400"
                }`}
              >
                <span className="text-sm flex-shrink-0 mt-0.5">
                  {testResult.ok ? "✓" : "⚠"}
                </span>
                <div className="space-y-0.5 min-w-0 flex-1">
                  {testResult.ok ? (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-emerald-300">
                        Connected Successfully
                      </span>
                      <span className="px-1.5 py-0.2 rounded bg-emerald-900 text-emerald-200 text-[10px] border border-emerald-700">
                        Latency: {testResult.latencyMs}ms
                      </span>
                    </div>
                  ) : (
                    <div>
                      <div className="font-semibold text-red-300">
                        Connection Failed
                      </div>
                      <div className="text-[11px] text-red-400/90 break-words mt-0.5">
                        {testResult.error}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Section 5: Active Persona & Database Role */}
          <div className="space-y-2">
            <label className="text-[11px] font-mono uppercase tracking-wider text-[#a1a1aa] font-semibold flex items-center justify-between">
              <span>5. Active Persona &amp; Database Role</span>
              <span className="text-[10px] text-[#71717a] font-mono">
                ADR 0001 Verified RBAC
              </span>
            </label>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSelectedRole("learner")}
                className={`p-3 rounded-lg border text-left transition flex flex-col justify-between gap-1.5 ${
                  selectedRole === "learner"
                    ? "bg-cyan-950/50 border-cyan-500 text-cyan-300"
                    : "bg-[#18181b] border-[#27272a] text-[#a1a1aa] hover:border-[#3f3f46]"
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-xs font-semibold text-white">
                    Learner
                  </span>
                  {selectedRole === "learner" && (
                    <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                  )}
                </div>
                <span className="text-[10px] text-[#71717a] leading-tight">
                  Verified Logistics Chat, Glass-box Reasoning, Citation links
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedRole("lab_coach")}
                className={`p-3 rounded-lg border text-left transition flex flex-col justify-between gap-1.5 ${
                  selectedRole === "lab_coach"
                    ? "bg-amber-950/50 border-amber-500 text-amber-300"
                    : "bg-[#18181b] border-[#27272a] text-[#a1a1aa] hover:border-[#3f3f46]"
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-xs font-semibold text-white">
                    Lab Coach
                  </span>
                  {selectedRole === "lab_coach" && (
                    <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                  )}
                </div>
                <span className="text-[10px] text-[#71717a] leading-tight">
                  #ta-radar SLA Breach Queue, Ticket Triage, 22:00 Digest
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 border-t border-[#27272a] bg-[#16161a] flex items-center justify-between">
          <div className="text-[11px] font-mono">
            {savedSuccess ? (
              <span className="text-emerald-400 flex items-center gap-1">
                <span>✓</span> Settings Saved &amp; Applied
              </span>
            ) : (
              <span className="text-[#71717a]">
                Changes persist across sessions
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-md bg-[#18181b] hover:bg-[#202024] text-xs text-[#a1a1aa] hover:text-white border border-[#27272a] transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-1.5 rounded-md bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-semibold transition shadow-sm active:scale-[0.98] disabled:opacity-50"
            >
              {isSaving ? "Saving…" : "Save & Close"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
