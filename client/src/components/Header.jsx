import React from 'react';
import { Music } from 'lucide-react';
import ShortcutGuide from './ShortcutGuide';

const Header = () => {
    return (
        <header className="glass-header mb-8">
            <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <Music className="w-6 h-6 text-primary" />
                    </div>
                    <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                        ConcertAI HUB <span className="text-sm font-medium text-muted ml-2">ver.2.6</span>
                    </h1>
                </div>

                <div className="flex items-center gap-4">
                    <ShortcutGuide />
                </div>
            </div>
        </header>
    );
};

export default Header;