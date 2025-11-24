import React, { useState, useRef, useEffect } from 'react';
import { HelpCircle } from 'lucide-react';

const shortcuts = [
    { key: 'Space', description: 'Play / Pause' },
    { key: 'Shift + Wheel', description: 'Piano Roll Horizontal Scroll' },
    { key: 'Ctrl + Wheel', description: 'Piano Roll Horizontal Zoom' },
    { key: 'Alt + Wheel', description: 'Piano Roll Vertical Zoom' },
];

const ShortcutGuide = () => {
    const [isOpen, setIsOpen] = useState(false);
    const popoverRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (popoverRef.current && !popoverRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    return (
        <div className="relative" ref={popoverRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`p-2 rounded-full transition-colors ${isOpen ? 'bg-surface text-primary' : 'text-muted hover:text-text hover:bg-surface'}`}
                title="Keyboard Shortcuts"
            >
                <HelpCircle className="w-5 h-5" />
            </button>

            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-surface border border-border rounded-xl shadow-xl z-50 animate-in fade-in zoom-in-95 duration-200">
                    <div className="p-4">
                        <h3 className="font-semibold mb-3 text-lg">Keyboard Shortcuts</h3>
                        <div className="space-y-3">
                            {shortcuts.map((shortcut, index) => (
                                <div key={index} className="flex justify-between items-center text-sm">
                                    <span className="font-mono bg-background px-2 py-1 rounded border border-border text-xs text-primary">
                                        {shortcut.key}
                                    </span>
                                    <span className="text-muted">{shortcut.description}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ShortcutGuide;