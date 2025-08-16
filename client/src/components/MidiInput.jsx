import React from 'react';
import { Button, Box, Typography } from '@mui/material';
import { Midi } from '@tonejs/midi';

const MidiInput = ({ onMidiUpload }) => {
    const handleFileChange = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const arrayBuffer = await file.arrayBuffer();
        const midi = new Midi(arrayBuffer);

        onMidiUpload(midi);
    };

    return (
        <Box sx={{ my: 2, p: 2, border: '1px dashed grey', borderRadius: '4px' }}>
            <Typography variant="subtitle1" gutterBottom>Input MIDI</Typography>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <Button variant="contained" component="label">
                    Upload File
                    <input type="file" hidden accept=".mid,.midi" onChange={handleFileChange} />
                </Button>
                <Typography>or</Typography>
                <Button variant="outlined">Select Sample</Button>
            </Box>
        </Box>
    );
};

export default MidiInput;