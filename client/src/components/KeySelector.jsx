import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const roots = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const scales = ['M', 'm'];

const ToggleGroup = ({ items, selected, onChange, disabled }) => (
    <div className={`flex flex-wrap justify-center gap-2 mb-4 transition-opacity duration-200 ${disabled ? 'opacity-40 pointer-events-none' : ''}`}>
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

const KeySelector = ({ open, onClose, onSave, currentKey }) => {
    const [selectedRoot, setSelectedRoot] = useState('C');
    const [selectedScale, setSelectedScale] = useState('M');
    const [isAuto, setIsAuto] = useState(false);

    useEffect(() => {
        if (open && currentKey) {
            if (currentKey === 'Auto') {
                setIsAuto(true);
            } else {
                setIsAuto(false);
                const [root, scale] = currentKey.split(' ');
                if (roots.includes(root)) setSelectedRoot(root);
                if (scales.includes(scale)) setSelectedScale(scale);
            }
        }
    }, [open, currentKey]);

    const handleSave = () => {
        if (isAuto) {
            onSave('Auto');
        } else {
            onSave(`${selectedRoot} ${selectedScale}`);
        }
        onClose();
    };

    const handleRootChange = (root) => {
        setSelectedRoot(root);
        setIsAuto(false);
    };

    const handleScaleChange = (scale) => {
        setSelectedScale(scale);
        setIsAuto(false);
    };

    if (!open) return null;

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
                    <div className="mb-4 p-4 bg-surface border border-border rounded-lg text-center">
                        <div className="text-4xl font-bold text-primary">
                            {isAuto ? 'Auto (AI Decides)' : `${selectedRoot} ${selectedScale}`}
                        </div>
                    </div>

                    <button
                        onClick={() => setIsAuto(!isAuto)}
                        className={`w-full mb-6 py-2.5 rounded-lg text-sm font-semibold border transition-all duration-200 ${
                            isAuto
                                ? 'bg-primary text-white border-primary shadow-lg shadow-primary/25'
                                : 'bg-surface border-border text-muted hover:text-text hover:border-primary/50'
                        }`}
                    >
                        Auto / Unspecified (Let AI Decide)
                    </button>

                    <div className="space-y-6">
                        <div>
                            <h3 className="text-sm font-medium text-muted uppercase tracking-wider mb-3 text-center">Root</h3>
                            <ToggleGroup items={roots} selected={selectedRoot} onChange={handleRootChange} disabled={isAuto} />
                        </div>

                        <div>
                            <h3 className="text-sm font-medium text-muted uppercase tracking-wider mb-3 text-center">Scale</h3>
                            <ToggleGroup items={scales} selected={selectedScale} onChange={handleScaleChange} disabled={isAuto} />
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
