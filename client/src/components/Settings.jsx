import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Settings as SettingsIcon, Music } from 'lucide-react';
import ModelSelector from './ModelSelector';
import KeySelector from './KeySelector';

const ALL_GENRES = [
    '80s', '90s', 'alternative', 'ambient', 'blues', 'celtic', 'chillout',
    'classical', 'country', 'dance', 'drumnbass', 'easylistening', 'electronic',
    'electropop', 'experimental', 'folk', 'funk', 'hiphop', 'house', 'indie',
    'instrumentalpop', 'instrumentalrock', 'jazz', 'jazzfusion', 'latin', 'lounge',
    'metal', 'newage', 'orchestral', 'pop', 'popfolk', 'poprock', 'punkrock',
    'reggae', 'rock', 'soundtrack', 'swing', 'symphonic', 'synthpop', 'techno',
    'trance', 'world'
];

const Settings = ({ instrument, setInstrument, tempo, setTempo, selectedModel, setSelectedModel, modelInfo, debugMode, keySelection, setKey, selectedInstruments, setSelectedInstruments, densities, setDensities, selectedTask = "Meta2MIDI", selectedGenres = [], setSelectedGenres, sftLocked, thinking = true, setThinking }) => {
    const [isOpen, setIsOpen] = useState(true);
    const [keySelectorOpen, setKeySelectorOpen] = useState(false);

    const toggleGenre = (genre) => {
        if (selectedGenres.includes(genre)) {
            setSelectedGenres(selectedGenres.filter(g => g !== genre));
        } else {
            if (selectedGenres.length < 2) {
                setSelectedGenres([...selectedGenres, genre]);
            } else {
                setSelectedGenres([selectedGenres[1], genre]);
            }
        }
    };

    const currentModel = modelInfo ? modelInfo.find(m => m.model_name === selectedModel) : null;
    const isSft = currentModel?.tag?.model === 'sft_gen' || currentModel?.tag?.model === 'sft';
    const isFoundation = currentModel?.tag?.model === 'foundation';
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
                    <ModelSelector selectedModel={selectedModel} setSelectedModel={setSelectedModel} modelInfo={modelInfo} debugMode={debugMode} selectedTask={selectedTask} sftLocked={sftLocked} />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5 col-span-2 md:col-span-1">
                            <label className="text-sm font-medium text-muted">Tempo (BPM)</label>
                            <input
                                type="number"
                                value={tempo}
                                onChange={handleTempoChange}
                                min="0"
                                className="input-field"
                            />
                        </div>
                        {!isSft && !isFoundation && (
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
                        )}
                    </div>

                    {!isSft && !isFoundation && availableInstruments.length > 0 && (
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
                    {!isSft && showDensitySettings && selectedInstruments.length > 0 && (
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
                                            max="10"
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

                    {/* Genre Settings */}
                    {!isSft && currentModel?.rule?.send_genre === true && (
                        <div className="space-y-3 pt-2 border-t border-border animate-in fade-in duration-200">
                            <div className="flex justify-between items-center">
                                <label className="text-sm font-medium text-muted">Genres (Select up to 2)</label>
                                {selectedGenres.length > 0 && (
                                    <button
                                        onClick={() => setSelectedGenres([])}
                                        className="text-xs text-primary hover:underline"
                                    >
                                        Clear All
                                    </button>
                                )}
                            </div>
                            <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-2 bg-surface/20 rounded-lg border border-border/50 scrollbar-thin">
                                {ALL_GENRES.map(genre => {
                                    const isSelected = selectedGenres.includes(genre);
                                    return (
                                        <button
                                            key={genre}
                                            onClick={() => toggleGenre(genre)}
                                            className={`px-2.5 py-1 rounded-md text-xs font-semibold tracking-wide transition-all duration-200 ${
                                                isSelected
                                                    ? 'bg-primary text-white shadow-md shadow-primary/30 scale-95 border border-primary'
                                                    : 'bg-surface border border-border text-muted hover:text-text hover:bg-surface/80 hover:border-primary/30'
                                            }`}
                                        >
                                            {genre}
                                        </button>
                                    );
                                })}
                            </div>
                            {selectedGenres.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 pt-1">
                                    {selectedGenres.map(g => (
                                        <span key={g} className="px-2 py-0.5 bg-primary/10 border border-primary/30 text-primary rounded-full text-xs font-mono">
                                            {g}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* SFT Chain-of-Thought (CoT) Checkbox */}
                    {isSft && (
                        <div className="space-y-3 pt-2 border-t border-border animate-in fade-in duration-200">
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <label className="text-sm font-semibold text-muted">Chain-of-Thought (CoT)</label>
                                    <p className="text-[10px] text-muted">AIに思考プロセスを実行させます</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={thinking}
                                        onChange={(e) => setThinking(e.target.checked)}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-surface peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-muted after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary peer-checked:after:bg-white"></div>
                                </label>
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
