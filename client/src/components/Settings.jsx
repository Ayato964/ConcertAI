import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Settings as SettingsIcon, Music } from 'lucide-react';
import ModelSelector from './ModelSelector';
import KeySelector from './KeySelector';

const Settings = ({ instrument, setInstrument, tempo, setTempo, selectedModel, setSelectedModel, modelInfo, debugMode, keySelection, setKey, selectedInstruments, setSelectedInstruments, densities, setDensities }) => {
    const [isOpen, setIsOpen] = useState(true);
    const [keySelectorOpen, setKeySelectorOpen] = useState(false);

    const currentModel = modelInfo ? modelInfo.find(m => m.model_name === selectedModel) : null;
    const availableInstruments = currentModel?.tag?.instruments
        ? (Array.isArray(currentModel.tag.instruments) ? currentModel.tag.instruments : [currentModel.tag.instruments])
        : [];

    // Check if density rule is active
    const showDensitySettings = currentModel?.rule?.gen_note_dense === true;

    useEffect(() => {
        // Reset selected instruments when model changes
        if (availableInstruments.length > 0) {
            setSelectedInstruments([availableInstruments[0]]);
        } else {
            setSelectedInstruments([]);
        }
    }, [selectedModel, modelInfo]); // eslint-disable-line react-hooks/exhaustive-deps

    // Initialize densities when selected instruments align
    useEffect(() => {
        if (showDensitySettings) {
            const newDensities = { ...densities };
            let changed = false;
            selectedInstruments.forEach(inst => {
                if (newDensities[inst] === undefined) {
                    newDensities[inst] = 4; // Default density
                    changed = true;
                }
            });
            if (changed) {
                setDensities(newDensities);
            }
        }
    }, [selectedInstruments, showDensitySettings]);


    const toggleInstrument = (inst) => {
        if (selectedInstruments.includes(inst)) {
            setSelectedInstruments(selectedInstruments.filter(i => i !== inst));
        } else {
            setSelectedInstruments([...selectedInstruments, inst]);
        }
    };

    const handleDensityChange = (inst, value) => {
        setDensities(prev => ({
            ...prev,
            [inst]: parseInt(value)
        }));
    };

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
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-muted">Key</label>
                            <button
                                onClick={() => setKeySelectorOpen(true)}
                                className="w-full p-2.5 bg-surface border border-border rounded-lg text-left hover:bg-surface/80 transition-colors flex items-center justify-between"
                            >
                                <span className="font-medium">{keySelection}</span>
                                <Music className="w-4 h-4 text-muted" />
                            </button>
                        </div>
                    </div>

                    {availableInstruments.length > 0 && (
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-muted">Generate Instruments</label>
                            <div className="flex flex-wrap gap-2">
                                {availableInstruments.map(inst => (
                                    <button
                                        key={inst}
                                        onClick={() => toggleInstrument(inst)}
                                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${selectedInstruments.includes(inst)
                                            ? 'bg-primary text-white shadow-lg shadow-primary/25'
                                            : 'bg-surface border border-border text-text hover:bg-surface/80 hover:border-primary/50'
                                            }`}
                                    >
                                        {inst}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Density Settings */}
                    {showDensitySettings && selectedInstruments.length > 0 && (
                        <div className="space-y-3 pt-2 border-t border-border">
                            <label className="text-sm font-medium text-muted">Note Density (1-8)</label>
                            <div className="space-y-2">
                                {selectedInstruments.map(inst => (
                                    <div key={inst} className="space-y-1">
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="font-mono text-primary">{inst}</span>
                                            <span className="font-mono text-muted">{densities[inst] || 4}</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="1"
                                            max="8"
                                            step="1"
                                            value={densities[inst] || 4}
                                            onChange={(e) => handleDensityChange(inst, e.target.value)}
                                            className="w-full h-1.5 bg-surface rounded-lg appearance-none cursor-pointer accent-primary"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            <KeySelector
                open={keySelectorOpen}
                onClose={() => setKeySelectorOpen(false)}
                onSave={setKey}
                currentKey={keySelection}
            />
        </div>
    );
};

export default Settings;
