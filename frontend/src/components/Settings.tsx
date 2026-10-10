
import { Shield, Brain, Volume2 } from 'lucide-react';

export default function Settings() {
  return (
    <div className="max-w-3xl mx-auto p-8">
      <h1 className="text-3xl font-bold tracking-tight mb-8">Settings</h1>
      
      <div className="bg-[var(--color-surface-card)] rounded-2xl border border-[var(--color-sand-200)] shadow-sm overflow-hidden">
        
        {/* Privacy Section */}
        <div className="p-8 border-b border-[var(--color-sand-200)]">
          <div className="flex items-start gap-4">
            <div className="bg-[var(--color-forest-100)] text-[var(--color-forest-600)] p-3 rounded-xl mt-1">
              <Shield size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold mb-2">Privacy First</h2>
              <p className="text-[var(--color-text-secondary)] mb-4">
                Tabs to Trails is designed to keep your browsing habits private. By default, all processing happens locally on your machine.
              </p>
              <label className="flex items-center gap-3 p-4 border border-[var(--color-forest-200)] bg-[var(--color-forest-50)] rounded-xl cursor-pointer">
                <input type="checkbox" checked readOnly className="w-5 h-5 accent-[var(--color-forest-600)]" />
                <span className="font-medium text-[var(--color-forest-800)]">Strict Local Mode (Recommended)</span>
              </label>
            </div>
          </div>
        </div>

        {/* AI Provider Section */}
        <div className="p-8 border-b border-[var(--color-sand-200)]">
          <div className="flex items-start gap-4">
            <div className="bg-[var(--color-sand-100)] text-[var(--color-text-primary)] p-3 rounded-xl mt-1">
              <Brain size={24} />
            </div>
            <div className="w-full">
              <h2 className="text-xl font-bold mb-2">Synthesis Engine</h2>
              <p className="text-[var(--color-text-secondary)] mb-4">
                Select the AI model used to summarize and rewrite articles into narration scripts.
              </p>
              <select className="w-full p-3 rounded-xl border border-[var(--color-sand-200)] bg-white font-medium outline-none focus:border-[var(--color-forest-500)]">
                <option value="ollama">Ollama (Local) - Default</option>
                <option value="gemma" disabled>Google Gemma (Coming soon)</option>
              </select>
            </div>
          </div>
        </div>

        {/* TTS Provider Section */}
        <div className="p-8">
          <div className="flex items-start gap-4">
            <div className="bg-[var(--color-sand-100)] text-[var(--color-text-primary)] p-3 rounded-xl mt-1">
              <Volume2 size={24} />
            </div>
            <div className="w-full">
              <h2 className="text-xl font-bold mb-2">Voice Engine</h2>
              <p className="text-[var(--color-text-secondary)] mb-4">
                Select the Text-to-Speech system for generating the audio trail.
              </p>
              <select className="w-full p-3 rounded-xl border border-[var(--color-sand-200)] bg-white font-medium outline-none focus:border-[var(--color-forest-500)]">
                <option value="voxcpm2">VoxCPM2 (Local) - Default</option>
                <option value="coqui" disabled>Coqui TTS (Coming soon)</option>
              </select>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
