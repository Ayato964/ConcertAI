import React, { useState, useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import { Box, Typography, Slider } from '@mui/material';
import ChordProgression from './ChordProgression';

const MEASURE_HEADER_HEIGHT = 30;

const NoteBar = ({ note, pixelsPerSecond, verticalZoom }) => {
    const NOTE_HEIGHT = 20 * verticalZoom;
    const top = (127 - note.midi) * NOTE_HEIGHT;
    const left = note.time * pixelsPerSecond;
    const width = note.duration * pixelsPerSecond;

    return (
        <Box
            sx={{
                position: 'absolute',
                top: `${top}px`,
                left: `${left}px`,
                width: `${width}px`,
                height: `${NOTE_HEIGHT - 1}px`,
                backgroundColor: 'primary.main',
                borderRadius: '2px',
                zIndex: 3,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
            }}
        >
            {width > 20 && (
                <Typography variant="caption" sx={{ color: 'white', userSelect: 'none' }}>
                    {note.name}
                </Typography>
            )}
        </Box>
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
        <Box>
            <Box sx={{ display: 'flex', gap: 2, mb: 1 }}>
                <Typography>H-Zoom</Typography>
                <Slider
                    min={0.1}
                    max={5}
                    step={0.1}
                    value={horizontalZoom}
                    onChange={(e, newValue) => setHorizontalZoom(newValue)}
                />
                <Typography>V-Zoom</Typography>
                <Slider
                    min={0.1}
                    max={5}
                    step={0.1}
                    value={verticalZoom}
                    onChange={(e, newValue) => setVerticalZoom(newValue)}
                />
            </Box>
            <Box
                sx={{
                    my: 2,
                    border: '1px solid lightgrey',
                    borderRadius: '4px',
                    height: '500px',
                    overflow: 'auto',
                    position: 'relative',
                    backgroundColor: 'background.paper',
                }}
                ref={scrollContainerRef}
            >
                {/* Sticky Measure Header */}
                <Box sx={{
                    position: 'sticky',
                    top: 0,
                    left: 0,
                    width: `${contentWidth}px`,
                    height: `${MEASURE_HEADER_HEIGHT}px`,
                    display: 'flex',
                    backgroundColor: 'background.default',
                    zIndex: 5
                }}>
                    {Array.from({ length: totalMeasures }).map((_, i) => (
                        <Box key={i} sx={{
                            width: `${pixelsPerMeasure}px`,
                            borderRight: '1px solid grey',
                            textAlign: 'center',
                            color: 'text.secondary',
                            backgroundColor: i >= selectedMeasures[0] && i <= selectedMeasures[1] ? 'rgba(0, 128, 255, 0.3)' : 'transparent',
                            cursor: 'pointer',
                        }}
                        onClick={() => handleMeasureClick(i)}>
                            {i + 1}
                        </Box>
                    ))}
                </Box>
                <ChordProgression 
                    totalMeasures={totalMeasures} 
                    pixelsPerMeasure={pixelsPerMeasure} 
                    onChordsChange={setChords} 
                />

                <Box 
                    onClick={handleContainerClick}
                    sx={{
                        width: `${contentWidth}px`,
                        height: `${contentHeight}px`,
                        position: 'relative',
                        cursor: 'pointer'
                    }}
                >
                    {Array.from({ length: totalMeasures }).map((_, i) => (
                        <Box
                            key={i}
                            sx={{
                                position: 'absolute',
                                left: `${i * pixelsPerMeasure}px`,
                                top: 0,
                                width: `${pixelsPerMeasure}px`,
                                height: '100%',
                                backgroundColor: i < generationLength ? 'rgba(0, 128, 255, 0.1)' : 'transparent',
                                borderRight: '1px solid grey', // Darker divider
                                zIndex: 1,
                            }}
                        />
                    ))}
                    {selectedMeasures[0] !== 0 || selectedMeasures[1] !== 0 ? (
                        <Box
                            sx={{
                                position: 'absolute',
                                left: `${selectedMeasures[0] * pixelsPerMeasure}px`,
                                top: 0,
                                width: `${(selectedMeasures[1] - selectedMeasures[0] + 1) * pixelsPerMeasure}px`,
                                height: '100%',
                                backgroundColor: 'rgba(0, 128, 255, 0.3)',
                                zIndex: 2,
                                pointerEvents: 'none',
                            }}
                        />
                    ) : null}
                    {allNotes.map((note, index) => (
                        <NoteBar key={index} note={note} pixelsPerSecond={pixelsPerSecond} verticalZoom={verticalZoom} />
                    ))}
                    <Box
                        sx={{
                            position: 'absolute',
                            left: `${playbackIndicatorPosition}px`,
                            top: 0,
                            height: '100%',
                            width: '2px',
                            backgroundColor: 'red',
                            zIndex: 4,
                            pointerEvents: 'none',
                        }}
                    />
                </Box>

                {!midiData && (
                    <Typography color="text.secondary" sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
                        Piano Roll Area
                    </Typography>
                )}
            </Box>
        </Box>
    );
});

export default PianoRoll;