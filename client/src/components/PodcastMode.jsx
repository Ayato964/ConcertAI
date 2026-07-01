import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Play, Pause, Square, Music, Activity, SkipForward, Volume2, Settings as SettingsIcon, UploadCloud, Radio } from 'lucide-react';
import ModelGridSelector from './ModelGridSelector';
import AdvancedSettings from './AdvancedSettings';
import KeySelector from './KeySelector';
import PianoRoll from './PianoRoll';
import * as Tone from 'tone';
import { Midi } from '@tonejs/midi';

const ALL_GENRES = [
  '80s', '90s', 'alternative', 'ambient', 'blues', 'celtic', 'chillout',
  'classical', 'country', 'dance', 'drumnbass', 'easylistening', 'electronic',
  'electropop', 'experimental', 'folk', 'funk', 'hiphop', 'house', 'indie',
  'instrumentalpop', 'instrumentalrock', 'jazz', 'jazzfusion', 'latin', 'lounge',
  'metal', 'newage', 'orchestral', 'pop', 'popfolk', 'poprock', 'punkrock',
  'reggae', 'rock', 'soundtrack', 'swing', 'symphonic', 'synthpop', 'techno',
  'trance', 'world'
];

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
    onAppendMidi,
    progress,
    onSeek
}) => {
    const [step, setStep] = useState(1);
    const [selectedModel, setSelectedModel] = useState(null);

    // Filter for SFT/SFT-Gen models (which are better suited for recursive appending)
    const sftModels = modelInfo ? modelInfo.filter(m => m.tag?.model === 'sft_gen' || m.tag?.model === 'sft') : [];

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
                    models={sftModels}
                    onSelect={handleModelSelect}
                    title="Select Podcast Model (SFT Generation Series)"
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
                    progress={progress}
                    onSeek={onSeek}
                />
            )}
        </div>
    );
};

const PodcastPlayer = ({ model, onBack, settings, onGenerate, setNotification, playbackState, onPlay, onPause, onStop, setMidiData, onAppendMidi, progress, onSeek }) => {
    const [isGenerating, setIsGenerating] = useState(false);
    const [conversationStats, setConversationStats] = useState({ measures: 0, duration: 0 });
    const [uploadedMidi, setUploadedMidi] = useState(null);
    const [keySelectorOpen, setKeySelectorOpen] = useState(false);
    const [waveActive, setWaveActive] = useState(false);

    const compositionRef = useRef(null);
    const isLoopingRef = useRef(false);
    const pianoRollRef = useRef(null);

    useEffect(() => {
        setWaveActive(playbackState === 'playing');
    }, [playbackState]);

    // Sync settings & playbackState to refs for recursive loop access
    const settingsRef = useRef(settings);
    useEffect(() => { settingsRef.current = settings; }, [settings]);

    const playbackStateRef = useRef(playbackState);
    useEffect(() => { playbackStateRef.current = playbackState; }, [playbackState]);

    // Spacebar playback control
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.code === 'Space' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
                e.preventDefault();
                if (playbackState === 'playing') {
                    onPause();
                } else if (compositionRef.current) {
                    onPlay();
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [playbackState, onPlay, onPause]);

    const updateStats = (midi) => {
        if (!midi || !midi.header) return;
        const bpm = midi.header.tempos[0]?.bpm || 120;
        const duration = midi.duration;
        const measures = duration / ((60 / bpm) * 4);
        setConversationStats({ measures: Math.floor(measures), duration: Math.floor(duration) });
    };

    // Instrument settings mapping
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

    const toggleGenre = (genre) => {
        const { selectedGenres, setSelectedGenres } = settings;
        if (!selectedGenres || !setSelectedGenres) return;
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

    // Initial seed generation using SFT model (no past context)
    const handleStartPodcast = async () => {
        if (isGenerating || !model) return;
        setIsGenerating(true);
        onStop();
        
        try {
            const overrideMeta = {
                model_type: model.model_name,
                program: settings.selectedInstruments || [],
                tempo: parseInt(settings.tempo, 10) || 120,
                num_gems: 1,
                genfield_measure: 8,
                generate_count: 8,
                key: settings.key.replace(' ', ''),
                temperature: settings.temperature,
                p: settings.p
            };

            if (settings.selectedGenres && settings.selectedGenres.length > 0) {
                overrideMeta.genre = settings.selectedGenres;
            }

            if (model?.rule?.gen_note_dense && settings.densities) {
                const densityPayload = {};
                settings.selectedInstruments.forEach(inst => {
                    if (settings.densities[inst]) densityPayload[inst] = settings.densities[inst];
                });
                overrideMeta.gen_note_dense = densityPayload;
                overrideMeta.note_density = densityPayload;
            }

            console.log("Generating initial SFT seed segment...");
            const results = await onGenerate(model.model_name, [], null, {}, null, overrideMeta);
            if (results && results.length > 0) {
                const seedMidi = new Midi(results[0].toArray());
                compositionRef.current = seedMidi;
                setMidiData(seedMidi);
                updateStats(seedMidi);

                // Start recursive extension loop
                isLoopingRef.current = true;
                recursiveGenerationLoop();
            }
        } catch (e) {
            console.error(e);
            setNotification({ open: true, message: "Podcast initialization failed", severity: "error" });
        } finally {
            setIsGenerating(false);
        }
    };

    // Recursive Extension Loop using SFT context
    const recursiveGenerationLoop = async () => {
        if (!isLoopingRef.current) return;

        try {
            const currentMidi = compositionRef.current;
            if (!currentMidi) return;

            updateStats(currentMidi);

            const bpm = currentMidi.header.tempos[0]?.bpm || 120;
            const timeSignature = currentMidi.header.timeSignatures[0]?.timeSignature || [4, 4];
            const secondsPerMeasure = (60 / bpm) * timeSignature[0];
            const totalMeasures = Math.ceil((currentMidi.duration - 0.01) / secondsPerMeasure);

            // Playback management: start playing automatically when buffer passes 4 measures
            if (totalMeasures >= 4 && Tone.Transport.state !== 'started') {
                console.log("Podcast buffer ready, starting playback...");
                onPlay();
            }

            // Throttling: If the generation buffer is already 12 measures ahead of current playback, wait.
            const currentSeconds = Tone.Transport.seconds;
            const currentMeasures = currentSeconds / secondsPerMeasure;
            const futureBufferMeasures = totalMeasures - currentMeasures;

            if (futureBufferMeasures > 12) {
                console.log(`[SFT Podcast] Buffer is ${futureBufferMeasures.toFixed(1)} measures ahead. Throttling extension...`);
                setTimeout(() => {
                    requestAnimationFrame(() => recursiveGenerationLoop());
                }, 2000);
                return;
            }

            if (playbackStateRef.current === 'paused') {
                setTimeout(() => {
                    requestAnimationFrame(() => recursiveGenerationLoop());
                }, 1000);
                return;
            }

            if (!isLoopingRef.current) {
                setIsGenerating(false);
                return;
            }

            // Extract past_midi (last 8 measures of current composition)
            const maxPastMeasures = 8;
            const pastDuration = secondsPerMeasure * maxPastMeasures;
            const gridDuration = totalMeasures * secondsPerMeasure;
            const pastStartTime = Math.max(0, gridDuration - pastDuration);

            const getProgramFromInstrument = (instName) => {
                const name = String(instName).toUpperCase();
                if (name.includes('PIANO')) return 0;
                if (name.includes('SAX')) return 65;
                return 0;
            };

            const pastMidi = new Midi();
            const primaryInstrument = settingsRef.current.selectedInstruments?.[0] || 'PIANO';
            const program = getProgramFromInstrument(primaryInstrument);

            if (currentMidi.header) {
                pastMidi.header.fromJSON(currentMidi.header.toJSON());
            }

            let pastNotesCount = 0;
            currentMidi.tracks.forEach(track => {
                const newTrack = pastMidi.addTrack();
                newTrack.instrument.number = program;
                if (track.notes) {
                    track.notes.forEach(note => {
                        if (note.time >= pastStartTime) {
                            newTrack.addNote({
                                midi: note.midi,
                                time: note.time - pastStartTime,
                                duration: note.duration,
                                velocity: note.velocity
                            });
                            pastNotesCount++;
                        }
                    });
                }
            });

            const pastMidiBlob = pastNotesCount > 0 ? new Blob([pastMidi.toArray()], { type: 'audio/midi' }) : null;

            if (!model) {
                isLoopingRef.current = false;
                return;
            }

            setIsGenerating(true);

            // Extend 8 measures with SFT continuation
            const overrideMeta = {
                model_type: model.model_name,
                program: settingsRef.current.selectedInstruments || [],
                tempo: parseInt(settingsRef.current.tempo, 10) || 120,
                num_gems: 1,
                genfield_measure: 8,
                generate_count: 8,
                key: settingsRef.current.key.replace(' ', ''),
                temperature: settingsRef.current.temperature,
                p: settingsRef.current.p
            };

            if (settingsRef.current.selectedGenres && settingsRef.current.selectedGenres.length > 0) {
                overrideMeta.genre = settingsRef.current.selectedGenres;
            }

            if (model?.rule?.gen_note_dense && settingsRef.current.densities) {
                const densityPayload = {};
                settingsRef.current.selectedInstruments.forEach(inst => {
                    if (settingsRef.current.densities[inst]) densityPayload[inst] = settingsRef.current.densities[inst];
                });
                overrideMeta.gen_note_dense = densityPayload;
                overrideMeta.note_density = densityPayload;
            }

            console.log(`Extending podcast composition using SFT model context from time ${pastStartTime.toFixed(2)}s`);
            const results = await onGenerate(
                model.model_name,
                [],
                null,
                {},
                null,
                overrideMeta,
                { pastMidiBlob }
            );

            if (results && results.length > 0) {
                const newSegment = results[0];
                mergeMidi(newSegment);
                requestAnimationFrame(() => recursiveGenerationLoop());
            } else {
                console.warn("SFT model returned no result, stopping loop.");
                setIsGenerating(false);
            }
        } catch (e) {
            console.error("Recursive podcast loop failed:", e);
            setNotification({ open: true, message: `Podcast loop error: ${e.message}`, severity: "error" });
            isLoopingRef.current = false;
            setIsGenerating(false);
        }
    };

    // Clean Append Merge using Smart Append Alignment (Removing model silence default)
    const mergeMidi = (newSegment) => {
        const currentMidi = compositionRef.current;
        if (!currentMidi || !newSegment) return;

        const bpm = currentMidi.header.tempos[0]?.bpm || 120;
        const timeSignature = currentMidi.header.timeSignatures[0]?.timeSignature || [4, 4];
        const secondsPerMeasure = (60 / bpm) * timeSignature[0];

        // 1. Calculate prompt end time aligned to nearest measure boundary
        const allOriginalNotes = currentMidi.tracks.flatMap(t => t.notes || []);
        const lastNoteTime = allOriginalNotes.length > 0 ? allOriginalNotes.reduce((max, note) => Math.max(max, note.time + note.duration), 0) : 0;
        const lastMeasure = Math.ceil(lastNoteTime / secondsPerMeasure);
        const promptEndTime = lastMeasure * secondsPerMeasure;

        // 2. SFT Leading Silence Shift Deduction (Smart Append Alignment)
        const genNotes = newSegment.tracks.flatMap(t => t.notes || []).sort((a, b) => a.time - b.time);
        const firstGenNoteTime = genNotes.length > 0 ? genNotes[0].time : 0;

        // If SFT model, we expect a 1-measure leading silence (secondsPerMeasure). If detected, we subtract it.
        const targetShiftMeasures = 1;
        const alreadyHasShift = firstGenNoteTime >= (targetShiftMeasures * secondsPerMeasure - 0.1);
        const shiftTime = alreadyHasShift ? (targetShiftMeasures * secondsPerMeasure) : 0;

        console.log("=== Podcast SFT Merge Alignment ===", {
            promptEndTime: promptEndTime.toFixed(2) + "s",
            firstGenNoteTime: firstGenNoteTime.toFixed(2) + "s",
            alreadyHasShift,
            cutShiftTime: shiftTime.toFixed(2) + "s",
            targetTime: (promptEndTime - shiftTime).toFixed(2) + "s"
        });

        // 3. Append notes cleanly to current composition tracks
        currentMidi.tracks.forEach((track, i) => {
            const resultTrack = newSegment.tracks[i] || newSegment.tracks[0];
            if (resultTrack && resultTrack.notes) {
                resultTrack.notes.forEach(note => {
                    const finalTime = note.time + promptEndTime - shiftTime;
                    track.addNote({
                        midi: note.midi,
                        time: Math.max(promptEndTime, finalTime),
                        duration: note.duration,
                        velocity: note.velocity
                    });
                });
            }
        });

        // Rebuild MIDI buffer and update state
        const refreshedMidi = new Midi(currentMidi.toArray());
        compositionRef.current = refreshedMidi;

        if (isLoopingRef.current) {
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
        if (onBack) onBack();
    };

    useEffect(() => {
        return () => { isLoopingRef.current = false; };
    }, []);

    // File dropping/parsing logic (unchanged structure but clean integration)
    const processMidiFile = async (file) => {
        if (!file) return;
        try {
            const arrayBuffer = await file.arrayBuffer();
            const midi = new Midi(arrayBuffer);
            setUploadedMidi(midi);
            setMidiData(midi);
        } catch (error) {
            console.error("MIDI parse error:", error);
            setNotification({ open: true, message: "Error parsing uploaded MIDI file", severity: "error" });
        }
    };

    const handleCropAndStart = () => {
        if (!uploadedMidi) return;
        const selectedRange = pianoRollRef.current?.getSelectedRange() || [0, 0];
        const bpm = uploadedMidi.header.tempos[0]?.bpm || 120;
        const timeSignature = uploadedMidi.header.timeSignatures[0]?.timeSignature || [4, 4];
        const secondsPerMeasure = (60 / bpm) * timeSignature[0];

        let targetMidi;
        if (selectedRange[0] === 0 && selectedRange[1] === 0) {
            targetMidi = uploadedMidi;
        } else {
            const startTime = selectedRange[0] * secondsPerMeasure;
            const endTime = (selectedRange[1] + 1) * secondsPerMeasure;

            const newMidi = new Midi();
            if (uploadedMidi.header) {
                if (uploadedMidi.header.tempos?.[0]) newMidi.header.setTempo(uploadedMidi.header.tempos[0].bpm);
                newMidi.header.name = uploadedMidi.header.name;
            }

            uploadedMidi.tracks.forEach(t => {
                const track = newMidi.addTrack();
                track.instrument = t.instrument;
                if (t.notes) {
                    t.notes.forEach(n => {
                        if (n.time >= startTime && n.time < endTime) {
                            track.addNote({
                                midi: n.midi,
                                time: n.time - startTime,
                                duration: Math.min(n.duration, endTime - n.time),
                                velocity: n.velocity
                            });
                        }
                    });
                }
            });
            targetMidi = newMidi;
        }

        setUploadedMidi(null);
        // Start podcast loop using the cropped MIDI as starting context
        compositionRef.current = targetMidi;
        setMidiData(targetMidi);
        updateStats(targetMidi);
        isLoopingRef.current = true;
        recursiveGenerationLoop();
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const file = e.dataTransfer?.files[0];
        if (file && (file.name.endsWith('.mid') || file.name.endsWith('.midi'))) {
            processMidiFile(file);
        } else {
            setNotification({ open: true, message: "Upload a valid MIDI file", severity: "warning" });
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'copy';
    };

    return (
        <div className="flex flex-col h-full animate-in fade-in zoom-in-95 duration-300">
            {/* Header */}
            <div className="p-4 border-b border-border flex items-center justify-between bg-surface/50 backdrop-blur-sm shrink-0">
                <div className="flex items-center gap-4">
                    <button onClick={stopLoop} className="flex items-center gap-2 text-sm text-muted hover:text-text transition-colors">
                        <ArrowLeft className="w-4 h-4" /> Exit
                    </button>
                    <div className="h-4 w-[1px] bg-border"></div>
                    <span className="flex items-center gap-2 text-sm font-medium text-text">
                        SFT Model: <span className="text-primary font-bold">{model?.model_name}</span>
                        {isGenerating && <span className="text-xs text-primary/80 animate-pulse ml-2 flex items-center gap-1"><Radio className="w-3.5 h-3.5 animate-bounce" /> Streaming Extension...</span>}
                    </span>
                </div>
                {compositionRef.current && (
                    <div className="flex items-center gap-4 text-xs font-mono text-muted">
                        <span className="flex items-center gap-1"><Activity className="w-3 h-3 text-primary" /> {conversationStats.measures} Bars</span>
                        <span className="flex items-center gap-1"><Music className="w-3 h-3 text-primary" /> {conversationStats.duration}s</span>
                    </div>
                )}
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col items-center justify-center p-8 overflow-y-auto w-full relative bg-radial-gradient">
                
                {/* Visualizer / Dropper */}
                <div 
                    className={`w-full max-w-2xl h-64 rounded-3xl border border-white/5 flex flex-col items-center justify-center mb-8 relative overflow-hidden group transition-all duration-350 shadow-2xl ${waveActive ? 'bg-primary/5 border-primary/20 shadow-primary/5' : 'bg-black/40'}`}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                >
                    {/* Equalizer waves */}
                    <div className={`flex items-end gap-1.5 h-24 ${waveActive ? 'opacity-100' : 'opacity-20 transition-opacity duration-300'}`}>
                        {[...Array(24)].map((_, i) => (
                            <div
                                key={i}
                                className={`w-2.5 bg-gradient-to-t from-primary to-secondary rounded-full transition-all duration-150`}
                                style={{
                                    height: waveActive ? `${15 + Math.random() * 85}%` : '15%',
                                    animationDelay: `${i * 0.05}s`,
                                }}
                            />
                        ))}
                    </div>

                    {/* Drag-n-Drop overlay overlay */}
                    {!compositionRef.current && !isGenerating && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-md transition-all text-white p-6 text-center">
                            <UploadCloud className="w-12 h-12 text-primary/80 mb-3 animate-bounce" />
                            <h4 className="text-base font-bold mb-1">Drag & Drop MIDI file here</h4>
                            <p className="text-xs text-muted max-w-xs mb-4">Or start a brand new generation stream with selected SFT model</p>
                            
                            <button
                                onClick={handleStartPodcast}
                                className="px-8 py-3 bg-primary hover:bg-primary/95 text-white font-bold rounded-xl shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all text-sm flex items-center gap-2"
                            >
                                <Play className="w-4 h-4 fill-white" /> Start SFT Podcast Stream
                            </button>
                        </div>
                    )}

                    {isGenerating && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-md z-10 text-white">
                            <div className="relative flex items-center justify-center w-16 h-16 mb-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-30"></span>
                                <Radio className="w-8 h-8 text-primary animate-pulse" />
                            </div>
                            <span className="text-xs font-mono text-primary/90 tracking-widest uppercase animate-pulse">SFT Extending...</span>
                        </div>
                    )}
                </div>

                {compositionRef.current && (
                    <div className="w-full max-w-md text-center text-muted text-xs mt-4 bg-surface/40 backdrop-blur-md border border-border/50 rounded-2xl p-4 shadow-xl space-y-1 animate-in fade-in duration-500">
                        <p className="text-sm font-semibold text-text flex items-center justify-center gap-1.5"><Radio className="w-4 h-4 text-red-500 animate-pulse" /> SFT Live Podcast Stream is active</p>
                        <p className="opacity-75">The composition is recursively extending by 8 bars using direct SFT prediction.</p>
                        <p className="opacity-50 text-[10px]">Sit back, listen, and enjoy the infinite generative music.</p>
                    </div>
                )}
            </div>

            {/* Controls */}
            <div className="h-auto border-t border-border bg-surface/80 backdrop-blur-md shrink-0 p-6">
                <div className="container mx-auto max-w-6xl grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                    <div className="col-span-12 md:col-span-4 space-y-4">
                        {/* Configuration Card */}
                        <div className="bg-surface/50 rounded-xl p-4 border border-border/60 space-y-4 shadow-inner">
                            <h4 className="text-xs font-bold tracking-widest text-muted uppercase flex items-center gap-2">
                                <SettingsIcon className="w-3.5 h-3.5 text-primary" /> Configuration
                            </h4>

                            {/* Key Selection */}
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-muted uppercase tracking-wider">Key Signature</label>
                                <button
                                    onClick={() => setKeySelectorOpen(true)}
                                    className="w-full p-2.5 bg-surface border border-border rounded-xl text-left hover:border-primary transition-all flex items-center justify-between text-xs font-medium"
                                >
                                    <span>{settings.key}</span>
                                    <Music className="w-3.5 h-3.5 text-muted" />
                                </button>
                            </div>

                            {/* Instruments Selector */}
                            {availableInstruments.length > 0 && (
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-muted uppercase tracking-wider">Target Voice Instruments</label>
                                    <div className="flex flex-wrap gap-1.5">
                                        {availableInstruments.map(inst => (
                                            <button
                                                key={inst}
                                                disabled={!!compositionRef.current}
                                                onClick={() => toggleInstrument(inst)}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${settings.selectedInstruments?.includes(inst)
                                                    ? 'bg-primary text-white shadow-md shadow-primary/20'
                                                    : 'bg-surface border border-border text-text hover:bg-surface/80'
                                                    } ${compositionRef.current ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            >
                                                {inst}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Genres Selector */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-muted uppercase tracking-wider">Genres (Max 2)</label>
                                <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto p-1.5 bg-surface border border-border/80 rounded-xl">
                                    {ALL_GENRES.map(genre => {
                                        const isSelected = settings.selectedGenres?.includes(genre);
                                        return (
                                            <button
                                                key={genre}
                                                disabled={!!compositionRef.current}
                                                onClick={() => toggleGenre(genre)}
                                                className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all ${isSelected
                                                    ? 'bg-primary text-white shadow-sm'
                                                    : 'bg-surface/50 text-muted hover:text-text'
                                                    } ${compositionRef.current ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            >
                                                {genre}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Note Density Sliders */}
                            {model?.rule?.gen_note_dense && settings.selectedInstruments?.length > 0 && (
                                <div className="space-y-3 pt-3 border-t border-border/50">
                                    <label className="text-[10px] font-bold text-muted uppercase tracking-wider">Note Density Override</label>
                                    <div className="space-y-2">
                                        {settings.selectedInstruments.map(inst => (
                                            <div key={inst} className="space-y-1">
                                                <div className="flex justify-between items-center text-xs">
                                                    <span className="font-mono text-primary font-bold">{inst}</span>
                                                    <span className="font-mono text-muted">{settings.densities?.[inst] || 4}</span>
                                                </div>
                                                <input
                                                    type="range"
                                                    min="1"
                                                    max="10"
                                                    step="1"
                                                    value={settings.densities?.[inst] || 4}
                                                    onChange={(e) => {
                                                        const newDensities = { ...(settings.densities || {}), [inst]: parseInt(e.target.value) };
                                                        settings.setDensities(newDensities);
                                                    }}
                                                    className="w-full h-1 bg-border rounded-lg appearance-none cursor-pointer accent-primary"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Hidden parameters settings (temperature, p) */}
                        <AdvancedSettings
                            {...settings}
                            rules={{ ...model?.rule, number_of_generation: false }}
                            isSft={model?.tag?.model === 'sft_gen' || model?.tag?.model === 'sft'}
                        />
                    </div>

                    {/* Center Big Playback Controller */}
                    <div className="col-span-12 md:col-span-8 flex flex-col items-center justify-center gap-4 py-4">
                        <button
                            onClick={playbackState === 'playing' ? onPause : onPlay}
                            disabled={!compositionRef.current}
                            className={`w-24 h-24 rounded-full flex items-center justify-center transition-all shadow-2xl hover:scale-105 active:scale-95 disabled:scale-100 ${playbackState === 'playing' ? 'bg-primary text-white shadow-primary/20' : 'bg-surface border border-border text-primary disabled:opacity-40'}`}
                        >
                            {playbackState === 'playing' ? <Pause className="w-10 h-10 fill-current" /> : <Play className="w-10 h-10 fill-current ml-2" />}
                        </button>
                        <span className="text-[10px] font-bold tracking-widest text-muted uppercase">
                            {playbackState === 'playing' ? 'Stream active' : 'Stream idle'}
                        </span>
                    </div>
                </div>
            </div>

            <KeySelector
                open={keySelectorOpen}
                onClose={() => setKeySelectorOpen(false)}
                onSave={settings.setKey}
                currentKey={settings.key}
            />

            {/* Crop Overlay Modal */}
            {uploadedMidi && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-surface border border-border rounded-2xl w-full max-w-5xl h-[80vh] flex flex-col overflow-hidden shadow-2xl">
                        <div className="p-4 border-b border-border flex justify-between items-center bg-surface/50">
                            <div>
                                <h3 className="text-lg font-bold text-white">Crop Uploaded MIDI</h3>
                                <p className="text-sm text-muted">Select measures to crop. If no selection is made, the entire file will be used.</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <button 
                                    onClick={() => setUploadedMidi(null)}
                                    className="px-4 py-2 bg-surface text-text rounded-lg hover:bg-surface/80 transition-colors border border-border text-sm"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={handleCropAndStart}
                                    className="px-6 py-2 bg-primary text-white font-bold rounded-lg hover:bg-primary/80 transition-colors shadow-lg"
                                >
                                    Confirm Crop & Start
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-hidden relative">
                            <PianoRoll 
                                ref={pianoRollRef}
                                midiData={uploadedMidi}
                                duration={uploadedMidi.duration}
                                progress={progress || 0}
                                onSeek={onSeek}
                                selectionEnabled={true}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PodcastMode;
