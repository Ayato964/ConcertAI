import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Settings as SettingsIcon } from 'lucide-react';
import ModelSelector from './ModelSelector';

const Settings = ({ instrument, setInstrument, tempo, setTempo, selectedModel, setSelectedModel, modelInfo, debugMode }) => {
    const [isOpen, setIsOpen] = useState(true);

    const handleTempoChange = (e) => {
        const value = e.target.value;
        if (value === '' || (Number.isInteger(Number(value)) && value >= 0)) {
            setTempo(value);
        }
    };

    return (
        <div className="border border-border rounded-xl overflow-hidden bg-surface/30">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full px-4 py-3 flex items-center justify-between bg-surface/50 hover:bg-surface transition-colors"
            >
                <div className="flex items-center gap-2 font-medium">
                    <SettingsIcon className="w-4 h-4 text-primary" />
                    <span>Basic Settings</span>
                </div>
                {isOpen ? <ChevronUp className="w-4 h-4 text-muted" /> : <ChevronDown className="w-4 h-4 text-muted" />}
            </button>

            {isOpen && (
                <div className="p-4 space-y-4 border-t border-border">
                    <ModelSelector selectedModel={selectedModel} setSelectedModel={setSelectedModel} modelInfo={modelInfo} debugMode={debugMode} />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-muted">Tempo (BPM)</label>
                            <input
                                type="number"
                                value={tempo}
                                onChange={handleTempoChange}
                                min="0"
                                className="input-field"
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Settings;
