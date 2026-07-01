import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Sliders } from 'lucide-react';

const AdvancedSettings = ({ temperature, setTemperature, p, setP, numGems, setNumGems, rules, thinking = true, setThinking, isSft, cotTemperature = 0.1, setCotTemperature }) => {
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
                    {(!rules || rules.temperature !== false) && (
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
                    )}

                    {(!rules || rules.top_p !== false) && (
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
                    )}

                    {(!rules || rules.number_of_generation !== false) && (
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
                    )}

                    {/* Reasoning thinking setting */}
                    {(rules?.send_genre === true || isSft) && (
                        <div className="space-y-3 pt-4 border-t border-border/50 animate-in fade-in duration-200">
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <label className="text-sm font-medium text-muted">Chain-of-Thought (CoT)</label>
                                    <p className="text-[10px] text-muted">AIに思考プロセス（キー・ジャンルの補完）を実行させます</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={thinking}
                                        onChange={(e) => setThinking && setThinking(e.target.checked)}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-surface peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-muted after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary peer-checked:after:bg-white"></div>
                                </label>
                            </div>

                            {/* CoT Temperature Slider */}
                            {thinking && setCotTemperature && (
                                <div className="space-y-2 pt-2 animate-in slide-in-from-top-1 duration-200">
                                    <div className="flex justify-between items-center">
                                        <label className="text-xs font-medium text-muted">CoT Temperature</label>
                                        <span className="text-[10px] font-mono bg-surface px-1.5 py-0.5 rounded border border-border">{cotTemperature}</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0.05"
                                        max="1.0"
                                        step="0.05"
                                        value={cotTemperature}
                                        onChange={(e) => setCotTemperature(parseFloat(e.target.value))}
                                        className="w-full h-1 bg-surface rounded-lg appearance-none cursor-pointer accent-primary"
                                    />
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default AdvancedSettings;