import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Sliders } from 'lucide-react';

const AdvancedSettings = ({ temperature, setTemperature, p, setP, numGems, setNumGems }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="border border-border rounded-xl overflow-hidden bg-surface/30">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full px-4 py-3 flex items-center justify-between bg-surface/50 hover:bg-surface transition-colors"
            >
                <div className="flex items-center gap-2 font-medium">
                    <Sliders className="w-4 h-4 text-primary" />
                    <span>Advanced Settings</span>
                </div>
                {isOpen ? <ChevronUp className="w-4 h-4 text-muted" /> : <ChevronDown className="w-4 h-4 text-muted" />}
            </button>

            {isOpen && (
                <div className="p-4 space-y-6 border-t border-border">
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <label className="text-sm font-medium text-muted">Temperature</label>
                            <span className="text-xs font-mono bg-surface px-2 py-1 rounded border border-border">{temperature}</span>
                        </div>
                        <input
                            type="range"
                            min="0.1"
                            max="1.5"
                            step="0.05"
                            value={temperature}
                            onChange={(e) => setTemperature(parseFloat(e.target.value))}
                            className="w-full h-2 bg-surface rounded-lg appearance-none cursor-pointer accent-primary"
                        />
                    </div>

                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <label className="text-sm font-medium text-muted">Top-p</label>
                            <span className="text-xs font-mono bg-surface px-2 py-1 rounded border border-border">{p}</span>
                        </div>
                        <input
                            type="range"
                            min="0.8"
                            max="1.0"
                            step="0.01"
                            value={p}
                            onChange={(e) => setP(parseFloat(e.target.value))}
                            className="w-full h-2 bg-surface rounded-lg appearance-none cursor-pointer accent-primary"
                        />
                    </div>

                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <label className="text-sm font-medium text-muted">Number of Gems</label>
                            <span className="text-xs font-mono bg-surface px-2 py-1 rounded border border-border">{numGems}</span>
                        </div>
                        <input
                            type="range"
                            min="1"
                            max="8"
                            step="1"
                            value={numGems}
                            onChange={(e) => setNumGems(parseInt(e.target.value))}
                            className="w-full h-2 bg-surface rounded-lg appearance-none cursor-pointer accent-primary"
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdvancedSettings;