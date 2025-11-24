import React, { useState, useEffect, useMemo } from 'react';
import { ChevronRight, X } from 'lucide-react';

const ModelSelector = ({ selectedModel, setSelectedModel, modelInfo, debugMode }) => {
    const [drawerOpen, setDrawerOpen] = useState(false);

    const models = useMemo(() => modelInfo ? Object.values(modelInfo) : [], [modelInfo]);

    useEffect(() => {
        if (models.length > 0 && !selectedModel) {
            setSelectedModel(models[0].model_name);
        }
    }, [models, setSelectedModel]);

    const handleModelSelect = (modelName) => {
        setSelectedModel(modelName);
        setDrawerOpen(false);
    };

    const selectedModelObject = useMemo(() =>
        models.find(m => m.model_name === selectedModel)
        , [models, selectedModel]);

    return (
        <div className="w-full">
            {debugMode && (
                <div className="border border-dashed border-red-500 p-2 mb-2 text-xs font-mono whitespace-pre-wrap break-all">
                    <div className="font-bold">DEBUG INFO</div>
                    {`modelInfo prop: ${JSON.stringify(modelInfo)}\n`}
                    {`models array (internal): ${JSON.stringify(models.map(m => m.model_name))}\n`}
                    {`selectedModel prop: ${selectedModel}\n`}
                    {`selectedModelObject (internal): ${selectedModelObject ? selectedModelObject.model_name : 'undefined'}`}
                </div>
            )}

            {selectedModelObject ? (
                <div>
                    <div className="text-xs font-medium text-muted uppercase tracking-wider mb-1.5">Model</div>
                    <button
                        onClick={() => setDrawerOpen(true)}
                        className="w-full p-4 text-left bg-surface border border-border rounded-lg hover:bg-surface/80 transition-colors group relative"
                    >
                        <div className="font-bold text-lg group-hover:text-primary transition-colors">
                            {selectedModelObject.model_name}
                        </div>
                        <div className="text-sm text-muted mt-1">
                            {selectedModelObject.description}
                        </div>
                        <div className="text-xs text-muted mt-2 pt-2 border-t border-border/50">
                            Instruments: {selectedModelObject?.tag?.instrument}
                        </div>
                        <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted group-hover:text-primary transition-colors" />
                    </button>
                </div>
            ) : (
                <div className="text-muted animate-pulse">Loading models...</div>
            )}

            {/* Drawer Overlay */}
            {drawerOpen && (
                <div className="fixed inset-0 z-[100] flex justify-end">
                    <div
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
                        onClick={() => setDrawerOpen(false)}
                    />
                    <div className="relative w-full max-w-md bg-background border-l border-border shadow-2xl h-full overflow-y-auto animate-in slide-in-from-right duration-300">
                        <div className="sticky top-0 bg-background/95 backdrop-blur border-b border-border p-4 flex items-center justify-between z-10">
                            <h2 className="text-xl font-bold">Select a Model</h2>
                            <button
                                onClick={() => setDrawerOpen(false)}
                                className="p-2 hover:bg-surface rounded-full transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-4 space-y-3">
                            {models.map((model) => (
                                <button
                                    key={model.model_name}
                                    onClick={() => handleModelSelect(model.model_name)}
                                    className={`w-full p-4 text-left border rounded-lg transition-all duration-200 ${selectedModel === model.model_name
                                            ? 'bg-primary/10 border-primary ring-1 ring-primary'
                                            : 'bg-surface border-border hover:border-primary/50 hover:bg-surface/80'
                                        }`}
                                >
                                    <div className={`font-bold ${selectedModel === model.model_name ? 'text-primary' : 'text-text'}`}>
                                        {model.model_name}
                                    </div>
                                    <div className="text-sm text-muted mt-1">
                                        {model.description}
                                    </div>
                                    <div className="text-xs text-muted mt-2">
                                        Instruments: {model?.tag?.instrument}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ModelSelector;
