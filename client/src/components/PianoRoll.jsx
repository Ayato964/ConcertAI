import React from 'react';
import { Box, Typography } from '@mui/material';

const NOTE_HEIGHT = 6;

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
            }}
        />
    );
};

const PianoRoll = ({ midiData, selectedMeasure, setSelectedMeasure }) => {
    const pixelsPerSecond = 80;
    const allNotes = midiData ? midiData.tracks.flatMap(track => track.notes) : [];

    const bpm = midiData?.header.tempos[0]?.bpm || 120;
    const timeSignature = midiData?.header.timeSignatures[0]?.timeSignature || [4, 4];

    const secondsPerMeasure = (60 / bpm) * timeSignature[0];
    const pixelsPerMeasure = secondsPerMeasure * pixelsPerSecond;

    const totalDuration = allNotes.length > 0 ? Math.max(...allNotes.map(n => n.time + n.duration)) : 0;
    const totalMeasures = totalDuration > 0 ? Math.ceil(totalDuration / secondsPerMeasure) : 12;

    const contentWidth = totalMeasures * pixelsPerMeasure;
    const contentHeight = 128 * NOTE_HEIGHT;

    const measureLines = Array.from({ length: totalMeasures }, (_, i) => (i + 1) * pixelsPerMeasure);

    const handleClick = (event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        const x = event.clientX - rect.left + event.currentTarget.scrollLeft;
        const clickedMeasure = Math.floor(x / pixelsPerMeasure);
        const newMeasure = Math.min(clickedMeasure + 1, 12);
        setSelectedMeasure(newMeasure);
    };

    return (
        <Box
            onClick={handleClick}
            sx={{
                my: 2,
                border: '1px solid lightgrey',
                borderRadius: '4px',
                height: '300px',
                overflowX: 'auto',
                position: 'relative',
                backgroundColor: 'background.paper',
                cursor: 'pointer',
            }}
        >
            <Box sx={{
                width: `${contentWidth}px`,
                height: `${contentHeight}px`,
                position: 'relative',
            }}>
                <Box
                    sx={{
                        position: 'absolute',
                        height: '100%',
                        width: `${selectedMeasure * pixelsPerMeasure}px`,
                        backgroundColor: 'rgba(0, 128, 255, 0.2)',
                        zIndex: 1,
                        pointerEvents: 'none',
                    }}
                />
                {measureLines.map((pos, i) => (
                    <Box key={i} sx={{ position: 'absolute', left: `${pos}px`, top: 0, height: '100%', width: '1px', backgroundColor: 'divider', zIndex: 2 }} />
                ))}
                {allNotes.map((note, index) => (
                    <NoteBar key={index} note={note} pixelsPerSecond={pixelsPerSecond} />
                ))}
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