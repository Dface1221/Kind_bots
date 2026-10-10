import { useEffect, useState } from 'react';
import { Cpu, FileText, FileAudio, CheckCircle } from 'lucide-react';

export default function GenerationScreen() {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const timer1 = setTimeout(() => setStage(1), 1000);
    const timer2 = setTimeout(() => setStage(2), 2500);
    return () => { clearTimeout(timer1); clearTimeout(timer2); };
  }, []);

  const stages = [
    { label: 'Reading sources...', icon: FileText },
    { label: 'Synthesizing script...', icon: Cpu },
    { label: 'Generating audio...', icon: FileAudio },
    { label: 'Ready!', icon: CheckCircle }
  ];

  return (
    <div className="h-full flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto">
      <div className="relative mb-12">
        <div className="w-24 h-24 border-4 border-[var(--color-sand-200)] rounded-full absolute top-0 left-0"></div>
        <div className="w-24 h-24 border-4 border-[var(--color-forest-500)] rounded-full animate-spin border-t-transparent absolute top-0 left-0"></div>
        <div className="w-24 h-24 flex items-center justify-center text-[var(--color-forest-600)]">
          {(() => {
            const Icon = stages[stage].icon;
            return <Icon size={32} />;
          })()}
        </div>
      </div>
      
      <h2 className="text-2xl font-bold mb-4">Crafting your trail</h2>
      
      <div className="w-full space-y-4">
        {stages.map((s, idx) => {
          const isActive = idx === stage;
          const isPast = idx < stage;
          return (
            <div 
              key={idx}
              className={`flex items-center gap-4 p-4 rounded-xl transition-all ${
                isActive ? 'bg-[var(--color-surface-card)] shadow-sm border border-[var(--color-sand-200)]' : 'opacity-50'
              }`}
            >
              <div className={`
                ${isActive ? 'text-[var(--color-forest-600)] animate-pulse' : ''}
                ${isPast ? 'text-[var(--color-forest-500)]' : 'text-[var(--color-text-tertiary)]'}
              `}>
                {isPast ? <CheckCircle size={20} /> : <s.icon size={20} />}
              </div>
              <span className={`font-medium ${isActive ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-secondary)]'}`}>
                {s.label}
              </span>
            </div>
          );
        })}
      </div>
      
      <p className="mt-8 text-sm text-[var(--color-text-tertiary)] bg-[var(--color-surface-card)] px-4 py-2 rounded-full inline-block border border-[var(--color-sand-200)]">
        Simulated generation process
      </p>
    </div>
  );
}
