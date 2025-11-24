import React from 'react';
import { Play, Pause, Square, Loader2, ChevronDown } from 'lucide-react';

const Controls = ({
    onPlay,
    onPause,
    onStop,
    onGenerate,
    isGenerating,
    playbackState,
    progress,
    duration,
    generatedMidis,
    selectedGeneratedMidi,
    onSelectedGeneratedMidiChange
}) => {
    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2 bg-surface border border-border rounded-lg p-1">
                    <button
                        onClick={onPlay}
                        disabled={playbackState === 'playing'}
                        className={`p-2 rounded-md transition-colors ${playbackState === 'playing' ? 'text-primary bg-primary/10' : 'text-text hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed'}`}
                        title="Play"
                    >
                        <Play className="w-5 h-5 fill-current" />
                    </button>
                    <button
                        onClick={onPause}
                        disabled={playbackState !== 'playing'}
                        className={`p-2 rounded-md transition-colors ${playbackState === 'paused' ? 'text-primary bg-primary/10' : 'text-text hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed'}`}
                        title="Pause"
                    >
                        <Pause className="w-5 h-5 fill-current" />
                    </button>
                    <button
                        onClick={onStop}
                        disabled={playbackState === 'stopped'}
                        className="p-2 rounded-md transition-colors text-text hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Stop"
                    >
                        <Square className="w-5 h-5 fill-current" />
                    </button>
                </div>

                <button
                    onClick={onGenerate}
                    disabled={isGenerating}
                    className="btn-primary flex items-center gap-2 min-w-[120px] justify-center"
                >
                    {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Generate'}
                </button>

                {generatedMidis.length > 1 && (
                    <div className="relative min-w-[160px]">
                        <select
                            value={selectedGeneratedMidi}
                            onChange={(e) => onSelectedGeneratedMidiChange(Number(e.target.value))}
                            className="input-field appearance-none cursor-pointer"
                        >
                            {generatedMidis.map((_, index) => (
                                <option key={index} value={index}>Variation {index + 1}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
                    </div>
                )}
            </div>

            <div className="space-y-2">
                <div className="flex justify-between text-xs text-muted font-medium uppercase tracking-wider">
                    <span>Playback Progress</span>
                    <span>{Math.floor(progress * 100)}%</span>
                </div>
                <div className="relative h-2 bg-surface border border-border rounded-full overflow-hidden">
                    <div
                        className="absolute top-0 left-0 h-full bg-primary transition-all duration-100 ease-linear"
                        style={{ width: `${progress * 100}%` }}
                    />
                </div>
            </div>
        </div>
    );
};

export default Controls;
