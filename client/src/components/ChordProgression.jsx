import React, { useState } from 'react';
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
        <div>
            <div
                className="flex relative bg-background border-b border-border"
                style={{
                    width: `${totalMeasures * pixelsPerMeasure}px`,
                    height: `${CHORD_AREA_HEIGHT}px`,
                }}
            >
                {Array.from({ length: totalMeasures }).map((_, measureIndex) => (
                    <div
                        key={measureIndex}
                        className="h-full border-r border-border flex"
                        style={{ width: `${pixelsPerMeasure}px` }}
                    >
                        {Array.from({ length: 4 }).map((_, beatIndex) => (
                            <div
                                key={beatIndex}
                                onDoubleClick={() => handleDoubleClick(measureIndex, beatIndex)}
                                className={`
                                    h-full flex items-center justify-center cursor-pointer transition-colors
                                    ${beatIndex < 3 ? 'border-r border-border/30 border-dashed' : ''}
                                    ${chords[`${measureIndex}-${beatIndex}`] ? 'bg-primary/20 hover:bg-primary/30' : 'hover:bg-surface'}
                                `}
                                style={{ width: `${pixelsPerMeasure / 4}px` }}
                            >
                                <span className="text-xs font-medium text-text select-none">
                                    {getChordText(chords[`${measureIndex}-${beatIndex}`])}
                                </span>
                            </div>
                        ))}
                    </div>
                ))}
            </div>
            <ChordPalette
                open={paletteOpen}
                onClose={handlePaletteClose}
                onSave={handlePaletteSave}
                chord={chords[selectedChordIndex]}
            />
        </div>
    );
};

export default ChordProgression;
