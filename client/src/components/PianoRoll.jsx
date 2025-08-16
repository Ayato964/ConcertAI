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

const PianoRoll = ({ midiData, progress, duration }) => {
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

    const measureLines = Array.from({ length: totalMeasures }, (_, i) => (i + 1) * pixelsPerMeasure);

    const playbackIndicatorPosition = progress * totalDuration * pixelsPerSecond;

    return (
        <Box
            sx={{
                my: 2,
                border: '1px solid lightgrey',
                borderRadius: '4px',
                height: '300px',
                overflowX: 'auto',
                position: 'relative',
                backgroundColor: 'background.paper',
            }}
        >
            <Box sx={{
                width: `${contentWidth}px`,
                height: `${contentHeight}px`,
                position: 'relative',
            }}>
                {measureLines.map((pos, i) => (
                    <Box key={i} sx={{ position: 'absolute', left: `${pos}px`, top: 0, height: '100%', width: '1px', backgroundColor: 'divider', zIndex: 2 }} />
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