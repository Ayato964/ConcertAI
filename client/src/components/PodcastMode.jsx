import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Play, Pause, Square, Music, Activity, SkipForward, Volume2, Settings as SettingsIcon } from 'lucide-react';
import ModelGridSelector from './ModelGridSelector';
import AdvancedSettings from './AdvancedSettings';
import KeySelector from './KeySelector';
import * as Tone from 'tone';
import { Midi } from '@tonejs/midi';

const PodcastMode = ({
    modelInfo,
    onGenerate,
    midiData,
    setMidiData,
    settings,
    playbackState,
    onPlay,
    onPause,
    onStop,
    setNotification,
    onAppendMidi
}) => {
    const [step, setStep] = useState(1);
    const [selectedModel, setSelectedModel] = useState(null);

    // Filter for pretrained models only
    const pretrainedModels = modelInfo ? modelInfo.filter(m => m.tag?.model === 'pretrained') : [];

    const handleModelSelect = (model) => {
        setSelectedModel(model);
        setStep(2);
    };

    const handleBack = () => {
        setStep(1);
        setSelectedModel(null);
        onStop();
    };

    return (
        <div className="h-full flex flex-col">
            {step === 1 ? (
                <ModelGridSelector
                    models={pretrainedModels}
                    onSelect={handleModelSelect}
                    title="Select Podcast Model (Pretrained Series)"
                    selectedModelId={selectedModel?.model_name}
                />
            ) : (
                <PodcastPlayer
                    model={selectedModel}
                    onBack={handleBack}
                    settings={settings}
                    onGenerate={onGenerate}
                    setNotification={setNotification}
                    playbackState={playbackState}
                    onPlay={onPlay}
                    onPause={onPause}
                    onStop={onStop}
                    midiData={midiData}
                    setMidiData={setMidiData}
                    onAppendMidi={onAppendMidi}
                />
            )}
        </div>
    );
};

const PodcastPlayer = ({ model, onBack, settings, onGenerate, setNotification, playbackState, onPlay, onPause, onStop, midiData, setMidiData, onAppendMidi }) => {
    const [initialClips, setInitialClips] = useState([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [conversationStats, setConversationStats] = useState({ measures: 0, duration: 0 });
    const [waveActive, setWaveActive] = useState(false);
    const [previewClip, setPreviewClip] = useState(null);
    const [keySelectorOpen, setKeySelectorOpen] = useState(false);

    // Using a ref to track the full MIDI composition to avoid playing state issues
    // We treat compositionRef as the "Podcast Stream"
    const compositionRef = useRef(null);
    const isLoopingRef = useRef(false);

    useEffect(() => {
        // Wave active only when playing AND (looping or previewing)
        setWaveActive(playbackState === 'playing');
    }, [playbackState]);

    // Instrument logic
    const availableInstruments = model?.tag?.instruments
        ? (Array.isArray(model.tag.instruments) ? model.tag.instruments : [model.tag.instruments])
        : [];

    const toggleInstrument = (inst) => {
        const { selectedInstruments, setSelectedInstruments } = settings;
        if (selectedInstruments.includes(inst)) {
            setSelectedInstruments(selectedInstruments.filter(i => i !== inst));
        } else {
            setSelectedInstruments([...selectedInstruments, inst]);
        }
    };

    const handleInitialGenerate = async () => {
        if (isGenerating || !model) return;
        setIsGenerating(true);
        onStop();
        setInitialClips([]);
        try {
            // Initial generation: 3 gems
            console.log("Generating initial 3 clips...");
            const results = await onGenerate(model.model_name, [], null, {}, null, { num_gems: 3 });
            if (results && results.length > 0) {
                setInitialClips(results);
            }
        } catch (e) {
            console.error(e);
            setNotification({ open: true, message: "Podcast generation failed", severity: "error" });
        } finally {
            setIsGenerating(false);
        }
    };

    const handlePreviewClip = (e, clip) => {
        e.stopPropagation();
        if (previewClip === clip && playbackState === 'playing') {
            onPause();
        } else {
            setPreviewClip(clip);
            setMidiData(clip); // Set to main player for preview

            // Wait for state to propagate? 
            // Tone.Transport sync happens in App.jsx effect
            setTimeout(() => {
                onPlay();
            }, 50);
        }
    };

    const handleSelectClip = async (clip) => {
        console.log("Selected clip, starting podcast loop...");
        onStop(); // Stop preview if any
        setInitialClips([]); // Hide selection UI
        setPreviewClip(null);

        // Initialize composition
        // Clone clip to allow mutation without side effects
        const starter = new Midi(clip.toArray());
        compositionRef.current = starter;
        setMidiData(starter);
        updateStats(starter);

        // Start recursive loop
        isLoopingRef.current = true;

        // Start playing immediately if user wants? Or wait for 16 bars?
        // Requirement 3C: "Start playback when main melody > 16 measures."
        // So we just start generating.
        recursiveGenerationLoop();
    };

    const updateStats = (midi) => {
        if (!midi || !midi.header) return;
        const bpm = midi.header.tempos[0]?.bpm || 120;
        // Use strict duration
        const duration = midi.duration;
        const measures = duration / (60 / bpm * 4);
        setConversationStats({ measures: Math.floor(measures), duration: Math.floor(duration) });
    };

    const recursiveGenerationLoop = async () => {
        if (!isLoopingRef.current) return;

        try {
            const currentMidi = compositionRef.current;
            if (!currentMidi) return;

            updateStats(currentMidi);

            const bpm = currentMidi.header.tempos[0]?.bpm || 120;
            const measureDuration = (60 / bpm) * 4;
            const totalMeasures = currentMidi.duration / measureDuration;

            // Check playback trigger before throttling
            // Requirement 3C: "Start playback when main melody > 16 measures."
            if (totalMeasures > 16 && Tone.Transport.state !== 'started') {
                console.log("Music length > 16 measures, starting playback...");
                onPlay();
            }

            // --- Throttling Logic ---
            const currentSeconds = Tone.Transport.seconds;
            const currentMeasures = currentSeconds / measureDuration;
            const futureBufferMeasures = totalMeasures - currentMeasures;

            if (futureBufferMeasures > 16) {
                console.log(`[Podcast] Future buffer is ${futureBufferMeasures.toFixed(1)} bars. Waiting for playback to catch up...`);
                // Check again in 2 seconds
                setTimeout(() => {
                    requestAnimationFrame(() => recursiveGenerationLoop());
                }, 2000);
                return;
            }
            // ------------------------

            // A. Prepare past_midi (last 4 measures)
            const last4MeasuresDuration = measureDuration * 4;
            // Ensure we don't start before 0
            const startTime = Math.max(0, currentMidi.duration - last4MeasuresDuration);

            const pastMidi = new Midi();

            if (currentMidi.header) {
                // Manually copy properties to preserve Header instance methods
                pastMidi.header.tempos = JSON.parse(JSON.stringify(currentMidi.header.tempos));
                pastMidi.header.timeSignatures = JSON.parse(JSON.stringify(currentMidi.header.timeSignatures));
                // ppq is read-only in some versions of Tone.js Midi, so we skip it.
                // It defaults to 480 usually.
                pastMidi.header.name = currentMidi.header.name;
                // If there are other meta events, we might want them, but these are critical for timing.
                // We do NOT overwrite pastMidi.header itself.
            }

            // Extract track data for past_midi context
            currentMidi.tracks.forEach(t => {
                const track = pastMidi.addTrack();
                track.instrument = t.instrument;
                track.channel = t.channel; // Keep channel
                t.notes.forEach(n => {
                    if (n.time >= startTime) {
                        track.addNote({
                            midi: n.midi,
                            time: n.time - startTime,
                            duration: n.duration,
                            velocity: n.velocity
                        });
                    }
                });
            });

            const pastMidiBlob = new Blob([pastMidi.toArray()], { type: 'audio/midi' });

            // Ensure model is still available
            if (!model) {
                console.warn("Model unavailable, stopping loop.");
                isLoopingRef.current = false;
                return;
            }

            // B. Generate extension (8 bars as requested)
            // Using genfield_measure: 8 and generate_count: 8
            setIsGenerating(true);
            const results = await onGenerate(
                model.model_name,
                [],
                null,
                {},
                null,
                {
                    ai_continue_mode: true,
                    generate_count: 8,
                    genfield_measure: 8
                },
                { pastMidiBlob }
            );

            if (results && results.length > 0) {
                const newSegment = results[0];

                // Merge newSegment into composition
                mergeMidi(newSegment);

                // Continue loop
                requestAnimationFrame(() => recursiveGenerationLoop());
            } else {
                console.log("No result returned, satisfying loop?");
                setIsGenerating(false);
            }

        } catch (e) {
            console.error("Recursive loop error:", e);
            setNotification({ open: true, message: `Podcast loop error: ${e.message}`, severity: "error" });
            isLoopingRef.current = false;
        }
    };

    const mergeMidi = (newSegment) => {
        // Fix for "All sounds ringing"
        // Ensure new segment is appended CLEANLY.
        // If result includes context (4 bars) + New (8 bars) = 12 bars total (approx).
        // OR if ai_continue_mode returns ONLY new part?
        // Assuming result structure: [Context][New].
        // We identify the cutoff by ignoring the first `contextDuration`.

        // ALSO: Avoid creating duplicate tracks.
        // We append notes to existing tracks of `compositionRef.current`.

        const currentMidi = compositionRef.current;
        const bpm = currentMidi.header.tempos[0]?.bpm || 120;
        const measureDuration = (60 / bpm) * 4;
        const contextDuration = measureDuration * 4;

        const shiftAmount = currentMidi.duration - contextDuration;

        // We only append notes that start AFTER the context duration in the result
        // to avoid duplicating the context.
        // Tolerance: 0.1s

        currentMidi.tracks.forEach((track, i) => {
            // Match by channel if possible, else index
            const resultTrack = newSegment.tracks.find(t => t.channel === track.channel) || newSegment.tracks[i];

            if (resultTrack) {
                resultTrack.notes.forEach(note => {
                    if (note.time >= contextDuration - 0.1) {
                        track.addNote({
                            midi: note.midi,
                            time: note.time + shiftAmount,
                            duration: note.duration,
                            velocity: note.velocity
                        });
                    }
                });
            }
        });

        // Force refresh midiData to update UI
        // We use toArray() to rebuild valid binary then parse back
        const refreshedMidi = new Midi(currentMidi.toArray());

        compositionRef.current = refreshedMidi;

        // Only update App state if we are currently playing/looping this composition
        if (isLoopingRef.current) {
            // Use append mode to avoid audio glitch
            if (onAppendMidi) {
                onAppendMidi(refreshedMidi);
            } else {
                setMidiData(refreshedMidi);
            }
            updateStats(refreshedMidi);
        }
    };

    const stopLoop = () => {
        isLoopingRef.current = false;
        setIsGenerating(false);
        onStop();
    };

    // Clean up
    useEffect(() => {
        return () => {
            isLoopingRef.current = false;
        }
    }, []);

    return (
        <div className="flex flex-col h-full animate-in fade-in zoom-in-95 duration-300">
            {/* Header */}
            <div className="p-4 border-b border-border flex items-center justify-between bg-surface/50 backdrop-blur-sm shrink-0">
                <div className="flex items-center gap-4">
                    <button onClick={stopLoop} className="flex items-center gap-2 text-sm text-muted hover:text-text transition-colors">
                        <ArrowLeft className="w-4 h-4" /> Exit
                    </button>
                    <div className="h-4 w-[1px] bg-border"></div>
                    <span className="flex items-center gap-2 text-sm font-medium">
                        Model: <span className="text-primary">{model?.model_name}</span>
                        {isGenerating && <span className="text-xs text-muted animate-pulse ml-2">Generating...</span>}
                    </span>
                </div>
                {compositionRef.current && (
                    <div className="flex items-center gap-4 text-xs font-mono text-muted">
                        <span className="flex items-center gap-1"><Activity className="w-3 h-3" /> {conversationStats.measures} Bars</span>
                        <span className="flex items-center gap-1"><Music className="w-3 h-3" /> {conversationStats.duration}s</span>
                    </div>
                )}
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col items-center justify-center p-8 overflow-y-auto w-full relative">

                {/* Visualizer */}
                <div className="w-full max-w-2xl h-64 bg-black/40 rounded-3xl border border-white/5 flex items-center justify-center mb-8 relative overflow-hidden group">
                    <div className={`flex items-end gap-1 h-32 ${waveActive ? 'opacity-100' : 'opacity-30'}`}>
                        {[...Array(20)].map((_, i) => (
                            <div
                                key={i}
                                className={`w-3 bg-primary/80 rounded-full transition-all duration-300 ${waveActive ? 'animate-pulse' : ''}`}
                                style={{
                                    height: waveActive ? `${20 + Math.random() * 80}%` : '20%',
                                    animationDelay: `${i * 0.1}s`,
                                    transition: 'height 0.1s ease'
                                }}
                            />
                        ))}
                    </div>

                    {/* Play Overlay if not started */}
                    {initialClips.length === 0 && !compositionRef.current && !isGenerating && (
                        <button
                            onClick={handleInitialGenerate}
                            className="absolute inset-0 flex items-center justify-center bg-black/50 hover:bg-black/40 transition-all text-white backdrop-blur-sm"
                        >
                            <Play className="w-20 h-20 fill-white drop-shadow-lg scale-100 hover:scale-110 transition-transform" />
                            <span className="absolute mt-24 text-lg font-bold">Start Podcast</span>
                        </button>
                    )}

                    {isGenerating && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-10">
                            <Activity className="w-12 h-12 text-primary animate-spin" />
                        </div>
                    )}
                </div>

                {/* Initial Selection View */}
                {initialClips.length > 0 && (
                    <div className="w-full max-w-4xl">
                        <h3 className="text-center text-lg font-medium mb-4 text-white">Select a starting theme</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-in slide-in-from-bottom-4">
                            {initialClips.map((clip, i) => {
                                const isPreviewing = previewClip === clip && playbackState === 'playing';
                                return (
                                    <div key={i} className="bg-surface border border-border rounded-xl p-4 hover:border-primary transition-all cursor-pointer group hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/10 relative">
                                        <div className="text-center text-sm font-medium text-muted mb-2">Option {i + 1}</div>
                                        <div className="h-24 bg-black/20 rounded-lg flex items-center justify-center group-hover:bg-primary/10 transition-colors mb-4 relative overflow-hidden">
                                            <div onClick={(e) => handlePreviewClip(e, clip)} className="cursor-pointer p-4 rounded-full bg-black/40 hover:bg-primary hover:text-white transition-all z-10">
                                                {isPreviewing ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleSelectClip(clip)}
                                                className="flex-1 py-2 bg-primary/10 text-primary rounded-lg text-sm font-bold group-hover:bg-primary group-hover:text-white transition-all"
                                            >
                                                Select & Start Loop
                                            </button>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}

                {compositionRef.current && (
                    <div className="w-full max-w-2xl text-center text-muted text-sm mt-4 animate-in fade-in">
                        <p>Podcast is running. Sit back and listen.</p>
                        <p className="text-xs opacity-50 mt-1">Generating continuation every 4 bars...</p>
                    </div>
                )}
            </div>

            {/* Controls */}
            <div className="h-auto border-t border-border bg-surface shrink-0 p-4">
                <div className="container mx-auto max-w-6xl grid grid-cols-1 md:grid-cols-12 gap-6">
                    <div className="col-span-12 md:col-span-4 space-y-4">
                        {/* Basic Settings */}
                        <div className="bg-surface/50 rounded-xl p-4 border border-border space-y-4">
                            <h4 className="text-sm font-medium text-muted mb-2 flex items-center gap-2"><SettingsIcon className="w-3 h-3" /> Basic Settings</h4>

                            {/* Key Selector */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-muted">Key</label>
                                <button
                                    onClick={() => setKeySelectorOpen(true)}
                                    className="w-full p-2 bg-surface border border-border rounded-lg text-left hover:bg-surface/80 transition-colors flex items-center justify-between text-sm"
                                >
                                    <span className="font-medium">{settings.key}</span>
                                    <Music className="w-3 h-3 text-muted" />
                                </button>
                            </div>

                            {/* Instruments */}
                            {availableInstruments.length > 0 && (
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-muted">Instruments</label>
                                    <div className="flex flex-wrap gap-2">
                                        {availableInstruments.map(inst => (
                                            <button
                                                key={inst}
                                                onClick={() => toggleInstrument(inst)}
                                                className={`px-2 py-1 rounded-md text-xs font-medium transition-all duration-200 ${settings.selectedInstruments?.includes(inst)
                                                    ? 'bg-primary text-white shadow-sm'
                                                    : 'bg-surface border border-border text-text hover:bg-surface/80'
                                                    }`}
                                            >
                                                {inst}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Advanced Settings - hiding numGems */}
                        <AdvancedSettings
                            {...settings}
                            rules={{ ...model?.rule, number_of_generation: false }}
                        />
                    </div>
                    <div className="col-span-12 md:col-span-8 flex items-center justify-center gap-4">
                        <button
                            onClick={playbackState === 'playing' ? onPause : onPlay}
                            disabled={!compositionRef.current && !previewClip}
                            className={`w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-xl ${playbackState === 'playing' ? 'bg-primary text-white scale-100' : 'bg-surface border border-border text-primary hover:scale-105 disabled:opacity-50 disabled:hover:scale-100'}`}
                        >
                            {playbackState === 'playing' ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current ml-1" />}
                        </button>
                    </div>
                </div>
            </div>

            <KeySelector
                open={keySelectorOpen}
                onClose={() => setKeySelectorOpen(false)}
                onSave={settings.setKey}
                currentKey={settings.key}
            />
        </div>
    );
};

export default PodcastMode;
