import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, ArrowRight, Zap } from 'lucide-react';
import ModelGridSelector from './ModelGridSelector';
import PianoRoll from './PianoRoll';
import Settings from './Settings';
import AdvancedSettings from './AdvancedSettings';
import { Play, Pause, Square } from 'lucide-react'; // Import icons directly

const VSMode = ({
    modelInfo,
    midiData,
    setMidiData, // Main midi data setter (affects global state?) Or should we keep VS independent?
    // We need to pass down a lot of props if we reuse components.
    // For simplicity, let's accept shared props that PianoRoll needs.
    pianoRollProps,
    settings,
    // For generation
    onGenerate,
    // Playback controls from App
    playbackState,
    onPlay,
    onPause,
    onStop
}) => {
    const [step, setStep] = useState(1);
    const [model1, setModel1] = useState(null);
    const [model2, setModel2] = useState(null);
    const [result1, setResult1] = useState(null);
    const [result2, setResult2] = useState(null);
    const [isGeneratingBoth, setIsGeneratingBoth] = useState(false);
    const [chords, setChords] = useState({});

    const pianoRoll1Ref = React.useRef(null);
    const pianoRoll2Ref = React.useRef(null);

    // Store base midi data when step 3 starts or models are selected
    // This ensures that when we play a specific result (updating global midiData),
    // the other view doesn't change if it was relying on global midiData.
    const baseMidiRef = React.useRef(null);
    const [playingModel, setPlayingModel] = useState(null); // 1 or 2, or null

    useEffect(() => {
        if (step === 3 && midiData && !baseMidiRef.current) {
            baseMidiRef.current = midiData; // Capture initial state
        }
    }, [step, midiData]);

    // Reset results when models change or reset
    useEffect(() => {
        setResult1(null);
        setResult2(null);
        baseMidiRef.current = null;
        setPlayingModel(null);
    }, [model1, model2]);

    const handlePlayModel = (modelIndex) => {
        const targetMidi = modelIndex === 1 ? (result1 || baseMidiRef.current) : (result2 || baseMidiRef.current);
        if (targetMidi) {
            setMidiData(targetMidi);
            setPlayingModel(modelIndex);

            // Short timeout to allow state to propagate before playing?
            // Tone.js Transport usually picks up changes efficiently but React state might take a tick.
            setTimeout(() => {
                onPlay();
            }, 50);
        }
    };

    const handlePauseModel = () => {
        onPause();
    };

    const handleStopModel = () => {
        onStop();
        setPlayingModel(null);
    };

    const handleGenerateBoth = async () => {
        if (!onGenerate || !model1 || !model2) return;

        setIsGeneratingBoth(true);

        // Use timeout to allow UI to update to "Generating..." state if needed, 
        // though React updates are usually fast enough.

        try {
            const notes = pianoRoll1Ref.current?.getSelectedNotes() || [];
            const range = pianoRoll1Ref.current?.getSelectedRange() || null;

            // Generate for Model 1
            const midis1 = await onGenerate(model1.model_name, notes, range, chords, midiData);
            if (midis1 && midis1.length > 0) {
                setResult1(midis1[0]);
            }

            // Generate for Model 2
            const midis2 = await onGenerate(model2.model_name, notes, range, chords, midiData);
            if (midis2 && midis2.length > 0) {
                setResult2(midis2[0]);
            }

        } catch (e) {
            console.error("VS Mode Generation Error", e);
        } finally {
            setIsGeneratingBoth(false);
        }
    };

    // Filter models for step 2
    const filteredModels = useMemo(() => {
        if (!model1 || !modelInfo) return [];
        return modelInfo.filter(m => m.tag?.model === model1.tag?.model && m.model_name !== model1.model_name);
    }, [model1, modelInfo]);

    const handleModel1Select = (model) => {
        setModel1(model);
        setStep(2);
    };

    const handleModel2Select = (model) => {
        setModel2(model);
        setStep(3);
    };

    const resetSelection = () => {
        setStep(1);
        setModel1(null);
        setModel2(null);
    };

    // Placeholder data for VS view
    // In a real implementation, we would manage TWO midi states here (result1, result2)
    // and pass them to two PianoRolls.

    // For now, let's just confirm the flow works.

    if (step === 1) {
        return (
            <ModelGridSelector
                models={modelInfo || []}
                onSelect={handleModel1Select}
                title="Select Model 1 (Base)"
                selectedModelId={model1?.model_name}
            />
        );
    }

    if (step === 2) {
        return (
            <div className="h-full flex flex-col">
                <div className="p-4 border-b border-border flex items-center gap-4 bg-surface/50 backdrop-blur-sm">
                    <button onClick={() => setStep(1)} className="flex items-center gap-2 text-sm text-muted hover:text-text transition-colors">
                        <ArrowLeft className="w-4 h-4" /> Back to Model 1
                    </button>
                    <div className="h-4 w-[1px] bg-border"></div>
                    <span className="text-sm font-medium">Model 1: <span className="text-primary">{model1?.model_name}</span></span>
                </div>
                <ModelGridSelector
                    models={filteredModels}
                    onSelect={handleModel2Select}
                    title={`Select Model 2 (Vs ${model1?.model_name})`}
                    selectedModelId={model2?.model_name}
                />
            </div>
        );
    }

    if (step === 3) {
        return (
            <div className="h-full flex flex-col animate-in fade-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="p-4 border-b border-border flex items-center justify-between bg-surface/50 backdrop-blur-sm shrink-0">
                    <div className="flex items-center gap-4">
                        <button onClick={resetSelection} className="flex items-center gap-2 text-sm text-muted hover:text-text transition-colors">
                            <ArrowLeft className="w-4 h-4" /> Reset Models
                        </button>
                        <div className="flex items-center gap-3">
                            <div className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold border border-primary/20">
                                {model1?.model_name}
                            </div>
                            <span className="text-muted font-mono text-xs">VS</span>
                            <div className="px-3 py-1 rounded-full bg-purple-500/10 text-purple-400 text-xs font-bold border border-purple-500/20">
                                {model2?.model_name}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Comparison Content */}
                <div className="flex-1 flex overflow-hidden">
                    {/* Left Panel: Model 1 */}
                    <div className="flex-1 border-r border-border flex flex-col min-w-0 bg-background/50">
                        <div className="p-2 text-center text-xs font-bold text-primary uppercase tracking-widest border-b border-border/50 bg-primary/5">
                            {model1?.model_name}
                        </div>
                        <MiniPlayer
                            isPlaying={playbackState === 'playing' && playingModel === 1}
                            onPlay={() => handlePlayModel(1)}
                            onPause={handlePauseModel}
                            onStop={handleStopModel}
                            progress={pianoRollProps.progress}
                        />
                        <div className="flex-1 relative overflow-hidden">
                            <PianoRoll
                                ref={pianoRoll1Ref}
                                {...pianoRollProps}
                                midiData={result1 || baseMidiRef.current || midiData} // Use baseMidiRef first
                                selectionEnabled={true}
                                onChordsChange={setChords}
                            />
                        </div>
                    </div>

                    {/* Right Panel: Model 2 */}
                    <div className="flex-1 flex flex-col min-w-0 bg-background/50">
                        <div className="p-2 text-center text-xs font-bold text-purple-400 uppercase tracking-widest border-b border-border/50 bg-purple-500/5">
                            {model2?.model_name}
                        </div>
                        <MiniPlayer
                            isPlaying={playbackState === 'playing' && playingModel === 2}
                            onPlay={() => handlePlayModel(2)}
                            onPause={handlePauseModel}
                            onStop={handleStopModel}
                            progress={pianoRollProps.progress}
                        />
                        <div className="flex-1 relative overflow-hidden">
                            <PianoRoll
                                ref={pianoRoll2Ref}
                                {...pianoRollProps}
                                midiData={result2 || baseMidiRef.current || midiData}
                                selectionEnabled={true}
                            />
                        </div>
                    </div>
                </div>

                {/* Shared Controls / Settings Shim */}
                <div className="h-64 border-t border-border bg-surface shrink-0 p-4 grid grid-cols-12 gap-6 overflow-y-auto">
                    <div className="col-span-4 overflow-y-auto max-h-full">
                        {settings && (
                            <div className="scale-90 origin-top-left w-[110%]">
                                <AdvancedSettings
                                    temperature={settings.temperature}
                                    setTemperature={settings.setTemperature}
                                    p={settings.p}
                                    setP={settings.setP}
                                    numGems={settings.numGems}
                                    setNumGems={settings.setNumGems}
                                    rules={model1?.rule}
                                />
                            </div>
                        )}
                        {!settings && (
                            <div className="card h-full flex flex-col justify-center items-center text-muted">
                                <SettingsIconShim />
                                <p className="mt-2">Settings Unavailable</p>
                            </div>
                        )}
                    </div>
                    <div className="col-span-8">
                        <div className="card h-full flex items-center justify-center">
                            <button
                                onClick={handleGenerateBoth}
                                disabled={isGeneratingBoth}
                                className={`btn-primary w-full h-16 text-lg shadow-xl shadow-primary/20 flex items-center justify-center gap-3 transition-all ${isGeneratingBoth ? 'opacity-50' : 'hover:scale-[1.02]'}`}
                            >
                                <Zap className={`w-6 h-6 ${isGeneratingBoth ? 'animate-pulse' : ''}`} />
                                {isGeneratingBoth ? 'Generating Model 1 & 2...' : 'Generate Both Models (Sequential)'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return null;
};

const SettingsIconShim = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-sliders-horizontal"><line x1="21" x2="14" y1="4" y2="4" /><line x1="10" x2="3" y1="4" y2="4" /><line x1="21" x2="12" y1="12" y2="12" /><line x1="8" x2="3" y1="12" y2="12" /><line x1="21" x2="16" y1="20" y2="20" /><line x1="12" x2="3" y1="20" y2="20" /><line x1="14" x2="14" y1="2" y2="6" /><line x1="8" x2="8" y1="10" y2="14" /><line x1="16" x2="16" y1="18" y2="22" /></svg>
)


const MiniPlayer = ({ isPlaying, onPlay, onPause, onStop, progress }) => {
    return (
        <div className="px-4 py-2 border-b border-border bg-surface flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
                {!isPlaying ? (
                    <button onClick={onPlay} className="p-1 hover:bg-white/10 rounded text-text transition-colors" title="Play">
                        <Play className="w-4 h-4 fill-current" />
                    </button>
                ) : (
                    <button onClick={onPause} className="p-1 hover:bg-white/10 rounded text-primary transition-colors" title="Pause">
                        <Pause className="w-4 h-4 fill-current" />
                    </button>
                )}
                <button onClick={onStop} className="p-1 hover:bg-white/10 rounded text-text transition-colors" title="Stop">
                    <Square className="w-4 h-4 fill-current" />
                </button>
            </div>

            <div className="flex-1 flex flex-col justify-center gap-1">
                <div className="h-1.5 w-full bg-surface border border-border/50 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-primary transition-all duration-100 ease-linear"
                        style={{ width: `${progress * 100}%` }}
                    />
                </div>
            </div>

            <div className="text-[10px] font-mono text-muted w-8 text-right">
                {Math.floor(progress * 100)}%
            </div>
        </div>
    )
}

export default VSMode;
