import React, { useState, useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import { Volume2, VolumeX, Trash2, Plus, RefreshCw, Download } from 'lucide-react';
import ChordProgression from './ChordProgression';

const MEASURE_HEADER_HEIGHT = 30;

const NoteBar = ({ note, pixelsPerSecond, verticalZoom }) => {
    const NOTE_HEIGHT = 20 * verticalZoom;
    const top = (127 - note.midi) * NOTE_HEIGHT;
    const left = note.time * pixelsPerSecond;
    const width = note.duration * pixelsPerSecond;

    return (
        <div
            className="absolute bg-primary rounded-sm z-10 flex items-center justify-center overflow-hidden shadow-sm border border-white/10"
            style={{
                top: `${top}px`,
                left: `${left}px`,
                width: `${width}px`,
                height: `${NOTE_HEIGHT - 1}px`,
            }}
        >
            {width > 20 && (
                <span className="text-[10px] text-white font-medium select-none truncate px-1">
                    {note.name}
                </span>
            )}
        </div>
    );
};

const PianoRoll = forwardRef(({ midiData, progress, duration, generationLength, setGenerationLength, onSeek, onChordsChange, onMute, onSolo, onDelete, onClear, trackMutes, trackSolos, selectionEnabled = true }, ref) => {
    const [selectedMeasures, setSelectedMeasures] = useState([0, 0]);
    const [horizontalZoom, setHorizontalZoom] = useState(1);
    const [verticalZoom, setVerticalZoom] = useState(1);
    const [chords, setChords] = useState({});
    const [selectedTrackIndex, setSelectedTrackIndex] = useState(0);

    useEffect(() => {
        if (onChordsChange) {
            onChordsChange(chords);
        }
    }, [chords, onChordsChange]);

    // Reset selected track when midiData changes
    useEffect(() => {
        setSelectedTrackIndex(0);
    }, [midiData]);

    const pixelsPerSecond = 80 * horizontalZoom;
    const NOTE_HEIGHT = 20 * verticalZoom;

    // Filter notes based on selected track
    const currentTrack = midiData?.tracks?.[selectedTrackIndex];
    const allNotes = currentTrack?.notes || [];
    const isMuted = trackMutes ? trackMutes[selectedTrackIndex] : false;
    const isSoloed = trackSolos ? trackSolos[selectedTrackIndex] : false;

    const bpm = midiData?.header?.tempos?.[0]?.bpm || 120;
    const timeSignature = midiData?.header?.timeSignatures?.[0]?.timeSignature || [4, 4];

    const secondsPerMeasure = (60 / bpm) * timeSignature[0];
    const pixelsPerMeasure = secondsPerMeasure * pixelsPerSecond;

    const totalDuration = duration;
    const calculatedMeasures = totalDuration > 0 ? Math.ceil(totalDuration / secondsPerMeasure) : 12;
    const totalMeasures = Math.max(calculatedMeasures, 96);

    const contentWidth = totalMeasures * pixelsPerMeasure;
    const contentHeight = 128 * NOTE_HEIGHT;

    const playbackIndicatorPosition = progress * totalDuration * pixelsPerSecond;

    const scrollContainerRef = useRef(null);

    useImperativeHandle(ref, () => ({
        getSelectedNotes: () => {
            if (!midiData || (selectedMeasures[0] === 0 && selectedMeasures[1] === 0)) {
                return [];
            }

            const startTime = selectedMeasures[0] * secondsPerMeasure;
            const endTime = (selectedMeasures[1] + 1) * secondsPerMeasure;

            const selectedNotes = allNotes.filter(note => {
                return note.time >= startTime && note.time < endTime;
            });

            return selectedNotes;
        },
        getPastNotes: (maxMeasures = 8) => {
            if (!midiData || (selectedMeasures[0] === 0 && selectedMeasures[1] === 0)) {
                return [];
            }
            const selectionStartTime = selectedMeasures[0] * secondsPerMeasure;
            const pastStartTime = Math.max(0, (selectedMeasures[0] - maxMeasures) * secondsPerMeasure);

            return allNotes.filter(note => {
                return note.time >= pastStartTime && note.time < selectionStartTime;
            });
        },
        getFutureNotes: (maxMeasures = 8) => {
            if (!midiData || (selectedMeasures[0] === 0 && selectedMeasures[1] === 0)) {
                return [];
            }
            const selectionEndTime = (selectedMeasures[1] + 1) * secondsPerMeasure;
            const futureEndTime = (selectedMeasures[1] + 1 + maxMeasures) * secondsPerMeasure;

            return allNotes.filter(note => {
                return note.time >= selectionEndTime && note.time < futureEndTime;
            });
        },
        getSelectedRange: () => selectedMeasures,
        getSelectedTrackIndex: () => selectedTrackIndex
    }));

    useEffect(() => {
        const scrollContainer = scrollContainerRef.current;
        const handleWheel = (e) => {
            e.preventDefault();
            if (e.ctrlKey) {
                const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
                setHorizontalZoom(prev => Math.max(0.1, Math.min(prev * zoomFactor, 5)));
            } else if (e.altKey) {
                const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
                setVerticalZoom(prev => Math.max(0.1, Math.min(prev * zoomFactor, 5)));
            } else if (e.shiftKey) {
                scrollContainer.scrollLeft += e.deltaY;
            } else {
                scrollContainer.scrollTop += e.deltaY;
            }
        };

        if (scrollContainer) {
            scrollContainer.addEventListener('wheel', handleWheel, { passive: false });
        }

        return () => {
            if (scrollContainer) {
                scrollContainer.removeEventListener('wheel', handleWheel);
            }
        };
    }, []);

    useEffect(() => {
        if (midiData && scrollContainerRef.current) {
            // Use the filtered notes for centering
            if (allNotes.length > 0) {
                const minNote = Math.min(...allNotes.map(n => n.midi));
                const maxNote = Math.max(...allNotes.map(n => n.midi));

                const centerNoteMidi = (maxNote + minNote) / 2;
                const centerNoteY = (127 - centerNoteMidi) * NOTE_HEIGHT;

                const containerHeight = scrollContainerRef.current.clientHeight;
                const scrollTop = centerNoteY - (containerHeight / 2);

                scrollContainerRef.current.scrollTop = scrollTop;
            }
        }
    }, [midiData, verticalZoom, NOTE_HEIGHT, selectedTrackIndex]); // Re-center when track changes

    const handleContainerClick = (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const time = x / pixelsPerSecond;
        if (onSeek) {
            onSeek(time);
        }
    };

    const handleMeasureClick = (measureIndex) => {
        if (!selectionEnabled) return;

        if (selectedMeasures[0] === 0 && selectedMeasures[1] === 0) {
            setSelectedMeasures([measureIndex, measureIndex]);
        } else if (measureIndex >= selectedMeasures[0] && measureIndex <= selectedMeasures[1]) {
            setSelectedMeasures([0, 0]);
        } else {
            const newStart = Math.min(selectedMeasures[0], measureIndex);
            const newEnd = Math.max(selectedMeasures[1], measureIndex);
            setSelectedMeasures([newStart, newEnd]);
        }
    };

    return (
        <div className="flex flex-col h-full p-4">
            <div className="flex items-center gap-6 mb-4">
                <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-muted">H-Zoom</span>
                    <input
                        type="range"
                        min="0.1"
                        max="5"
                        step="0.1"
                        value={horizontalZoom}
                        onChange={(e) => setHorizontalZoom(parseFloat(e.target.value))}
                        className="w-32 h-2 bg-surface rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-muted">V-Zoom</span>
                    <input
                        type="range"
                        min="0.1"
                        max="5"
                        step="0.1"
                        value={verticalZoom}
                        onChange={(e) => setVerticalZoom(parseFloat(e.target.value))}
                        className="w-32 h-2 bg-surface rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                </div>

                {midiData && midiData.tracks.length > 0 && (
                    <>
                        <div className="flex items-center gap-3">
                            <span className="text-sm font-medium text-muted">Track</span>
                            <select
                                value={selectedTrackIndex}
                                onChange={(e) => setSelectedTrackIndex(parseInt(e.target.value))}
                                className="bg-surface text-text border border-border rounded px-2 py-1 text-sm focus:outline-none focus:border-primary"
                            >
                                {midiData.tracks.map((track, index) => (
                                    <option key={index} value={index}>
                                        {index + 1}: {track.name || track.instrument.name || `Track ${index + 1}`}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="flex items-center gap-2 border-l border-border pl-4">
                            <button
                                onClick={() => onMute && onMute(selectedTrackIndex)}
                                className={`p-2 rounded hover:bg-surface transition-colors ${isMuted ? 'text-red-500' : 'text-muted'}`}
                                title={isMuted ? "Unmute Track" : "Mute Track"}
                            >
                                {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                            </button>
                            <button
                                onClick={() => onSolo && onSolo(selectedTrackIndex)}
                                className={`p-2 rounded hover:bg-surface transition-colors ${isSoloed ? 'text-yellow-500' : 'text-muted'}`}
                                title={isSoloed ? "Unsolo Track" : "Solo Track"}
                            >
                                <span className="font-bold text-sm">S</span>
                            </button>
                            <button
                                onClick={() => onDelete && onDelete(selectedTrackIndex)}
                                className="p-2 rounded hover:bg-red-500/20 text-muted hover:text-red-500 transition-colors"
                                title="Delete Track"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                    </>
                )}

                <div className="ml-auto">
                    <button
                        onClick={onClear}
                        className="flex items-center gap-2 px-3 py-1.5 bg-surface hover:bg-surface/80 text-text rounded border border-border transition-colors text-sm"
                        title="Clear All"
                    >
                        <RefreshCw size={14} />
                        <span>Clear</span>
                    </button>
                    <button
                        onClick={() => {
                            if (midiData) {
                                const blob = new Blob([midiData.toArray()], { type: 'audio/midi' });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = 'output.mid';
                                document.body.appendChild(a);
                                a.click();
                                document.body.removeChild(a);
                                URL.revokeObjectURL(url);
                            }
                        }}
                        className="flex items-center gap-2 px-3 py-1.5 bg-surface hover:bg-surface/80 text-text rounded border border-border transition-colors text-sm ml-2"
                        title="Download MIDI"
                    >
                        <Download size={14} />

                    </button>
                </div>
            </div>

            <div
                className="flex-1 border border-border rounded-lg overflow-auto relative bg-surface/20"
                ref={scrollContainerRef}
            >
                {/* Sticky Measure Header */}
                <div
                    className="sticky top-0 left-0 flex bg-background z-20 border-b border-border"
                    style={{
                        width: `${contentWidth}px`,
                        height: `${MEASURE_HEADER_HEIGHT}px`,
                    }}
                >
                    {Array.from({ length: totalMeasures }).map((_, i) => (
                        <div
                            key={i}
                            className={`
                                border-r border-border text-xs flex items-center justify-center cursor-pointer transition-colors
                                ${i >= selectedMeasures[0] && i <= selectedMeasures[1] ? 'bg-primary/30 text-primary font-bold' : 'text-muted hover:bg-surface'}
                            `}
                            style={{ width: `${pixelsPerMeasure}px` }}
                            onClick={() => handleMeasureClick(i)}
                        >
                            {i + 1}
                        </div>
                    ))}
                </div>

                {/* Sticky Chord Progression */}
                <div
                    className="sticky top-[30px] left-0 z-20 bg-background border-b border-border"
                    style={{ width: `${contentWidth}px` }}
                >
                    <ChordProgression
                        totalMeasures={totalMeasures}
                        pixelsPerMeasure={pixelsPerMeasure}
                        onChordsChange={setChords}
                    />
                </div>

                <div
                    onClick={handleContainerClick}
                    className="relative cursor-pointer"
                    style={{
                        width: `${contentWidth}px`,
                        height: `${contentHeight}px`,
                    }}
                >
                    {/* Grid Background */}
                    {Array.from({ length: totalMeasures }).map((_, i) => (
                        <div
                            key={i}
                            className={`absolute top-0 h-full border-r border-border/30 ${i < generationLength ? 'bg-primary/5' : ''}`}
                            style={{
                                left: `${i * pixelsPerMeasure}px`,
                                width: `${pixelsPerMeasure}px`,
                            }}
                        />
                    ))}

                    {/* Selection Overlay */}
                    {selectedMeasures[0] !== 0 || selectedMeasures[1] !== 0 ? (
                        <div
                            className="absolute top-0 h-full bg-primary/20 pointer-events-none z-[2]"
                            style={{
                                left: `${selectedMeasures[0] * pixelsPerMeasure}px`,
                                width: `${(selectedMeasures[1] - selectedMeasures[0] + 1) * pixelsPerMeasure}px`,
                            }}
                        />
                    ) : null}

                    {/* Notes */}
                    {allNotes.map((note, index) => (
                        <NoteBar key={index} note={note} pixelsPerSecond={pixelsPerSecond} verticalZoom={verticalZoom} />
                    ))}

                    {/* Playback Head */}
                    <div
                        className="absolute top-0 h-full w-0.5 bg-red-500 z-20 pointer-events-none shadow-[0_0_10px_rgba(239,68,68,0.5)]"
                        style={{
                            left: `${playbackIndicatorPosition}px`,
                        }}
                    />
                </div>

                {!midiData && (
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-muted pointer-events-none">
                        Piano Roll Area
                    </div>
                )}
            </div>
        </div>
    );
});

export default PianoRoll;