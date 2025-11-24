import React from 'react';
import { Midi } from '@tonejs/midi';
import { Upload, Music } from 'lucide-react';

const MidiInput = ({ onMidiUpload }) => {
    const handleFileChange = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const arrayBuffer = await file.arrayBuffer();
        const midi = new Midi(arrayBuffer);

        onMidiUpload(midi);
    };

    return (
        <div className="p-6 border-2 border-dashed border-border rounded-xl bg-surface/30 hover:bg-surface/50 transition-colors group">
            <div className="flex flex-col items-center justify-center gap-4 text-center">
                <div className="p-3 bg-primary/10 rounded-full group-hover:scale-110 transition-transform duration-300">
                    <Upload className="w-6 h-6 text-primary" />
                </div>
                <div>
                    <h3 className="text-lg font-semibold mb-1">Upload MIDI File</h3>
                    <p className="text-sm text-muted">Drag and drop or click to browse</p>
                </div>

                <div className="flex items-center gap-3 w-full max-w-xs">
                    <label className="flex-1">
                        <input type="file" hidden accept=".mid,.midi" onChange={handleFileChange} />
                        <div className="btn-primary w-full cursor-pointer flex items-center justify-center gap-2">
                            <Music className="w-4 h-4" />
                            <span>Select File</span>
                        </div>
                    </label>
                    <span className="text-sm text-muted font-medium">OR</span>
                    <button className="btn-secondary flex-1">
                        Sample
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MidiInput;