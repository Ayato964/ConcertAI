import React, { useState } from 'react';
import { Box, Typography } from '@mui/material';
import ChordPalette from './ChordPalette';

const CHORD_AREA_HEIGHT = 50;

const ChordProgression = ({ totalMeasures, pixelsPerMeasure, onChordsChange }) => {
    const [chords, setChords] = useState({}); // { "measure-beat": { root, quality, base } }
    const [paletteOpen, setPaletteOpen] = useState(false);
    const [selectedChordIndex, setSelectedChordIndex] = useState(null); // "measure-beat"

    const handleDoubleClick = (measure, beat) => {
        setSelectedChordIndex(`${measure}-${beat}`);
        setPaletteOpen(true);
    };

    const handlePaletteClose = () => {
        setPaletteOpen(false);
        setSelectedChordIndex(null);
    };

    const handlePaletteSave = (chord) => {
        const newChords = { ...chords, [selectedChordIndex]: chord };
        setChords(newChords);
        if (onChordsChange) {
            onChordsChange(newChords);
        }
    };

    const getChordText = (chord) => {
        if (!chord) return '';
        const quality = chord.quality === 'None' ? '' : chord.quality;
        const base = chord.base === 'None' ? '' : chord.base;
        return `${chord.root}${quality}${base}`;
    }

    return (
        <Box>
            <Box sx={{
                width: `${totalMeasures * pixelsPerMeasure}px`,
                height: `${CHORD_AREA_HEIGHT}px`,
                display: 'flex',
                position: 'relative',
                backgroundColor: 'background.default',
                borderBottom: '1px solid grey',
            }}>
                {Array.from({ length: totalMeasures }).map((_, measureIndex) => (
                    <Box key={measureIndex} sx={{
                        width: `${pixelsPerMeasure}px`,
                        height: '100%',
                        borderRight: '1px solid grey',
                        display: 'flex',
                    }}>
                        {Array.from({ length: 4 }).map((_, beatIndex) => (
                            <Box
                                key={beatIndex}
                                onDoubleClick={() => handleDoubleClick(measureIndex, beatIndex)}
                                sx={{
                                    width: `${pixelsPerMeasure / 4}px`,
                                    height: '100%',
                                    borderRight: beatIndex < 3 ? '1px dotted lightgrey' : 'none',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    backgroundColor: chords[`${measureIndex}-${beatIndex}`] ? 'action.hover' : 'transparent',
                                    '&:hover': {
                                        backgroundColor: 'action.selected'
                                    }
                                }}
                            >
                                <Typography variant="caption">
                                    {getChordText(chords[`${measureIndex}-${beatIndex}`])}
                                </Typography>
                            </Box>
                        ))}
                    </Box>
                ))}
            </Box>
            <ChordPalette
                open={paletteOpen}
                onClose={handlePaletteClose}
                onSave={handlePaletteSave}
                chord={chords[selectedChordIndex]}
            />
        </Box>
    );
};

export default ChordProgression;
