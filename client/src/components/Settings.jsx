import React from 'react';
import { Accordion, AccordionSummary, AccordionDetails, Typography, FormControl, InputLabel, Select, MenuItem, Box, TextField } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ModelSelector from './ModelSelector';

const Settings = ({ instrument, setInstrument, tempo, setTempo, selectedModel, setSelectedModel }) => {

    const handleTempoChange = (e) => {
        const value = e.target.value;
        if (value === '' || (Number.isInteger(Number(value)) && value >= 0)) {
            setTempo(value);
        }
    };

    return (
        <Accordion defaultExpanded sx={{ my: 2 }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>Settings</Typography>
            </AccordionSummary>
            <AccordionDetails>
                <Box>
                    <ModelSelector selectedModel={selectedModel} setSelectedModel={setSelectedModel} />
                    <FormControl fullWidth margin="normal">
                        <InputLabel>Instrument</InputLabel>
                        <Select value={instrument} label="Instrument" onChange={(e) => setInstrument(e.target.value)}>
                            <MenuItem value="piano">Piano</MenuItem>
                            <MenuItem value="saxophone">Saxophone</MenuItem>
                        </Select>
                    </FormControl>
                    <FormControl fullWidth margin="normal">
                        <TextField
                            label="Tempo (BPM)"
                            type="number"
                            value={tempo}
                            onChange={handleTempoChange}
                            inputProps={{ min: 0 }}
                        />
                    </FormControl>
                </Box>
            </AccordionDetails>
        </Accordion>
    );
};

export default Settings;