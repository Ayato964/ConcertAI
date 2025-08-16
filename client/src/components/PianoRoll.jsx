import React, { useRef, useEffect } from 'react';
import { Box, Typography } from '@mui/material';

const NOTE_HEIGHT = 20; // Increased note height
const MEASURE_HEADER_HEIGHT = 30;

const NoteBar = ({ note, pixelsPerSecond }) => {
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

const PianoRoll = ({ midiData, progress, duration, generationLength, setGenerationLength, onSeek }) => {
    const pixelsPerSecond = 80;
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
    }, [midiData]);

    const handleContainerClick = (e) => {
        if (e.shiftKey) {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const time = x / pixelsPerSecond;
            if (onSeek) {
                onSeek(time);
            }
        }
    };

    const handleMeasureClick = (measureIndex) => {
        setGenerationLength(measureIndex + 1);
    };

    return (
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
                        color: 'text.secondary'
                    }}>
                        {i + 1}
                    </Box>
                ))}
            </Box>

            <Box 
                onClick={handleContainerClick}
                sx={{
                    width: `${contentWidth}px`,
                    height: `${contentHeight}px`,
                    position: 'relative',
                    cursor: 'pointer'
            }}>
                {Array.from({ length: totalMeasures }).map((_, i) => (
                    <Box
                        key={i}
                        onClick={(e) => {
                            e.stopPropagation(); // Prevent container click when clicking measure
                            handleMeasureClick(i)
                        }}
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
                {allNotes.map((note, index) => (
                    <NoteBar key={index} note={note} pixelsPerSecond={pixelsPerSecond} />
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
    );
};

export default PianoRoll;