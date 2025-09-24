import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Select, MenuItem, InputLabel, FormControl, Grid } from '@mui/material';
import { roots, qualities, bases } from '../chordData';

const ChordPalette = ({ open, onClose, onSave, chord }) => {
    const [selectedRoot, setSelectedRoot] = useState('C');
    const [selectedQuality, setSelectedQuality] = useState('None');
    const [selectedBase, setSelectedBase] = useState('None');

    useEffect(() => {
        if (chord) {
            setSelectedRoot(chord.root || 'C');
            setSelectedQuality(chord.quality || 'None');
            setSelectedBase(chord.base || 'None');
        }
    }, [chord]);

    const handleSave = () => {
        onSave({
            root: selectedRoot,
            quality: selectedQuality,
            base: selectedBase
        });
        onClose();
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>Select Chord</DialogTitle>
            <DialogContent>
                <Grid container spacing={2} sx={{ mt: 1 }}>
                    <Grid item xs={4}>
                        <FormControl fullWidth>
                            <InputLabel>Root</InputLabel>
                            <Select value={selectedRoot} onChange={(e) => setSelectedRoot(e.target.value)}>
                                {roots.map(root => (
                                    <MenuItem key={root} value={root}>{root}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={4}>
                        <FormControl fullWidth>
                            <InputLabel>Quality</InputLabel>
                            <Select value={selectedQuality} onChange={(e) => setSelectedQuality(e.target.value)}>
                                {qualities.map(quality => (
                                    <MenuItem key={quality} value={quality}>{quality}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={4}>
                        <FormControl fullWidth>
                            <InputLabel>Base</InputLabel>
                            <Select value={selectedBase} onChange={(e) => setSelectedBase(e.target.value)}>
                                {bases.map(base => (
                                    <MenuItem key={base} value={base}>{base}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>
                </Grid>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button onClick={handleSave}>Save</Button>
            </DialogActions>
        </Dialog>
    );
};

export default ChordPalette;
