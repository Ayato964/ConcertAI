import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Typography, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { roots, qualities, bases } from '../chordData';

const ChordPalette = ({ open, onClose, onSave, chord }) => {
    const [selectedRoot, setSelectedRoot] = useState('C');
    const [selectedQuality, setSelectedQuality] = useState('None');
    const [selectedBase, setSelectedBase] = useState('None');

    useEffect(() => {
        if (open) { // Reset state when dialog opens
            setSelectedRoot(chord?.root || 'C');
            setSelectedQuality(chord?.quality || 'None');
            setSelectedBase(chord?.base || 'None');
        }
    }, [open, chord]);

    const handleSave = () => {
        onSave({
            root: selectedRoot,
            quality: selectedQuality,
            base: selectedBase
        });
        onClose();
    };

    const getChordText = () => {
        const quality = selectedQuality === 'None' ? '' : selectedQuality;
        const base = selectedBase === 'None' ? '' : selectedBase;
        return `${selectedRoot}${quality}${base}`;
    };

    const handleRootChange = (event, newRoot) => {
        if (newRoot !== null) {
            setSelectedRoot(newRoot);
        }
    };

    const handleQualityChange = (event, newQuality) => {
        if (newQuality !== null) {
            setSelectedQuality(newQuality);
        }
    };

    const handleBaseChange = (event, newBase) => {
        if (newBase !== null) {
            setSelectedBase(newBase);
        }
    };

    const renderToggleButtons = (items, selectedValue, onChange) => (
        <ToggleButtonGroup
            value={selectedValue}
            exclusive
            onChange={onChange}
            sx={{ flexWrap: 'wrap', justifyContent: 'center', gap: 1, mb: 2 }}
        >
            {items.map(item => (
                <ToggleButton key={item} value={item} sx={{ textTransform: 'none' }}>
                    {item}
                </ToggleButton>
            ))}
        </ToggleButtonGroup>
    );

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle sx={{ textAlign: 'center' }}>Select Chord</DialogTitle>
            <DialogContent>
                <Box sx={{ my: 2, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1, textAlign: 'center' }}>
                    <Typography variant="h4">
                        {getChordText()}
                    </Typography>
                </Box>

                <Typography variant="h6" sx={{ mt: 2 }}>Roots</Typography>
                {renderToggleButtons(roots, selectedRoot, handleRootChange)}

                <Typography variant="h6" sx={{ mt: 2 }}>Qualities</Typography>
                {renderToggleButtons(qualities, selectedQuality, handleQualityChange)}

                <Typography variant="h6" sx={{ mt: 2 }}>Bases</Typography>
                {renderToggleButtons(bases, selectedBase, handleBaseChange)}

            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button onClick={handleSave}>Save</Button>
            </DialogActions>
        </Dialog>
    );
};

export default ChordPalette;