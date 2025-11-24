import React, { useState, useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
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

const PianoRoll = forwardRef(({ midiData, progress, duration, generationLength, setGenerationLength, onSeek, onChordsChange }, ref) => {
    const [selectedMeasures, setSelectedMeasures] = useState([0, 0]);
    const [horizontalZoom, setHorizontalZoom] = useState(1);
    const [verticalZoom, setVerticalZoom] = useState(1);
    const [chords, setChords] = useState({});

    useEffect(() => {
        if (onChordsChange) {
            onChordsChange(chords);
        }
    }, [chords, onChordsChange]);

    const pixelsPerSecond = 80 * horizontalZoom;
    const NOTE_HEIGHT = 20 * verticalZoom;

    const allNotes = midiData ? midiData.tracks.flatMap(track => track.notes) : [];

    const bpm = midiData?.header.tempos[0]?.bpm || 120;
    const timeSignature = midiData?.header.timeSignatures[0]?.timeSignature || [4, 4];

    const secondsPerMeasure = (60 / bpm) * timeSignature[0];
    const pixelsPerMeasure = secondsPerMeasure * pixelsPerSecond;

    const totalDuration = duration;
    const totalMeasures = totalDuration > 0 ? Math.ceil(totalDuration / secondsPerMeasure) : 12;

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
        }
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
            const allNotesInMidi = midiData.tracks.flatMap(track => track.notes);
            if (allNotesInMidi.length > 0) {
                const minNote = Math.min(...allNotesInMidi.map(n => n.midi));
                const maxNote = Math.max(...allNotesInMidi.map(n => n.midi));

                const centerNoteMidi = (maxNote + minNote) / 2;
                const centerNoteY = (127 - centerNoteMidi) * NOTE_HEIGHT;

                const containerHeight = scrollContainerRef.current.clientHeight;
                const scrollTop = centerNoteY - (containerHeight / 2);

                scrollContainerRef.current.scrollTop = scrollTop;
            }
        }
    }, [midiData, verticalZoom, NOTE_HEIGHT]);

    const handleContainerClick = (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const time = x / pixelsPerSecond;
        if (onSeek) {
            onSeek(time);
        }
    };

    const handleMeasureClick = (measureIndex) => {
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

                <ChordProgression
                    totalMeasures={totalMeasures}
                    pixelsPerMeasure={pixelsPerMeasure}
                    onChordsChange={setChords}
                />

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