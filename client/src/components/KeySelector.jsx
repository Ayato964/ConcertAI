import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const roots = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const scales = ['M', 'm'];

const KeySelector = ({ open, onClose, onSave, currentKey }) => {
    const [selectedRoot, setSelectedRoot] = useState('C');
    const [selectedScale, setSelectedScale] = useState('M');

    useEffect(() => {
        if (open && currentKey) {
            const [root, scale] = currentKey.split(' ');
            if (roots.includes(root)) setSelectedRoot(root);
            if (scales.includes(scale)) setSelectedScale(scale);
        }
    }, [open, currentKey]);

    const handleSave = () => {
        onSave(`${selectedRoot} ${selectedScale}`);
        onClose();
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
            <div className="relative w-full max-w-md bg-background border border-border rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">
                <div className="p-4 border-b border-border flex items-center justify-between bg-surface/30">
                    <h2 className="text-xl font-bold">Select Key</h2>
                    <button onClick={onClose} className="p-2 hover:bg-surface rounded-full transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6">
                    <div className="mb-6 p-4 bg-surface border border-border rounded-lg text-center">
                        <div className="text-4xl font-bold text-primary">
                            {selectedRoot} {selectedScale}
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <h3 className="text-sm font-medium text-muted uppercase tracking-wider mb-3 text-center">Root</h3>
                            <ToggleGroup items={roots} selected={selectedRoot} onChange={setSelectedRoot} />
                        </div>

                        <div>
                            <h3 className="text-sm font-medium text-muted uppercase tracking-wider mb-3 text-center">Scale</h3>
                            <ToggleGroup items={scales} selected={selectedScale} onChange={setSelectedScale} />
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
                        Save Key
                    </button>
                </div>
            </div>
        </div>
    );
};

export default KeySelector;
