import React from 'react';
import { Midi } from '@tonejs/midi';
import { Upload, Music } from 'lucide-react';

const MidiInput = ({ onMidiUpload }) => {
    const processFile = async (file) => {
        if (!file) return;
        try {
            const arrayBuffer = await file.arrayBuffer();
            const midi = new Midi(arrayBuffer);
            onMidiUpload(midi);
        } catch (error) {
            console.error("Error parsing MIDI:", error);
            // You might want to pass an error callback or handle it
        }
    };

    const handleFileChange = (event) => {
        processFile(event.target.files[0]);
    };

    const handleDrop = (event) => {
        event.preventDefault();
        event.stopPropagation();
        const file = event.dataTransfer.files[0];
        if (file && (file.name.endsWith('.mid') || file.name.endsWith('.midi'))) {
            processFile(file);
        }
    };

    const handleDragOver = (event) => {
        event.preventDefault();
        event.stopPropagation();
    };

    return (
        <div
            className="p-10 border-2 border-dashed border-border rounded-xl bg-surface/30 hover:bg-surface/50 transition-colors group cursor-pointer h-full flex flex-col items-center justify-center"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
        >
            <div className="flex flex-col items-center justify-center gap-6 text-center max-w-md">
                <div className="p-4 bg-primary/10 rounded-full group-hover:scale-110 transition-transform duration-300">
                    <Upload className="w-10 h-10 text-primary" />
                </div>
                <div>
                    <h3 className="text-2xl font-semibold mb-2">Upload MIDI File</h3>
                    <p className="text-base text-muted">Drag and drop or click to browse</p>
                </div>

                <div className="flex items-center gap-4 w-full">
                    <label className="flex-1">
                        <input type="file" hidden accept=".mid,.midi" onChange={handleFileChange} />
                        <div className="btn-primary w-full cursor-pointer flex items-center justify-center gap-2 py-3">
                            <Music className="w-5 h-5" />
                            <span>Select File</span>
                        </div>
                    </label>
                    <span className="text-sm text-muted font-medium">OR</span>
                    <button className="btn-secondary flex-1 py-3">
                        Sample
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MidiInput;