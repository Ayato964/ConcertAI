import React, { useState, useEffect } from 'react';
import { roots, qualities, bases } from '../chordData';
import { X } from 'lucide-react';

const ChordPalette = ({ open, onClose, onSave, chord }) => {
    const [selectedRoot, setSelectedRoot] = useState('C');
    const [selectedQuality, setSelectedQuality] = useState('None');
    const [selectedBase, setSelectedBase] = useState('None');

    useEffect(() => {
        if (open) { // Reset state when dialog opens
            setSelectedRoot(chord?.root || 'C');
            setSelectedQuality(chord?.quality || 'None');
            setSelectedBase(chord?.base || 'None');
        }
    }, [open, chord]);

    const handleSave = () => {
        onSave({
            root: selectedRoot,
            quality: selectedQuality,
            base: selectedBase
        });
        onClose();
    };

    const getChordText = () => {
        const quality = selectedQuality === 'None' ? '' : selectedQuality;
        const base = selectedBase === 'None' ? '' : selectedBase;
        return `${selectedRoot}${quality}${base}`;
    };

    if (!open) return null;

    const ToggleGroup = ({ items, selected, onChange }) => (
        <div className="flex flex-wrap justify-center gap-2 mb-4">
            {items.map(item => (
                <button
                    key={item}
                    onClick={() => onChange(item)}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${selected === item
                            ? 'bg-primary text-white shadow-lg shadow-primary/25'
                            : 'bg-surface border border-border text-text hover:bg-surface/80 hover:border-primary/50'
                        }`}
                >
                    {item}
                </button>
            ))}
        </div>
    );

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
                onClick={onClose}
            />
            <div className="relative w-full max-w-2xl bg-background border border-border rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
                <div className="p-4 border-b border-border flex items-center justify-between bg-surface/30">
                    <h2 className="text-xl font-bold">Select Chord</h2>
                    <button onClick={onClose} className="p-2 hover:bg-surface rounded-full transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto">
                    <div className="mb-6 p-4 bg-surface border border-border rounded-lg text-center">
                        <div className="text-4xl font-bold text-primary">
                            {getChordText()}
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <h3 className="text-sm font-medium text-muted uppercase tracking-wider mb-3 text-center">Roots</h3>
                            <ToggleGroup items={roots} selected={selectedRoot} onChange={setSelectedRoot} />
                        </div>

                        <div>
                            <h3 className="text-sm font-medium text-muted uppercase tracking-wider mb-3 text-center">Qualities</h3>
                            <ToggleGroup items={qualities} selected={selectedQuality} onChange={setSelectedQuality} />
                        </div>

                        <div>
                            <h3 className="text-sm font-medium text-muted uppercase tracking-wider mb-3 text-center">Bases</h3>
                            <ToggleGroup items={bases} selected={selectedBase} onChange={setSelectedBase} />
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t border-border bg-surface/30 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="btn-secondary"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="btn-primary"
                    >
                        Save Chord
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ChordPalette;