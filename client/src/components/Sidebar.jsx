import React from 'react';
import { Play, Swords, Radio } from 'lucide-react';

const Sidebar = ({ activeMode, setActiveMode }) => {
    const tabs = [
        { id: 'DEMO', label: 'DEMO', icon: Play },
        { id: 'VS', label: 'VS', icon: Swords },
        { id: 'PODCAST', label: 'PODCAST', icon: Radio },
    ];

    return (
        <div className="w-16 md:w-20 bg-surface border-r border-border flex flex-col items-center py-4 gap-4 z-50">
            {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeMode === tab.id;
                return (
                    <button
                        key={tab.id}
                        onClick={() => setActiveMode(tab.id)}
                        className={`
              flex flex-col items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-xl transition-all duration-200
              ${isActive
                                ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-105'
                                : 'text-muted hover:text-text hover:bg-white/5'}
            `}
                        title={tab.label}
                    >
                        <Icon className="w-6 h-6 mb-1" />
                        <span className="text-[10px] font-bold">{tab.label}</span>
                    </button>
                );
            })}
        </div>
    );
};

export default Sidebar;
