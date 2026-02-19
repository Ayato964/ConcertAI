import React from 'react';
import { Check } from 'lucide-react';

const ModelGridSelector = ({ models, onSelect, title, selectedModelId }) => {
    return (
        <div className="flex flex-col h-full bg-background p-6 overflow-y-auto animate-in fade-in duration-300">
            <div className="max-w-5xl mx-auto w-full space-y-8">
                <div className="text-center space-y-2">
                    <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
                        {title}
                    </h2>
                    <p className="text-muted">Select a model to use for comparison.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {models.map((model) => {
                        const isSelected = selectedModelId === model.model_name;
                        return (
                            <button
                                key={model.model_name}
                                onClick={() => onSelect(model)}
                                className={`
                  relative flex flex-col items-start text-left p-6 rounded-xl border transition-all duration-200 h-full
                  ${isSelected
                                        ? 'bg-primary/10 border-primary shadow-lg shadow-primary/10 ring-1 ring-primary scale-[1.02]'
                                        : 'bg-surface border-border hover:border-primary/50 hover:bg-surface/80 hover:scale-[1.01] group'}
                `}
                            >
                                {isSelected && (
                                    <div className="absolute top-4 right-4 text-primary bg-background rounded-full p-1 shadow-sm">
                                        <Check className="w-5 h-5" />
                                    </div>
                                )}

                                <h3 className={`font-semibold text-xl mb-2 group-hover:text-primary transition-colors ${isSelected ? 'text-primary' : 'text-text'}`}>
                                    {model.title || model.model_name}
                                </h3>

                                <div className="flex flex-wrap gap-2 mb-4">
                                    <span className="px-2.5 py-1 rounded-full bg-background border border-border text-xs text-muted font-medium uppercase tracking-wide">
                                        {model.tag?.model}
                                    </span>
                                    {model.tag?.genres?.map(g => (
                                        <span key={g} className="px-2.5 py-1 rounded-full bg-secondary/20 text-secondary text-xs font-medium">
                                            {g}
                                        </span>
                                    ))}
                                </div>

                                <p className="text-sm text-muted-foreground line-clamp-4 leading-relaxed">
                                    {model.description}
                                </p>

                                <div className="mt-auto pt-4 w-full text-xs text-muted/70 border-t border-border/30">
                                    Instruments: {Array.isArray(model?.tag?.instruments) ? model.tag.instruments.join(', ') : model?.tag?.instruments}
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default ModelGridSelector;
