import React from 'react';
import { Accordion, AccordionSummary, AccordionDetails, Typography, Slider, FormControl, InputLabel, Select, MenuItem, Box } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

const AdvancedSettings = ({ instrument, setInstrument }) => {
    return (
        <Accordion sx={{ my: 2 }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>Advanced Settings</Typography>
            </AccordionSummary>
            <AccordionDetails>
                <Box>
                    <FormControl fullWidth margin="normal">
                        <InputLabel>Instrument</InputLabel>
                        <Select value={instrument} label="Instrument" onChange={(e) => setInstrument(e.target.value)}>
                            <MenuItem value="piano">Piano</MenuItem>
                            <MenuItem value="saxophone">Saxophone</MenuItem>
                        </Select>
                    </FormControl>
                    <Typography gutterBottom>Temperature</Typography>
                    <Slider defaultValue={1.0} step={0.02} marks min={0.1} max={1.5} valueLabelDisplay="auto" />
                    <Typography gutterBottom>Number of Generations</Typography>
                    <FormControl fullWidth size="small">
                        <InputLabel>Count</InputLabel>
                        <Select defaultValue={3} label="Count">
                            <MenuItem value={1}>1</MenuItem>
                            <MenuItem value={2}>2</MenuItem>
                            <MenuItem value={3}>3</MenuItem>
                            <MenuItem value={4}>4</MenuItem>
                        </Select>
                    </FormControl>
                </Box>
            </AccordionDetails>
        </Accordion>
    );
};

export default AdvancedSettings;